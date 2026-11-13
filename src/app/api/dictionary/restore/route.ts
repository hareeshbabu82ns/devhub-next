/**
 * Restore dictionaries from a backup made by /api/dictionary/export.
 *
 *   POST /api/dictionary/restore?mode=replace|merge   (body: the backup file)
 *
 * replace  each dictionary in the file replaces the one in the database;
 *          the old entries stay until the whole file has loaded
 * merge    only entries whose wordIndex is not there yet are added
 *
 * Gzipped (.jsonl.gz) and plain (.jsonl) files are both accepted. Streamed:
 * excluded from the proxy matcher, so it checks the session itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createGunzip } from "zlib";
import { createInterface } from "readline";
import { auth } from "@/lib/auth";
import {
  BACKUP_TYPE,
  EntryInput,
  WriteMode,
  clearStaging,
  promoteStaging,
  validateBackupEntry,
  writeEntries,
} from "@/lib/dictionary/dictionary-transfer";

export const runtime = "nodejs";

const FLUSH_AT = 1000;
const MAX_INVALID = 1000;

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
  // Optional: restore only these dictionaries from a file that holds more
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

  const touched = new Set<string>();
  const pending = new Map<string, EntryInput[]>();
  const totals = new Map<string, { written: number; skipped: number }>();
  const errors: string[] = [];
  let invalid = 0;
  let ignored = 0;
  const ignoredOrigins = new Set<string>();
  let lineNo = 0;
  let sawHeader = false;

  const flush = async (origin: string) => {
    const batch = pending.get(origin);
    if (!batch?.length) return;
    pending.set(origin, []);
    const r = await writeEntries(origin, batch, mode);
    const t = totals.get(origin) ?? { written: 0, skipped: 0 };
    t.written += r.written;
    t.skipped += r.skipped;
    totals.set(origin, t);
  };

  try {
    for await (const raw of lines) {
      lineNo++;
      const line = raw.trim();
      if (!line) continue;
      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch {
        if (!sawHeader) throw new Error("This is not a dictionary backup file");
        invalid++;
        if (errors.length < 20) errors.push(`Line ${lineNo}: not valid JSON`);
        if (invalid > MAX_INVALID) throw new Error("Too many invalid lines");
        continue;
      }
      if (!sawHeader) {
        if (parsed?.type !== BACKUP_TYPE) {
          throw new Error("This is not a dictionary backup file (missing header)");
        }
        sawHeader = true;
        continue;
      }
      const problem = validateBackupEntry(parsed);
      if (problem) {
        invalid++;
        if (errors.length < 20) errors.push(`Line ${lineNo}: ${problem}`);
        if (invalid > MAX_INVALID) throw new Error("Too many invalid lines");
        continue;
      }
      const origin: string = parsed.origin;
      if (only.size > 0 && !only.has(origin)) {
        ignored++;
        ignoredOrigins.add(origin);
        continue;
      }
      if (!touched.has(origin)) {
        touched.add(origin);
        if (mode === "replace") await clearStaging(origin);
      }
      const list = pending.get(origin) ?? [];
      list.push(parsed as EntryInput);
      pending.set(origin, list);
      if (list.length >= FLUSH_AT) await flush(origin);
    }
    if (!sawHeader) throw new Error("The file is empty");
    if (touched.size === 0 && only.size > 0) {
      throw new Error(
        `The backup has no entries for ${[...only].join(", ")}` +
          (ignoredOrigins.size ? ` (it holds ${[...ignoredOrigins].join(", ")})` : ""),
      );
    }
    for (const origin of touched) await flush(origin);
    if (mode === "replace") {
      for (const origin of touched) {
        if ((totals.get(origin)?.written ?? 0) > 0) await promoteStaging(origin);
      }
    }
    return NextResponse.json({
      success: true,
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
    if (mode === "replace") {
      for (const origin of touched) await clearStaging(origin).catch(() => {});
    }
    console.error("Dictionary restore failed:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Restore failed",
        partial:
          mode === "merge"
            ? [...totals].map(([origin, t]) => ({ origin, ...t }))
            : undefined,
      },
      { status: 400 },
    );
  }
}
