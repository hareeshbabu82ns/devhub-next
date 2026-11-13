/**
 * Dictionary transfer: SQLite import in batches, staged replacement, and
 * backup export / restore. Server only.
 *
 * Replacing a dictionary never deletes the live entries until the new ones
 * are all in: rows are written under a staging origin ("__import__MW") and
 * swapped in at the end. Lookups ignore staging origins.
 */

import { existsSync, statSync } from "fs";
import { resolve } from "path";
import Database from "better-sqlite3";
import { Prisma } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import config from "@/config";
import {
  DictionaryName,
  LEXICON_ALL_DICT,
  LEXICON_ALL_DICT_TO_DB_MAP,
  LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP,
  LEXICON_ALL_TABLE_WORD_FIELD_MAP,
} from "./dictionary-constants";
import {
  ProcessedDictionaryWord,
  SqliteRowData,
  TableMetadata,
  processDictionaryWordRow,
  validateRowData,
} from "./dictionary-processor";
import { generatePhoneticString } from "./word-utils";

export const STAGING_PREFIX = "__import__";
export const SQLITE_DIR = resolve(config.dataFolder, "dict");

export const stagingOrigin = (origin: string) => `${STAGING_PREFIX}${origin}`;
export const isStagingOrigin = (origin: string) =>
  origin.startsWith(STAGING_PREFIX);

export function originFor(dict: DictionaryName): string {
  return LEXICON_ALL_DICT_TO_DB_MAP[dict] ?? dict.toUpperCase();
}

export function dictionaryForOrigin(origin: string): DictionaryName | null {
  return (
    (LEXICON_ALL_DICT as readonly string[]).find(
      (d) => originFor(d as DictionaryName) === origin,
    ) as DictionaryName | undefined
  ) ?? null;
}

export function sqlitePathFor(dict: DictionaryName): string {
  return resolve(SQLITE_DIR, `${dict}.sqlite`);
}

// ---------------------------------------------------------------------------
// SQLite source files
// ---------------------------------------------------------------------------

export interface SqliteInfo {
  exists: boolean;
  size?: number;
  modifiedAt?: Date;
  rows?: number;
  error?: string;
}

/** Opens a dictionary SQLite file and checks it holds the expected table */
function openSqlite(path: string, dict: DictionaryName) {
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  const table = LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP[dict];
  const found = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(table);
  if (!found) {
    sqlite.close();
    throw new Error(`Table "${table}" not found — is this the ${dict.toUpperCase()} file?`);
  }
  return { sqlite, table };
}

