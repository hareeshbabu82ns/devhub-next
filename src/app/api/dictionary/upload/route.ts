/**
 * Upload a dictionary's SQLite source file.
 *
 *   POST /api/dictionary/upload?dictionary=mw   (body: the raw .sqlite file)
 *
 * The body is streamed to disk (no 10 MB proxy cap: this route is excluded
 * from the proxy matcher and checks the session itself), checked to be a
 * SQLite database holding the dictionary's table, and only then moved over
 * the existing file.
 */

import { NextRequest, NextResponse } from "next/server";
import { createWriteStream, existsSync } from "fs";
import { mkdir, open, rename, unlink } from "fs/promises";
import { resolve } from "path";
import { randomUUID } from "crypto";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { auth } from "@/lib/auth";
import { DictionaryName, LEXICON_ALL_DICT } from "@/lib/dictionary/dictionary-constants";
import {
  SQLITE_DIR,
  readSqliteInfo,
  sqlitePathFor,
} from "@/lib/dictionary/dictionary-transfer";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const SQLITE_MAGIC = "SQLite format 3\u0000";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return error("Please sign in", 401);
  if (session.user.role !== "ADMIN") {
    return error("Only administrators can upload dictionaries", 403);
  }

  const dictionary = request.nextUrl.searchParams.get("dictionary") as DictionaryName | null;
  if (!dictionary || !LEXICON_ALL_DICT.includes(dictionary)) {
    return error("Unknown dictionary");
  }
  if (!request.body) return error("No file received");

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return error("File is larger than 2 GB");

  if (!existsSync(SQLITE_DIR)) await mkdir(SQLITE_DIR, { recursive: true });
  const tmpPath = resolve(SQLITE_DIR, `.${dictionary}.upload-${randomUUID()}`);

  try {
    let received = 0;
    const limiter = new Transform({
      transform(chunk, _enc, cb) {
        received += chunk.length;
        if (received > MAX_BYTES) cb(new Error("File is larger than 2 GB"));
        else cb(null, chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(request.body as import("stream/web").ReadableStream),
      limiter,
      createWriteStream(tmpPath),
    );

    // Must be a SQLite database…
    const fh = await open(tmpPath, "r");
    const head = Buffer.alloc(16);
    await fh.read(head, 0, 16, 0);
    await fh.close();
    if (head.toString("latin1") !== SQLITE_MAGIC) {
      throw new Error("This is not a SQLite database file");
    }
    // …holding this dictionary's table
    const info = readSqliteInfo(dictionary, tmpPath);
    if (info.error || info.rows === undefined) {
      throw new Error(info.error ?? "Cannot read the SQLite file");
    }

    await rename(tmpPath, sqlitePathFor(dictionary));
    return NextResponse.json({
      success: true,
      rows: info.rows,
      size: received,
      message: `${dictionary.toUpperCase()}: ${info.rows.toLocaleString()} rows ready to import`,
    });
  } catch (e) {
    await unlink(tmpPath).catch(() => {});
    console.error("Dictionary upload failed:", e);
    return error(e instanceof Error ? e.message : "Upload failed");
  }
}
