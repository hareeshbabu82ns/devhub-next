/**
 * Stream dictionaries out of the database.
 *
 *   GET /api/dictionary/export?origins=MW,AP90&format=originals
 *   GET /api/dictionary/export?origins=MW&format=backup
 *   GET /api/dictionary/export?origins=MW&format=csv&lang=IAST
 *
 * origins: comma list, or empty / "all" for every dictionary
 * format:
 *   originals  gzipped JSON lines of the original source rows, exactly as
 *              captured, plus each dictionary's source details and companion
 *              tables. The most complete backup: restore it, then rebuild.
 *   backup     gzipped JSON lines of the search entries as they are now
 *              (including hand edits). source=1 adds old imports' source rows.
 *   csv        one row per entry: the headword in every script and the
 *              meaning in `lang` (falls back to the first stored language).
 * Both backups restore with /api/dictionary/restore.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ORIGINALS_TYPE,
  ORIGINALS_VERSION,
  ORIGIN_PATTERN,
  OriginalsHeader,
  isInternalOrigin,
} from "@/lib/dictionary/dictionary-pipeline";
import { BACKUP_TYPE, BACKUP_VERSION, BackupHeader } from "@/lib/dictionary/dictionary-backup";

export const runtime = "nodejs";

const PAGE = 1000;
const SCRIPTS = ["SAN", "IAST", "ITRANS", "SLP1", "TEL", "ENG"];

type Format = "originals" | "backup" | "csv";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function distinct(collection: string): Promise<string[]> {
  try {
    const r = await db.$runCommandRaw({ distinct: collection, key: "origin" });
    return ((r as { values?: string[] }).values ?? []).filter((o) => !isInternalOrigin(o));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const formatParam = params.get("format");
  const format: Format =
    formatParam === "csv" ? "csv" : formatParam === "originals" ? "originals" : "backup";
  const includeSource = params.get("source") === "1";
  const lang = (params.get("lang") || "SAN").toUpperCase();
  const requested = (params.get("origins") || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o && o !== "all");
  if (requested.some((o) => !ORIGIN_PATTERN.test(o) || isInternalOrigin(o))) {
    return NextResponse.json({ error: "Invalid dictionary code" }, { status: 400 });
  }

  const available = new Set(await distinct(format === "originals" ? "DictRawEntries" : "DictWords"));
  const origins = (requested.length > 0 ? requested : [...available])
    .filter((o) => available.has(o))
    .sort();
  if (origins.length === 0) {
    return NextResponse.json(
      {
        error:
          format === "originals"
            ? "No originals captured for these dictionaries yet"
            : "Nothing to export",
      },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();
  const line = (o: unknown) => JSON.stringify(o) + "\n";

  async function writeOriginals(controller: ReadableStreamDefaultController<Uint8Array>) {
    const header: OriginalsHeader = {
      type: ORIGINALS_TYPE,
      version: ORIGINALS_VERSION,
      exportedAt: new Date().toISOString(),
      origins,
    };
    controller.enqueue(encoder.encode(line(header)));
    for (const origin of origins) {
      const src = await db.dictionarySource.findUnique({ where: { origin } });
      if (src) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...source } = src;
        controller.enqueue(encoder.encode(line({ source })));
      }
      let after = 0;
      while (true) {
        if (request.signal.aborted) return;
        const page = await db.dictionaryRawEntry.findMany({
          where: { origin, seq: { gt: after } },
          orderBy: { seq: "asc" },
          take: PAGE,
          select: { origin: true, key: true, seq: true, rowid: true, headword: true, row: true },
        });
        if (page.length === 0) break;
        after = page[page.length - 1].seq;
        controller.enqueue(encoder.encode(page.map(line).join("")));
        if (page.length < PAGE) break;
      }
    }
  }

  async function writeEntries(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (format === "backup") {
      const header: BackupHeader = {
        type: BACKUP_TYPE,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        origins,
        includesSource: includeSource,
      };
      controller.enqueue(encoder.encode(line(header)));
    } else {
      controller.enqueue(
        encoder.encode(
          "﻿" +
            ["origin", "wordIndex", ...SCRIPTS, "meaning", "meaningLanguage"].join(",") +
            "\r\n",
        ),
      );
    }
    for (const origin of origins) {
      let after = -Infinity;
      while (true) {
        if (request.signal.aborted) return;
        const page = await db.dictionaryWord.findMany({
          where: { origin, ...(after > -Infinity ? { wordIndex: { gt: after } } : {}) },
          orderBy: { wordIndex: "asc" },
          take: PAGE,
          select: {
            origin: true,
            wordIndex: true,
            wordLnum: true,
            word: true,
            description: true,
            attributes: true,
            phonetic: true,
            sourceKey: true,
            processorVersion: true,
            editedAt: true,
            sourceData: format === "backup",
          },
        });
        if (page.length === 0) break;
        after = page[page.length - 1].wordIndex;

        let chunk = "";
        for (const e of page) {
          if (format === "backup") {
            // Full source rows of old imports only on request; pointers always
            const legacy = (e.sourceData as { data?: unknown } | null)?.data !== undefined;
            chunk += line({
              ...e,
              sourceData: legacy && !includeSource ? undefined : e.sourceData,
            });
          } else {
            const forms = SCRIPTS.map((s) => e.word.find((w) => w.language === s)?.value ?? "");
            const meaning = e.description.find((d) => d.language === lang) ?? e.description[0];
            chunk +=
              [e.origin, e.wordIndex, ...forms, meaning?.value ?? "", meaning?.language ?? ""]
                .map(csvCell)
                .join(",") + "\r\n";
          }
        }
        controller.enqueue(encoder.encode(chunk));
        if (page.length < PAGE) break;
      }
    }
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (format === "originals") await writeOriginals(controller);
        else await writeEntries(controller);
        controller.close();
      } catch (e) {
        console.error("Dictionary export failed:", e);
        controller.error(e);
      }
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  const label =
    requested.length === 0
      ? "all"
      : origins.length <= 3
        ? origins.join("-")
        : `${origins.length}-dictionaries`;
  const filename =
    format === "originals"
      ? `dictionary-originals-${label}-${date}.jsonl.gz`
      : format === "backup"
        ? `dictionary-backup-${label}-${date}.jsonl.gz`
        : `dictionary-${label}-${date}.csv`;
  const gzip = format !== "csv";

  return new Response(
    gzip
      ? body.pipeThrough(
          new CompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>,
        )
      : body,
    {
      headers: {
        "Content-Type": gzip ? "application/gzip" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
