/**
 * Asset helpers shared by server and client.
 *
 * An asset "path" is a POSIX path relative to the uploads root, with no
 * leading or trailing slash ("" is the root). An asset "url" is what gets
 * stored on entities and served by /api/assets.
 */

export const ASSET_URL_PREFIX = "/api/assets/uploads";

export type AssetKind =
  | "folder"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "text"
  | "archive"
  | "other";

export interface AssetItem {
  name: string;
  /** path relative to the uploads root */
  path: string;
  /** stable URL to store / share (no query string) */
  url: string;
  kind: AssetKind;
  ext: string;
  size: number;
  /** modified time, epoch ms */
  mtime: number;
  isDirectory: boolean;
  /** folders only: number of direct children */
  childCount?: number;
}

export interface AssetReference {
  model: "entity" | "playlist" | "playlistSong" | "user";
  id: string;
  field: string;
  title: string;
}

export interface AssetUsage {
  total: number;
  /** first few references, for display */
  refs: AssetReference[];
}

export type AssetResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const KIND_EXTENSIONS: Record<Exclude<AssetKind, "folder" | "other">, string[]> =
  {
    image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "ico"],
    audio: ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "weba"],
    video: ["mp4", "webm", "mov", "m4v", "mkv", "ogv"],
    pdf: ["pdf"],
    text: [
      "txt",
      "md",
      "json",
      "csv",
      "tsv",
      "html",
      "htm",
      "xml",
      "yaml",
      "yml",
      "log",
      "srt",
      "vtt",
    ],
    archive: ["zip", "gz", "tgz", "tar", "7z", "rar"],
  };

const EXT_TO_KIND = new Map<string, AssetKind>();
for (const [kind, exts] of Object.entries(KIND_EXTENSIONS)) {
  for (const ext of exts) EXT_TO_KIND.set(ext, kind as AssetKind);
}

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  folder: "Folders",
  image: "Images",
  audio: "Audio",
  video: "Video",
  pdf: "PDF",
  text: "Text",
  archive: "Archives",
  other: "Other",
};

export function assetExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function assetKindFromName(name: string): AssetKind {
  return EXT_TO_KIND.get(assetExt(name)) ?? "other";
}

/** Value for an <input type="file" accept>; undefined means anything. */
export function acceptAttribute(kinds?: AssetKind[]): string | undefined {
  if (!kinds || kinds.length === 0) return undefined;
  const parts: string[] = [];
  for (const kind of kinds) {
    if (kind === "image") parts.push("image/*");
    else if (kind === "audio") parts.push("audio/*");
    else if (kind === "video") parts.push("video/*");
    else if (kind === "folder" || kind === "other") return undefined;
    else parts.push(...KIND_EXTENSIONS[kind].map((e) => `.${e}`));
  }
  return parts.join(",");
}

export function normalizeAssetPath(path: string | null | undefined): string {
  return (path ?? "")
    .split("/")
    .filter((s) => s && s !== ".")
    .join("/");
}

export function joinAssetPath(...parts: string[]): string {
  return normalizeAssetPath(parts.join("/"));
}

export function parentAssetPath(path: string): string {
  const segments = normalizeAssetPath(path).split("/");
  segments.pop();
  return segments.join("/");
}

export function assetBaseName(path: string): string {
  return normalizeAssetPath(path).split("/").pop() ?? "";
}

export function assetUrl(path: string): string {
  const encoded = normalizeAssetPath(path)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return encoded ? `${ASSET_URL_PREFIX}/${encoded}` : ASSET_URL_PREFIX;
}

export function isAssetUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(`${ASSET_URL_PREFIX}/`);
}

/** Path of a stored asset URL (query string ignored), or null if not ours. */
export function assetPathFromUrl(url: string | null | undefined): string | null {
  if (!url || !isAssetUrl(url)) return null;
  const clean = url.slice(ASSET_URL_PREFIX.length + 1).split(/[?#]/)[0];
  const segments = clean.split("/").map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  if (segments.some((s) => s === "..")) return null;
  return normalizeAssetPath(segments.join("/"));
}

/** URL with the query string (e.g. legacy `?download=true`) removed. */
export function cleanAssetUrl(url: string): string {
  return isAssetUrl(url) ? url.split(/[?#]/)[0] : url;
}

export function assetDownloadUrl(url: string): string {
  return `${cleanAssetUrl(url)}?download=true`;
}

/** Cache-busted URL for display: changes whenever the file is replaced. */
export function assetVersionedUrl(item: Pick<AssetItem, "url" | "mtime">) {
  return `${item.url}?v=${Math.round(item.mtime)}`;
}

/**
 * Every spelling under which a path may have been stored in the database:
 * encoded or raw, with or without the legacy download flag.
 */
export function assetUrlVariants(path: string): string[] {
  const p = normalizeAssetPath(path);
  const bases = new Set([assetUrl(p), `${ASSET_URL_PREFIX}/${p}`]);
  const out: string[] = [];
  for (const base of bases) out.push(base, `${base}?download=true`);
  return out;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/**
 * Checks a single file or folder name. Returns an error message, or null
 * when the name is usable.
 */
export function validateAssetName(name: string): string | null {
  const n = name.trim();
  if (!n) return "Name is required";
  if (n.length > 180) return "Name is too long";
  if (n === "." || n === ".." || n.startsWith(".")) {
    return "Name cannot start with a dot";
  }
  // eslint-disable-next-line no-control-regex
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(n)) {
    return 'Name cannot contain \\ / : * ? " < > |';
  }
  return null;
}
