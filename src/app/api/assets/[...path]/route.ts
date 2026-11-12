import { createReadStream } from "fs";
import { mkdir, readdir, rename, stat, unlink } from "fs/promises";
import mime from "mime";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable } from "stream";
import { auth } from "@/lib/auth";
import {
  AssetPathError,
  resolveAssetPath,
  resolveThumbDir,
} from "@/lib/assets/server";
import { assetExt, assetKindFromName } from "@/lib/assets/shared";

/** Widths the image components ask for (next.config deviceSizes + imageSizes). */
const THUMB_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];
/** Formats sharp should not touch: vector, animated, or already tiny. */
const NO_RESIZE = new Set(["svg", "gif", "ico"]);
/** Shown as plain text so an uploaded page can never run in our origin. */
const AS_PLAIN_TEXT = new Set(["html", "htm", "xml"]);

function streamFile(abs: string, start?: number, end?: number) {
  return Readable.toWeb(
    createReadStream(abs, { start, end }),
  ) as unknown as ReadableStream;
}

/**
 * Returns the path of a cached, resized WebP copy, creating it when missing.
 * Null when the image cannot be resized (the caller serves the original).
 */
async function thumbnailFor(
  assetPath: string,
  abs: string,
  mtimeMs: number,
  size: number,
  requestedWidth: number,
): Promise<string | null> {
  const width =
    THUMB_WIDTHS.find((w) => w >= requestedWidth) ??
    THUMB_WIDTHS[THUMB_WIDTHS.length - 1];
  try {
    const dir = resolveThumbDir(assetPath);
    const file = path.join(dir, `${width}-${Math.round(mtimeMs)}-${size}.webp`);
    const cached = await stat(file).then(
      () => true,
      () => false,
    );
    if (cached) return file;

    const sharp = (await import("sharp")).default;
    await mkdir(dir, { recursive: true });
    // copies made from an older version of the file are now useless
    for (const name of await readdir(dir)) {
      if (name.startsWith(`${width}-`)) await unlink(path.join(dir, name));
    }
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await sharp(abs)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(tmp);
    await rename(tmp, file);
    return file;
  } catch (e) {
    console.warn("[assets] thumbnail failed, serving original:", assetPath, e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const reqUrl = new URL(request.url);
  let segments: string[];
  try {
    segments = reqUrl.pathname
      .replace(/^\/api\/assets\//, "")
      .split("/")
      .map(decodeURIComponent);
  } catch {
    return new NextResponse("Bad path", { status: 400 });
  }
  // only the uploads tree is served, never the rest of the data folder
  if (segments.shift() !== "uploads") {
    return new NextResponse("Not found", { status: 404 });
  }
  const assetPath = segments.join("/");

  let abs: string;
  let fileStat;
  try {
    abs = resolveAssetPath(assetPath);
    fileStat = await stat(abs);
    if (!fileStat.isFile()) throw new Error("not a file");
  } catch (e) {
    return new NextResponse("File not found", {
      status: e instanceof AssetPathError ? 400 : 404,
    });
  }

  const fileName = path.basename(abs);
  const ext = assetExt(fileName);
  const kind = assetKindFromName(fileName);
  const download = reqUrl.searchParams.get("download") === "true";

  let servePath = abs;
  let size = fileStat.size;
  let contentType = mime.getType(ext) || "application/octet-stream";
  if (AS_PLAIN_TEXT.has(ext)) contentType = "text/plain";
  if (kind === "text" || AS_PLAIN_TEXT.has(ext)) contentType += "; charset=utf-8";

  const requestedWidth = Number(reqUrl.searchParams.get("w"));
  if (
    !download &&
    kind === "image" &&
    !NO_RESIZE.has(ext) &&
    requestedWidth > 0
  ) {
    const thumb = await thumbnailFor(
      assetPath,
      abs,
      fileStat.mtimeMs,
      fileStat.size,
      requestedWidth,
    );
    if (thumb) {
      servePath = thumb;
      size = (await stat(thumb)).size;
      contentType = "image/webp";
    }
  }

  const etag = `W/"${fileStat.size}-${Math.round(fileStat.mtimeMs)}${
    servePath === abs ? "" : `-w${requestedWidth}`
  }"`;
  const inline =
    !download && ["image", "audio", "video", "pdf", "text"].includes(kind);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Accept-Ranges": "bytes",
    "Last-Modified": fileStat.mtime.toUTCString(),
    ETag: etag,
    // A `v` (file version) in the URL makes it safe to cache forever;
    // otherwise always revalidate, so a replaced file shows up immediately.
    "Cache-Control": reqUrl.searchParams.has("v")
      ? "private, max-age=31536000, immutable"
      : "private, no-cache",
    "X-Content-Type-Options": "nosniff",
  };
  if (ext === "svg") {
    // no scripts when an SVG is opened directly
    headers["Content-Security-Policy"] =
      "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  // Range requests: needed to seek in audio and video
  const range = request.headers.get("range");
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (match && (match[1] || match[2])) {
    let start: number;
    let end: number;
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    } else {
      // suffix form: the last N bytes
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    }
    if (start >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    return new NextResponse(streamFile(servePath, start, end), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new NextResponse(size > 0 ? streamFile(servePath) : null, {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
  });
}
