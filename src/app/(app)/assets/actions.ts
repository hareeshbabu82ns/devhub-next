"use server";

import { mkdir, rename, rm, stat } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  AssetItem,
  AssetReference,
  AssetResult,
  AssetUsage,
  ASSET_URL_PREFIX,
  assetBaseName,
  assetPathFromUrl,
  assetUrl,
  assetUrlVariants,
  joinAssetPath,
  normalizeAssetPath,
  parentAssetPath,
  validateAssetName,
} from "@/lib/assets/shared";
import {
  dropThumbs,
  ensureUploadsRoot,
  readAssetDir,
  resolveAssetPath,
  statAsset,
  walkAssets,
} from "@/lib/assets/server";

/** Database columns that hold asset URLs. */
const REFERENCE_FIELDS = [
  { model: "entity", field: "imageThumbnail" },
  { model: "entity", field: "audio" },
  { model: "playlist", field: "image" },
  { model: "playlistSong", field: "src" },
  { model: "user", field: "image" },
] as const;

const USAGE_DISPLAY_LIMIT = 20;
const SEARCH_LIMIT = 300;

async function run<T>(fn: () => Promise<T>): Promise<AssetResult<T>> {
  try {
    const session = await auth();
    if (!session) return { ok: false, error: "You are signed out" };
    return { ok: true, data: await fn() };
  } catch (e: any) {
    const code = e?.code as string | undefined;
    const error =
      code === "ENOENT"
        ? "File or folder not found"
        : code === "EEXIST" || code === "ENOTEMPTY"
          ? "Something with that name already exists"
          : code === "EACCES" || code === "EPERM"
            ? "The server is not allowed to change that file"
            : e?.message || "Something went wrong";
    if (!code) console.error("[assets]", e);
    return { ok: false, error };
  }
}

//********** Reading **********//

export async function listAssets(
  folder: string,
): Promise<AssetResult<{ path: string; items: AssetItem[] }>> {
  return run(async () => {
    const dir = normalizeAssetPath(folder);
    if (!dir) await ensureUploadsRoot();
    return { path: dir, items: await readAssetDir(dir) };
  });
}

/** Finds files and folders by name anywhere below `folder`. */
export async function searchAssets(
  folder: string,
  query: string,
): Promise<AssetResult<{ items: AssetItem[]; truncated: boolean }>> {
  return run(async () => {
    const q = query.trim().toLowerCase();
    if (!q) return { items: [], truncated: false };
    return walkAssets(
      folder,
      (name) => name.toLowerCase().includes(q),
      SEARCH_LIMIT,
    );
  });
}

//********** References (which records use an asset) **********//

function referenceWhere(field: string, paths: string[]) {
  const exact: string[] = [];
  const prefixes: string[] = [];
  for (const p of paths) {
    const variants = assetUrlVariants(p);
    exact.push(...variants);
    // anything inside the path, when the path is a folder
    for (const v of variants) if (!v.includes("?")) prefixes.push(`${v}/`);
  }
  return {
    OR: [
      { [field]: { in: exact } },
      ...prefixes.map((prefix) => ({ [field]: { startsWith: prefix } })),
    ],
  };
}

function referenceTitle(model: string, row: any): string {
  if (model === "entity") {
    const text: { language: string; value: string }[] = row.text ?? [];
    const value = text.find((t) => t.value?.trim())?.value ?? "";
    const firstLine = value.split("\n")[0].trim();
    return `${row.type}: ${firstLine.slice(0, 60) || row.id}`;
  }
  if (model === "playlist") return `Playlist: ${row.name}`;
  if (model === "user") return `User: ${row.name || row.email || row.id}`;
  return "Playlist song";
}

const TITLE_SELECT: Record<string, object> = {
  entity: { id: true, type: true, text: true },
  playlist: { id: true, name: true },
  playlistSong: { id: true },
  user: { id: true, name: true, email: true },
};

/** Which records point at these files, or at anything inside these folders. */
export async function getAssetUsage(
  paths: string[],
): Promise<AssetResult<AssetUsage>> {
  return run(async () => {
    const clean = paths.map(normalizeAssetPath).filter(Boolean);
    const usage: AssetUsage = { total: 0, refs: [] };
    if (clean.length === 0) return usage;
    for (const { model, field } of REFERENCE_FIELDS) {
      const delegate = (db as any)[model];
      const where = referenceWhere(field, clean);
      const count: number = await delegate.count({ where });
      if (!count) continue;
      usage.total += count;
      const room = USAGE_DISPLAY_LIMIT - usage.refs.length;
      if (room <= 0) continue;
      const rows: any[] = await delegate.findMany({
        where,
        select: TITLE_SELECT[model],
        take: room,
      });
      usage.refs.push(
        ...rows.map(
          (row): AssetReference => ({
            model,
            id: row.id,
            field,
            title: referenceTitle(model, row),
          }),
        ),
      );
    }
    return usage;
  });
}

