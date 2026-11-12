import { createWriteStream } from "fs";
import { mkdir, stat, unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { auth } from "@/lib/auth";
import {
  AssetPathError,
  dropThumbs,
  resolveAssetPath,
  sanitizeFileName,
  toAssetItem,
  uniqueName,
} from "@/lib/assets/server";
import {
  AssetItem,
  joinAssetPath,
  normalizeAssetPath,
} from "@/lib/assets/shared";

/**
 * Uploads files into the assets tree.
 *
 * multipart/form-data fields:
 * - `path`      destination folder, relative to the uploads root ("" = root)
 * - `media`     one or more files
 * - `overwrite` "true" replaces a file with the same name; otherwise the new
 *               file gets a numbered name ("a-1.jpg")
 *
 * Responds with `{ data: { items, url } }` or `{ error }`.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "You are signed out" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const folder = normalizeAssetPath(String(formData.get("path") ?? ""));
    const overwrite = formData.get("overwrite") === "true";
    const files = formData
      .getAll("media")
      .filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No file was uploaded" },
        { status: 400 },
      );
    }

    const dirAbs = resolveAssetPath(folder);
    await mkdir(dirAbs, { recursive: true });

    const items: AssetItem[] = [];
    for (const file of files) {
      const wanted = sanitizeFileName(file.name);
      const name = overwrite ? wanted : await uniqueName(dirAbs, wanted);
      const assetPath = joinAssetPath(folder, name);
      const abs = resolveAssetPath(assetPath);
      try {
        await pipeline(
          Readable.fromWeb(file.stream() as any),
          createWriteStream(abs),
        );
      } catch (e) {
        await unlink(abs).catch(() => {});
        throw e;
      }
      if (overwrite) await dropThumbs(assetPath);
      items.push(toAssetItem(assetPath, await stat(abs)));
    }

    return NextResponse.json({
      data: { items, url: items.map((i) => i.url) },
    });
  } catch (e: any) {
    if (e instanceof AssetPathError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[assets] upload failed", e);
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 },
    );
  }
}
