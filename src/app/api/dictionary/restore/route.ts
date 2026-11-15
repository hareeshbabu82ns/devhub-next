/**
 * Restore dictionaries from a file made by /api/dictionary/export.
 *
 *   POST /api/dictionary/restore?mode=replace|merge[&only=MW,AP90]   (body: the file)
 *
 * Originals backup (format=originals):
 *   replace  the dictionary's originals become exactly the file's rows
 *   merge    rows in the file are added or updated; others are kept
 *   Search entries are not touched: rebuild them afterwards.
 *
 * Entries backup (format=backup):
 *   replace  each dictionary in the file replaces the one in the database;
 *            the current entries stay until the whole file has loaded
 *   merge    only entries whose wordIndex is not there yet are added
 *
 * Gzipped and plain files are both accepted. Streamed: excluded from the
 * proxy matcher, so it checks the session itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createGunzip } from "zlib";
import { createInterface } from "readline";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  BACKUP_TYPE,
  EntryInput,
  WriteMode,
  validateBackupEntry,
  writeBackupEntries,
} from "@/lib/dictionary/dictionary-backup";
import {
  ORIGINALS_TYPE,
  ORIGIN_PATTERN,
  RawWriteInput,
  discardStaging,
  finishBuild,
  finishCapture,
  validateOriginalLine,
  writeRawRows,
} from "@/lib/dictionary/dictionary-pipeline";

export const runtime = "nodejs";

const FLUSH_AT = 1000;
const MAX_INVALID = 1000;

type Kind = "originals" | "entries";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only administrators can restore dictionaries" },
      { status: 403 },
    );
  }
  if (!request.body) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }
  const mode: WriteMode = request.nextUrl.searchParams.get("mode") === "merge" ? "merge" : "replace";
  const only = new Set(
    (request.nextUrl.searchParams.get("only") || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  );

  // Peek at the first bytes to tell gzip from plain text
  const reader = request.body.getReader();
  const first = await reader.read();
  const firstChunk = first.value ?? new Uint8Array();
  const gzipped = firstChunk[0] === 0x1f && firstChunk[1] === 0x8b;
  const replay = new ReadableStream<Uint8Array>({
    start(c) {
      if (firstChunk.length) c.enqueue(firstChunk);
      if (first.done) c.close();
    },
    async pull(c) {
      const { value, done } = await reader.read();
      if (done) c.close();
      else c.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  let input: NodeJS.ReadableStream = Readable.fromWeb(
    replay as import("stream/web").ReadableStream,
  );
  if (gzipped) input = input.pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });

  let kind: Kind | null = null;
  const touched = new Set<string>();
  const runIds = new Map<string, string>();
  const pendingEntries = new Map<string, EntryInput[]>();
  const pendingRaw = new Map<string, RawWriteInput[]>();
  const totals = new Map<string, { written: number; skipped: number }>();
  const errors: string[] = [];
  let invalid = 0;
  let ignored = 0;
  const ignoredOrigins = new Set<string>();
  let lineNo = 0;

  const tally = (origin: string, written: number, skipped: number) => {
    const t = totals.get(origin) ?? { written: 0, skipped: 0 };
    t.written += written;
    t.skipped += skipped;
    totals.set(origin, t);
  };

  const flush = async (origin: string) => {
    if (kind === "entries") {
      const batch = pendingEntries.get(origin);
      if (!batch?.length) return;
      pendingEntries.set(origin, []);
      const r = await writeBackupEntries(origin, batch, mode);
      tally(origin, r.written, r.skipped);
    } else {
      const batch = pendingRaw.get(origin);
      if (!batch?.length) return;
      pendingRaw.set(origin, []);
      const r = await writeRawRows(origin, batch, runIds.get(origin)!);
      tally(origin, r.added + r.changed, r.unchanged);
    }
  };

  const reject = (problem: string) => {
    invalid++;
    if (errors.length < 20) errors.push(`Line ${lineNo}: ${problem}`);
    if (invalid > MAX_INVALID) throw new Error("Too many invalid lines");
  };

  const wanted = (origin: string) => {
    if (only.size > 0 && !only.has(origin)) {
      ignored++;
      ignoredOrigins.add(origin);
      return false;
    }
    return true;
  };

  const touch = async (origin: string) => {
    if (touched.has(origin)) return;
    touched.add(origin);
    if (kind === "entries" && mode === "replace") await discardStaging(origin);
    if (kind === "originals") runIds.set(origin, randomUUID());
  };

  try {
    for await (const raw of lines) {
      lineNo++;
      const text = raw.trim();
      if (!text) continue;
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        if (!kind) throw new Error("This is not a dictionary backup file");
        reject("not valid JSON");
        continue;
      }
      if (!kind) {
        if (parsed?.type === BACKUP_TYPE) kind = "entries";
        else if (parsed?.type === ORIGINALS_TYPE) kind = "originals";
        else throw new Error("This is not a dictionary backup file (missing header)");
        continue;
      }

      if (kind === "originals") {
        if (parsed?.source && typeof parsed.source === "object") {
          const s = parsed.source;
          if (typeof s.origin !== "string" || !ORIGIN_PATTERN.test(s.origin)) {
            reject("bad source");
            continue;
          }
          if (!wanted(s.origin)) continue;
          await touch(s.origin);
          const data = {
            sourceFile: typeof s.sourceFile === "string" ? s.sourceFile : null,
            sourceTable: typeof s.sourceTable === "string" ? s.sourceTable : null,
            columns: Array.isArray(s.columns) ? s.columns.map(String) : [],
            keyColumn: typeof s.keyColumn === "string" ? s.keyColumn : null,
            extras: (s.extras ?? undefined) as Prisma.InputJsonValue | undefined,
          };
          await db.dictionarySource.upsert({
            where: { origin: s.origin },
            create: { origin: s.origin, ...data },
            update: data,
          });
          continue;
        }
        const problem = validateOriginalLine(parsed);
        if (problem) {
          reject(problem);
          continue;
        }
        if (!wanted(parsed.origin)) continue;
        await touch(parsed.origin);
        const list = pendingRaw.get(parsed.origin) ?? [];
        list.push({
          key: parsed.key,
          seq: parsed.seq,
          rowid: Number.isInteger(parsed.rowid) ? parsed.rowid : null,
          headword: typeof parsed.headword === "string" ? parsed.headword : "",
          row: parsed.row,
        });
        pendingRaw.set(parsed.origin, list);
        if (list.length >= FLUSH_AT) await flush(parsed.origin);
      } else {
        const problem = validateBackupEntry(parsed);
        if (problem) {
          reject(problem);
          continue;
        }
        if (!wanted(parsed.origin)) continue;
        await touch(parsed.origin);
        const list = pendingEntries.get(parsed.origin) ?? [];
        list.push(parsed as EntryInput);
        pendingEntries.set(parsed.origin, list);
        if (list.length >= FLUSH_AT) await flush(parsed.origin);
      }
    }

    if (!kind) throw new Error("The file is empty");
    if (touched.size === 0 && only.size > 0) {
      throw new Error(
        `The backup has nothing for ${[...only].join(", ")}` +
          (ignoredOrigins.size ? ` (it holds ${[...ignoredOrigins].join(", ")})` : ""),
      );
    }
    for (const origin of touched) await flush(origin);

    for (const origin of touched) {
      if (kind === "originals") {
        await finishCapture(origin, runIds.get(origin)!, {
          complete: mode === "replace",
          signature: null,
        });
      } else if (mode === "replace" && (totals.get(origin)?.written ?? 0) > 0) {
        await finishBuild(origin, { keepEdits: false, markBuilt: false });
      }
    }
    revalidatePath("/dictionary");
    return NextResponse.json({
      success: true,
      kind,
      mode,
      dictionaries: [...touched].map((origin) => ({
        origin,
        ...(totals.get(origin) ?? { written: 0, skipped: 0 }),
      })),
      invalid,
      ignored,
      ignoredOrigins: [...ignoredOrigins],
      errors,
    });
  } catch (e) {
    // Leave the live dictionaries as they were
    if (kind === "entries" && mode === "replace") {
      for (const origin of touched) await discardStaging(origin).catch(() => {});
    }
    console.error("Dictionary restore failed:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Restore failed",
        partial:
          kind === "originals" || mode === "merge"
            ? [...totals].map(([origin, t]) => ({ origin, ...t }))
            : undefined,
      },
      { status: 400 },
    );
  }
}
