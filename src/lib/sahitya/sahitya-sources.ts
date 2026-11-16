/**
 * Finding and reading the works in the sanskritsahitya data repository.
 * Server only.
 *
 * Layout (see the repository's README): one folder per work holding
 * `<work>.json`, or `<work>1.json`, `<work>2.json`… for large works, where
 * only the first shard carries the header. Folders that hold other kinds of
 * data (metres, dhatus, lexicons, sutras) are listed as reference data and
 * not imported here.
 */

import { existsSync } from "fs";
import { open, readFile, readdir, stat } from "fs/promises";
import { join, resolve } from "path";
import { readHeader, type SahityaHeader } from "./sahitya-format";

export const WORK_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function sahityaDataDir(): string {
  return resolve(process.env.SAHITYA_DATA_DIR || join(process.cwd(), "data/sanskritsahitya-com-data"));
}

export interface WorkFiles {
  work: string;
  /** files in reading order, relative to the data directory */
  files: string[];
  /** "work" can be imported; "reference" is other data kept in the repo */
  kind: "work" | "reference";
  note?: string;
}

const SKIP_DIRS = new Set(["code", "node_modules"]);

/** Whether a file starts like a work (has a top-level "title"). */
async function looksLikeWork(path: string): Promise<boolean> {
  const fh = await open(path, "r");
  try {
    const buf = Buffer.alloc(64 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const head = buf.subarray(0, bytesRead).toString("utf-8");
    return /"title"\s*:/.test(head);
  } finally {
    await fh.close();
  }
}

/** Lists every folder of the data directory as a work or reference data. */
export async function discoverWorks(dir = sahityaDataDir()): Promise<WorkFiles[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const out: WorkFiles[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const name = entry.name;
    if (!WORK_PATTERN.test(name)) continue;
    const jsons = (await readdir(join(dir, name))).filter((f) => f.endsWith(".json")).sort();
    if (jsons.length === 0) continue;
    let files: string[] = [];
    if (jsons.includes(`${name}.json`)) {
      files = [`${name}.json`];
    } else {
      const shards = jsons
        .map((f) => ({ f, m: f.match(new RegExp(`^${name}(\\d+)\\.json$`)) }))
        .filter((s) => s.m)
        .map((s) => ({ f: s.f, n: Number(s.m![1]) }))
        .sort((a, b) => a.n - b.n);
      // shards count from 1 without gaps
      const run: string[] = [];
      for (const s of shards) {
        if (s.n !== run.length + 1) break;
        run.push(s.f);
      }
      files = run;
    }
    const rel = files.map((f) => `${name}/${f}`);
    if (rel.length > 0 && (await looksLikeWork(join(dir, rel[0])))) {
      out.push({ work: name, files: rel, kind: "work" });
    } else {
      out.push({
        work: name,
        files: jsons.map((f) => `${name}/${f}`),
        kind: "reference",
        note: "not a text (metres, dhatus, lexicon or sutras)",
      });
    }
  }
  return out.sort((a, b) => a.work.localeCompare(b.work));
}

export async function findWork(work: string, dir = sahityaDataDir()): Promise<WorkFiles> {
  if (!WORK_PATTERN.test(work)) throw new Error(`Invalid work name: ${work}`);
  const found = (await discoverWorks(dir)).find((w) => w.work === work);
  if (!found) throw new Error(`No work "${work}" in ${dir}`);
  if (found.kind !== "work") throw new Error(`${work} is reference data, not a text`);
  return found;
}

/** Size and mtime of every file, to notice a changed source. */
export async function filesSignature(files: string[], dir = sahityaDataDir()): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    const s = await stat(join(dir, f));
    parts.push(`${f}:${s.size}:${Math.floor(s.mtimeMs)}`);
  }
  return parts.join("|");
}

/** Commit the data repository is at, when it is a git checkout. */
export async function gitRevision(dir = sahityaDataDir()): Promise<string | null> {
  try {
    const head = (await readFile(join(dir, ".git/HEAD"), "utf-8")).trim();
    if (!head.startsWith("ref:")) return head;
    const ref = head.slice(4).trim();
    const loose = join(dir, ".git", ref);
    if (existsSync(loose)) return (await readFile(loose, "utf-8")).trim();
    const packed = await readFile(join(dir, ".git/packed-refs"), "utf-8");
    const line = packed.split("\n").find((l) => l.endsWith(` ${ref}`));
    return line ? line.split(" ")[0] : null;
  } catch {
    return null;
  }
}

export interface WorkFile {
  file: string;
  /** header of this file (only the first shard has more than the title) */
  header: SahityaHeader;
  rows: unknown[];
}

/** Reads one file of a work. Large works are read one shard at a time. */
export async function readWorkFile(file: string, dir = sahityaDataDir()): Promise<WorkFile> {
  const json = JSON.parse(await readFile(join(dir, file), "utf-8"));
  const header = readHeader(json, file);
  return { file, header, rows: (json as { data: unknown[] }).data };
}
