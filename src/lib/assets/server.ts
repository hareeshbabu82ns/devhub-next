import config from "@/config";
import { mkdir, readdir, rm, stat } from "fs/promises";
import type { Stats } from "fs";
import path from "path";
import {
  AssetItem,
  assetExt,
  assetKindFromName,
  assetUrl,
  normalizeAssetPath,
} from "./shared";

const rootDir = () => process.env.ROOT_DIR || process.cwd();

/** Absolute path of the uploads root. */
export function uploadsRoot(): string {
  return path.resolve(rootDir(), config.dataFolder, "uploads");
}

/** Absolute path of the generated-thumbnail cache (mirrors the uploads tree). */
export function thumbsRoot(): string {
  return path.resolve(rootDir(), config.dataFolder, ".cache", "thumbs");
}

export class AssetPathError extends Error {}

function resolveUnder(root: string, assetPath: string): string {
  const normalized = normalizeAssetPath(assetPath);
  if (normalized.includes("\0")) throw new AssetPathError("Invalid path");
  const abs = path.resolve(root, normalized);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new AssetPathError("Path is outside the assets folder");
  }
  return abs;
}

/** Absolute path for an asset path; throws if it escapes the uploads root. */
export function resolveAssetPath(assetPath: string): string {
  return resolveUnder(uploadsRoot(), assetPath);
}

export function resolveThumbDir(assetPath: string): string {
  return resolveUnder(thumbsRoot(), assetPath);
}

/** Drops cached thumbnails for a file or a whole folder. */
export async function dropThumbs(assetPath: string): Promise<void> {
  const normalized = normalizeAssetPath(assetPath);
  if (!normalized) return;
  await rm(resolveThumbDir(normalized), { recursive: true, force: true }).catch(
    () => {},
  );
}

export async function ensureUploadsRoot(): Promise<void> {
  await mkdir(uploadsRoot(), { recursive: true });
}

/** Turns an uploaded file name into something safe to store on disk. */
export function sanitizeFileName(name: string): string {
  const base = (name || "file")
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()!
    // eslint-disable-next-line no-control-regex
    .replace(/[:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return (base || "file").slice(-180);
}

async function exists(abs: string): Promise<boolean> {
  try {
    await stat(abs);
    return true;
  } catch {
    return false;
  }
}

/** First free name in a folder: "a.jpg", "a-1.jpg", "a-2.jpg"… */
export async function uniqueName(dirAbs: string, name: string): Promise<string> {
  if (!(await exists(path.join(dirAbs, name)))) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 1; i < 10000; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!(await exists(path.join(dirAbs, candidate)))) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

export function toAssetItem(
  assetPath: string,
  stats: Stats,
  childCount?: number,
): AssetItem {
  const p = normalizeAssetPath(assetPath);
  const name = p.split("/").pop() ?? "";
  const isDirectory = stats.isDirectory();
  return {
    name,
    path: p,
    url: assetUrl(p),
    kind: isDirectory ? "folder" : assetKindFromName(name),
    ext: isDirectory ? "" : assetExt(name),
    size: isDirectory ? 0 : stats.size,
    mtime: stats.mtimeMs,
    isDirectory,
    childCount,
  };
}

export async function statAsset(assetPath: string): Promise<AssetItem | null> {
  try {
    const stats = await stat(resolveAssetPath(assetPath));
    return toAssetItem(assetPath, stats);
  } catch (e) {
    if (e instanceof AssetPathError) throw e;
    return null;
  }
}

const isHidden = (name: string) => name.startsWith(".");

/** Direct children of a folder (hidden files skipped). */
export async function readAssetDir(assetPath: string): Promise<AssetItem[]> {
  const dir = normalizeAssetPath(assetPath);
  const abs = resolveAssetPath(dir);
  const names = (await readdir(abs)).filter((n) => !isHidden(n));
  const items = await Promise.all(
    names.map(async (name) => {
      try {
        const childAbs = path.join(abs, name);
        const stats = await stat(childAbs);
        let childCount: number | undefined;
        if (stats.isDirectory()) {
          childCount = (await readdir(childAbs)).filter((n) => !isHidden(n))
            .length;
        }
        return toAssetItem(dir ? `${dir}/${name}` : name, stats, childCount);
      } catch {
        return null; // vanished or unreadable; skip
      }
    }),
  );
  return items.filter((i): i is AssetItem => i !== null);
}

/** Recursive name search below a folder. */
export async function walkAssets(
  assetPath: string,
  match: (name: string) => boolean,
  limit: number,
): Promise<{ items: AssetItem[]; truncated: boolean }> {
  const out: AssetItem[] = [];
  let truncated = false;
  const queue = [normalizeAssetPath(assetPath)];
  let visited = 0;
  while (queue.length) {
    const dir = queue.shift()!;
    if (++visited > 5000) {
      truncated = true;
      break;
    }
    let children: AssetItem[];
    try {
      children = await readAssetDir(dir);
    } catch {
      continue;
    }
    for (const child of children) {
      if (child.isDirectory) queue.push(child.path);
      if (match(child.name)) {
        if (out.length >= limit) {
          truncated = true;
          return { items: out, truncated };
        }
        out.push(child);
      }
    }
  }
  return { items: out, truncated };
}
