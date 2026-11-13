/**
 * Stream dictionaries out of the database.
 *
 *   GET /api/dictionary/export?origins=MW,AP90&format=backup&source=1
 *   GET /api/dictionary/export?origins=MW&format=csv&lang=IAST
 *
 * origins: comma list, or empty / "all" for every dictionary
 * format:
 *   backup  gzipped JSON lines; restorable with /api/dictionary/restore.
 *           source=1 also keeps each entry's original SQLite row.
 *   csv     one row per entry: the headword in every script and the meaning
 *           in `lang` (falls back to the first stored language).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  BACKUP_TYPE,
  BACKUP_VERSION,
  BackupHeader,
  isStagingOrigin,
  originStats,
} from "@/lib/dictionary/dictionary-transfer";

export const runtime = "nodejs";

const PAGE = 1000;
const SCRIPTS = ["SAN", "IAST", "ITRANS", "SLP1", "TEL", "ENG"];

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "csv" ? "csv" : "backup";
  const includeSource = params.get("source") === "1";
  const lang = (params.get("lang") || "SAN").toUpperCase();
  const requested = (params.get("origins") || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o && o !== "all");
  if (requested.some((o) => !/^[A-Z0-9_]{1,32}$/.test(o) || isStagingOrigin(o))) {
    return NextResponse.json({ error: "Invalid dictionary code" }, { status: 400 });
  }

  const stats = await originStats();
  const origins = (
    requested.length > 0
      ? requested
      : [...stats.keys()].filter((o) => !isStagingOrigin(o))
  )
    .filter((o) => (stats.get(o)?.count ?? 0) > 0)
    .sort();
  if (origins.length === 0) {
    return NextResponse.json({ error: "Nothing to export" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const select = {
    origin: true,
    wordIndex: true,
    wordLnum: true,
    word: true,
    description: true,
    attributes: true,
    phonetic: true,
    sourceData: format === "backup" && includeSource,
  } as const;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (format === "backup") {
          const header: BackupHeader = {
            type: BACKUP_TYPE,
            version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            origins,
            includesSource: includeSource,
          };
          controller.enqueue(encoder.encode(JSON.stringify(header) + "\n"));
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
              select,
            });
            if (page.length === 0) break;
            after = page[page.length - 1].wordIndex;

            let chunk = "";
            for (const e of page) {
              if (format === "backup") {
                chunk += JSON.stringify(e) + "\n";
              } else {
                const forms = SCRIPTS.map(
                  (s) => e.word.find((w) => w.language === s)?.value ?? "",
                );
                const meaning =
                  e.description.find((d) => d.language === lang) ?? e.description[0];
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
    format === "backup"
      ? `dictionary-backup-${label}-${date}.jsonl.gz`
      : `dictionary-${label}-${date}.csv`;

  return new Response(
    format === "backup" ? body.pipeThrough(
      new CompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>,
    ) : body,
    {
      headers: {
        "Content-Type": format === "backup" ? "application/gzip" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