/** Points every stored reference at the new location after a rename/move. */
async function relinkReferences(from: string, to: string): Promise<number> {
  let updated = 0;
  for (const { model, field } of REFERENCE_FIELDS) {
    const delegate = (db as any)[model];

    // the path itself (a file)
    const direct = await delegate.updateMany({
      where: { [field]: { in: assetUrlVariants(from) } },
      data: { [field]: assetUrl(to) },
    });
    updated += direct.count;

    // anything inside the path (a folder)
    const prefixes = [assetUrl(from), `${ASSET_URL_PREFIX}/${from}`].map(
      (p) => `${p}/`,
    );
    const rows: any[] = await delegate.findMany({
      where: { OR: prefixes.map((p) => ({ [field]: { startsWith: p } })) },
      select: { id: true, [field]: true },
    });
    for (const row of rows) {
      const oldPath = assetPathFromUrl(row[field]);
      if (!oldPath || !oldPath.startsWith(`${from}/`)) continue;
      const newPath = joinAssetPath(to, oldPath.slice(from.length + 1));
      await delegate.update({
        where: { id: row.id },
        data: { [field]: assetUrl(newPath) },
      });
      updated++;
    }
  }
  return updated;
}

//********** Changing **********//

export async function createAssetFolder(
  parent: string,
  name: string,
): Promise<AssetResult<AssetItem>> {
  return run(async () => {
    const invalid = validateAssetName(name);
    if (invalid) throw new Error(invalid);
    const folderPath = joinAssetPath(parent, name.trim());
    const abs = resolveAssetPath(folderPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await mkdir(abs); // EEXIST when taken
    return (await statAsset(folderPath))!;
  });
}

async function moveOne(
  from: string,
  to: string,
): Promise<{ item: AssetItem; relinked: number }> {
  const fromAbs = resolveAssetPath(from);
  const toAbs = resolveAssetPath(to);
  if (!from) throw new Error("The root folder cannot be moved");
  if (to === from) return { item: (await statAsset(from))!, relinked: 0 };
  if (`${to}/`.startsWith(`${from}/`)) {
    throw new Error("A folder cannot be moved into itself");
  }
  await stat(fromAbs); // ENOENT when the source is gone

  // Never overwrite silently. A case-only rename is the one legitimate case
  // where the target may "exist" (same file on a case-insensitive disk).
  const caseOnly = from.toLowerCase() === to.toLowerCase();
  if (!caseOnly) {
    const taken = await stat(toAbs).then(
      () => true,
      () => false,
    );
    if (taken) {
      throw new Error(`"${assetBaseName(to)}" already exists in that folder`);
    }
  }

  await mkdir(path.dirname(toAbs), { recursive: true });
  await rename(fromAbs, toAbs);
  await dropThumbs(from);
  const relinked = await relinkReferences(from, to);
  return { item: (await statAsset(to))!, relinked };
}

export async function renameAsset(
  assetPath: string,
  newName: string,
): Promise<AssetResult<{ item: AssetItem; relinked: number }>> {
  return run(async () => {
    const invalid = validateAssetName(newName);
    if (invalid) throw new Error(invalid);
    const from = normalizeAssetPath(assetPath);
    return moveOne(from, joinAssetPath(parentAssetPath(from), newName.trim()));
  });
}

export interface BulkOutcome {
  done: number;
  relinked: number;
  failed: { path: string; error: string }[];
}

export async function moveAssets(
  paths: string[],
  destinationFolder: string,
): Promise<AssetResult<BulkOutcome>> {
  return run(async () => {
    const dest = normalizeAssetPath(destinationFolder);
    const destStat = await stat(resolveAssetPath(dest));
    if (!destStat.isDirectory()) throw new Error("Destination is not a folder");
    const outcome: BulkOutcome = { done: 0, relinked: 0, failed: [] };
    for (const p of paths.map(normalizeAssetPath)) {
      try {
        const { relinked } = await moveOne(
          p,
          joinAssetPath(dest, assetBaseName(p)),
        );
        outcome.done++;
        outcome.relinked += relinked;
      } catch (e: any) {
        outcome.failed.push({
          path: p,
          error: e?.code === "ENOENT" ? "Not found" : e?.message || "Failed",
        });
      }
    }
    return outcome;
  });
}

/** Deletes files and folders (folders with everything inside). */
export async function deleteAssets(
  paths: string[],
): Promise<AssetResult<BulkOutcome>> {
  return run(async () => {
    const outcome: BulkOutcome = { done: 0, relinked: 0, failed: [] };
    for (const p of paths.map(normalizeAssetPath)) {
      try {
        if (!p) throw new Error("The root folder cannot be deleted");
        const abs = resolveAssetPath(p);
        await stat(abs);
        await rm(abs, { recursive: true });
        await dropThumbs(p);
        outcome.done++;
      } catch (e: any) {
        outcome.failed.push({
          path: p,
          error: e?.code === "ENOENT" ? "Not found" : e?.message || "Failed",
        });
      }
    }
    return outcome;
  });
}