export function readSqliteInfo(dict: DictionaryName, path = sqlitePathFor(dict)): SqliteInfo {
  if (!existsSync(path)) return { exists: false };
  const st = statSync(path);
  try {
    const { sqlite, table } = openSqlite(path, dict);
    try {
      const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number };
      return { exists: true, size: st.size, modifiedAt: st.mtime, rows: row.n };
    } finally {
      sqlite.close();
    }
  } catch (e) {
    return {
      exists: true,
      size: st.size,
      modifiedAt: st.mtime,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function tableMetadata(sqlite: Database.Database, dict: DictionaryName, table: string): TableMetadata {
  const columns = (sqlite.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map(
    (c) => c.name,
  );
  const wordFieldName = LEXICON_ALL_TABLE_WORD_FIELD_MAP[dict];
  const orderFieldName = columns.includes("lnum") ? "lnum" : wordFieldName;
  return {
    tableName: table,
    columns,
    columnPositions: Object.fromEntries(columns.map((c, i) => [c, i])),
    wordFieldName,
    descFieldName: "",
    orderFieldName,
  };
}

/**
 * Reads and processes one batch of SQLite rows. wordIndex is the row's
 * 1-based position in dictionary order, so batches line up with a
 * single-pass import.
 */
export function readProcessedBatch(
  dict: DictionaryName,
  offset: number,
  size: number,
  opts: { validate?: boolean } = {},
): { words: ProcessedDictionaryWord[]; invalid: number; errors: string[]; rowsRead: number } {
  const { sqlite, table } = openSqlite(sqlitePathFor(dict), dict);
  try {
    const meta = tableMetadata(sqlite, dict, table);
    const order = meta.orderFieldName ? `"${meta.orderFieldName}", rowid` : "rowid";
    const rows = sqlite
      .prepare(`SELECT * FROM "${table}" ORDER BY ${order} LIMIT ? OFFSET ?`)
      .all(size, offset) as SqliteRowData[];
    const words: ProcessedDictionaryWord[] = [];
    const errors: string[] = [];
    let invalid = 0;
    rows.forEach((row, i) => {
      if (opts.validate) {
        const v = validateRowData(row, dict, meta);
        if (!v.isValid) {
          invalid++;
          if (errors.length < 20) errors.push(...v.errors);
          return;
        }
      }
      try {
        words.push(
          processDictionaryWordRow(row, dict, offset + i + 1, meta, {
            includeHtmlProcessing: true,
          }),
        );
      } catch (e) {
        invalid++;
        if (errors.length < 20) {
          errors.push(`Row ${offset + i + 1}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    });
    return { words, invalid, errors, rowsRead: rows.length };
  } finally {
    sqlite.close();
  }
}

// ---------------------------------------------------------------------------
// Writing entries
// ---------------------------------------------------------------------------

export type WriteMode = "replace" | "merge";

export interface EntryInput {
  origin: string;
  wordIndex: number;
  wordLnum?: number | null;
  word: { language: string; value: string }[];
  description: { language: string; value: string }[];
  attributes?: { key: string; value: string }[];
  phonetic?: string;
  sourceData?: unknown;
}

/**
 * Writes entries for one origin. "replace" writes to the staging origin;
 * "merge" writes straight to the live origin, skipping wordIndexes that
 * already exist. Returns how many were written and skipped.
 */
export async function writeEntries(
  origin: string,
  entries: EntryInput[],
  mode: WriteMode,
): Promise<{ written: number; skipped: number }> {
  if (entries.length === 0) return { written: 0, skipped: 0 };
  let toWrite = entries;
  const target = mode === "replace" ? stagingOrigin(origin) : origin;
  if (mode === "merge") {
    const existing = await db.dictionaryWord.findMany({
      where: { origin, wordIndex: { in: entries.map((e) => e.wordIndex) } },
      select: { wordIndex: true },
    });
    const have = new Set(existing.map((e) => e.wordIndex));
    toWrite = entries.filter((e) => !have.has(e.wordIndex));
  }
  const now = new Date();
  if (toWrite.length > 0) {
    await db.dictionaryWord.createMany({
      data: toWrite.map((e) => ({
        origin: target,
        wordIndex: e.wordIndex,
        wordLnum: e.wordLnum ?? 0,
        word: e.word,
        description: e.description,
        attributes: e.attributes ?? [],
        phonetic: e.phonetic ?? generatePhoneticString(e.word as any, e.description as any),
        sourceData: (e.sourceData ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }
  return { written: toWrite.length, skipped: entries.length - toWrite.length };
}

export async function clearStaging(origin: string): Promise<number> {
  const r = await db.dictionaryWord.deleteMany({ where: { origin: stagingOrigin(origin) } });
  return r.count;
}

/** Swaps the staged entries in for the live ones */
export async function promoteStaging(origin: string): Promise<number> {
  const staged = await db.dictionaryWord.count({ where: { origin: stagingOrigin(origin) } });
  if (staged === 0) throw new Error(`Nothing staged for ${origin}`);
  await db.dictionaryWord.deleteMany({ where: { origin } });
  const r = await db.dictionaryWord.updateMany({
    where: { origin: stagingOrigin(origin) },
    data: { origin },
  });
  return r.count;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface OriginStats {
  count: number;
  lastImported: Date | null;
}

export async function originStats(): Promise<Map<string, OriginStats>> {
  const raw = (await db.dictionaryWord.aggregateRaw({
    pipeline: [
      { $group: { _id: "$origin", n: { $sum: 1 }, last: { $max: "$createdAt" } } },
    ] as Prisma.InputJsonValue[],
  })) as unknown as Array<{ _id: string; n: number; last?: { $date: string } | string }>;
  const map = new Map<string, OriginStats>();
  for (const r of raw ?? []) {
    const last = r.last ? new Date(typeof r.last === "string" ? r.last : r.last.$date) : null;
    map.set(r._id, { count: r.n, lastImported: last });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Backup format (JSON lines)
// ---------------------------------------------------------------------------

export const BACKUP_TYPE = "devhub-dictionary-backup";
export const BACKUP_VERSION = 1;

export interface BackupHeader {
  type: typeof BACKUP_TYPE;
  version: number;
  exportedAt: string;
  origins: string[];
  includesSource: boolean;
}

/** Validates one backup line; returns an error message or null */
export function validateBackupEntry(e: any): string | null {
  if (!e || typeof e !== "object") return "not an object";
  if (typeof e.origin !== "string" || !/^[A-Z0-9_]{1,32}$/.test(e.origin)) return "bad origin";
  if (isStagingOrigin(e.origin)) return "staging origin";
  if (!Number.isInteger(e.wordIndex)) return "bad wordIndex";
  const isLV = (a: any) =>
    Array.isArray(a) &&
    a.every((x) => x && typeof x.language === "string" && typeof x.value === "string");
  if (!isLV(e.word) || e.word.length === 0) return "bad word";
  if (!isLV(e.description)) return "bad description";
  if (
    e.attributes !== undefined &&
    !(Array.isArray(e.attributes) &&
      e.attributes.every((x: any) => x && typeof x.key === "string" && typeof x.value === "string"))
  ) {
    return "bad attributes";
  }
  return null;
}
