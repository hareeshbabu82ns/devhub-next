/**
 * Dictionary sources: how each SQLite file in data/dict is read. Server only.
 *
 * Each dictionary has one main table. Every row is captured verbatim with a
 * stable key, so it can be found again on a later capture (to tell new,
 * changed and removed rows apart) and rebuilt at any time:
 *
 *   - Cologne (CDSL) tables have a unique `lnum`; that is the key.
 *   - Other tables (and CDSL-style tables whose lnum repeats, like Brown and
 *     Gwynn) use the SQLite rowid.
 *
 * Small companion tables (abbreviations, cited authorities, source notes) are
 * kept with the dictionary so nothing in the files is lost.
 */

import { createHash } from "crypto";
import { existsSync, statSync } from "fs";
import { resolve } from "path";
import Database from "better-sqlite3";
import config from "@/config";
import {
  DictionaryName,
  LEXICON_ALL_DICT,
  LEXICON_ALL_DICT_TO_DB_MAP,
} from "./dictionary-constants";

export const SQLITE_DIR = resolve(config.dataFolder, "dict");

export interface CompanionSpec {
  /** File in data/dict */
  file: string;
  table: string;
  /** What the table holds, shown to admins */
  role: "abbreviations" | "authorities" | "notes" | "index";
}

export interface SourceSpec {
  dict: DictionaryName;
  origin: string;
  file: string;
  table: string;
  /** Preferred key column; falls back to rowid if it is not unique */
  keyColumn: string | null;
  /** SQL ORDER BY expression giving dictionary order (rowid breaks ties) */
  orderBy: string;
  /** Column holding the headword */
  headwordColumn: string;
  companions: CompanionSpec[];
}

/** Companion tables bigger than this are not kept */
const MAX_COMPANION_ROWS = 5000;

function cdsl(dict: DictionaryName, companions: CompanionSpec[] = []): SourceSpec {
  return {
    dict,
    origin: originFor(dict),
    file: `${dict}.sqlite`,
    table: dict,
    keyColumn: "lnum",
    orderBy: "lnum",
    headwordColumn: "key",
    companions,
  };
}

const ab = (dict: string): CompanionSpec => ({
  file: `${dict}ab.sqlite`,
  table: `${dict}ab`,
  role: "abbreviations",
});
const auth = (dict: string): CompanionSpec => ({
  file: `${dict}authtooltips.sqlite`,
  table: `${dict}authtooltips`,
  role: "authorities",
});

const SPECIAL: Partial<Record<DictionaryName, SourceSpec>> = {
  mw: cdsl("mw", [
    ab("mw"),
    auth("mw"),
    { file: "westmwtab.sqlite", table: "westmwtab", role: "index" },
    { file: "whitmwtab.sqlite", table: "whitmwtab", role: "index" },
  ]),
  ap90: cdsl("ap90", [ab("ap90"), auth("ap90")]),
  ben: cdsl("ben", [ab("ben"), auth("ben")]),
  cae: cdsl("cae", [ab("cae")]),
  lan: cdsl("lan", [ab("lan")]),
  eng2te: {
    dict: "eng2te",
    origin: originFor("eng2te"),
    file: "eng2te.sqlite",
    table: "eng2te",
    keyColumn: null,
    orderBy: "eng_word COLLATE NOCASE",
    headwordColumn: "eng_word",
    companions: [],
  },
  eng2en: {
    dict: "eng2en",
    origin: originFor("eng2en"),
    file: "eng2en.sqlite",
    table: "entries",
    keyColumn: null,
    orderBy: "word COLLATE NOCASE",
    headwordColumn: "word",
    companions: [],
  },
  dhatu_pata: {
    dict: "dhatu_pata",
    origin: originFor("dhatu_pata"),
    file: "dhatu_pata.sqlite",
    table: "dictEntries",
    keyColumn: null,
    orderBy: "word",
    headwordColumn: "word",
    companions: [
      { file: "dhatu_pata.sqlite", table: "dictAbbs", role: "abbreviations" },
      { file: "dhatu_pata.sqlite", table: "dictOrigins", role: "notes" },
    ],
  },
  // lnum repeats in these, so rows are keyed by rowid
  brown_te: { ...cdsl("brown_te"), keyColumn: null },
  gwynn_te: { ...cdsl("gwynn_te"), keyColumn: null },
};

export function originFor(dict: DictionaryName): string {
  return LEXICON_ALL_DICT_TO_DB_MAP[dict] ?? dict.toUpperCase();
}

export function dictionaryForOrigin(origin: string): DictionaryName | null {
  return (
    ((LEXICON_ALL_DICT as readonly string[]).find(
      (d) => originFor(d as DictionaryName) === origin,
    ) as DictionaryName | undefined) ?? null
  );
}

export function sourceSpec(dict: DictionaryName): SourceSpec {
  return SPECIAL[dict] ?? cdsl(dict);
}

export function sqlitePathFor(dict: DictionaryName): string {
  return resolve(SQLITE_DIR, sourceSpec(dict).file);
}

/** Identifies one version of a source file (size + modification time) */
export function fileSignature(path: string): string | null {
  if (!existsSync(/*turbopackIgnore: true*/ path)) return null;
  const st = statSync(/*turbopackIgnore: true*/ path);
  return `${st.size}:${Math.floor(st.mtimeMs)}`;
}

// ---------------------------------------------------------------------------
// Opening and describing a source file
// ---------------------------------------------------------------------------

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function openSource(dict: DictionaryName, path = sqlitePathFor(dict)) {
  const spec = sourceSpec(dict);
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  const found = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE name = ? AND type IN ('table','view')")
    .get(spec.table);
  if (!found) {
    sqlite.close();
    throw new Error(`Table "${spec.table}" not found — is this the ${dict.toUpperCase()} file?`);
  }
  return { sqlite, spec };
}

export interface SourceFileInfo {
  exists: boolean;
  file: string;
  size?: number;
  modifiedAt?: Date;
  rows?: number;
  signature?: string;
  error?: string;
}

export function readSourceInfo(dict: DictionaryName, path = sqlitePathFor(dict)): SourceFileInfo {
  const file = sourceSpec(dict).file;
  if (!existsSync(/*turbopackIgnore: true*/ path)) return { exists: false, file };
  const st = statSync(/*turbopackIgnore: true*/ path);
  const base = {
    exists: true,
    file,
    size: st.size,
    modifiedAt: st.mtime,
    signature: `${st.size}:${Math.floor(st.mtimeMs)}`,
  };
  try {
    const { sqlite, spec } = openSource(dict, path);
    try {
      const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${quoteIdent(spec.table)}`).get() as {
        n: number;
      };
      return { ...base, rows: row.n };
    } finally {
      sqlite.close();
    }
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface SourceLayout {
  table: string;
  columns: string[];
  /** Column used as key, or "rowid" */
  keyColumn: string;
  orderBy: string;
  headwordColumn: string;
}

/** Works out the columns and the key actually usable in this file */
export function sourceLayout(sqlite: Database.Database, spec: SourceSpec): SourceLayout {
  const columns = (
    sqlite.prepare(`PRAGMA table_info(${quoteIdent(spec.table)})`).all() as { name: string }[]
  ).map((c) => c.name);
  if (!columns.includes(spec.headwordColumn)) {
    throw new Error(`Column "${spec.headwordColumn}" not found in ${spec.table}`);
  }
  let keyColumn = "rowid";
  if (spec.keyColumn && columns.includes(spec.keyColumn)) {
    const k = quoteIdent(spec.keyColumn);
    const r = sqlite
      .prepare(
        `SELECT COUNT(*) AS n, COUNT(DISTINCT ${k}) AS d, SUM(${k} IS NULL) AS z FROM ${quoteIdent(spec.table)}`,
      )
      .get() as { n: number; d: number; z: number | null };
    if (r.n === r.d && !r.z) keyColumn = spec.keyColumn;
  }
  const orderBy = columns.some((c) => spec.orderBy.startsWith(c)) ? spec.orderBy : "rowid";
  return { table: spec.table, columns, keyColumn, orderBy, headwordColumn: spec.headwordColumn };
}

// ---------------------------------------------------------------------------
// Reading original rows
// ---------------------------------------------------------------------------

export type SourceRow = Record<string, string | number | null>;

export interface RawRow {
  key: string;
  seq: number;
  rowid: number;
  headword: string;
  /** Every column, untouched */
  row: SourceRow;
  hash: string;
}

export function hashRow(row: SourceRow): string {
  return createHash("sha1").update(JSON.stringify(row)).digest("hex");
}

function keyToString(value: unknown): string {
  if (typeof value === "number") return String(value);
  return String(value ?? "");
}

/**
 * Reads one batch of rows in dictionary order. `seq` is the row's 1-based
 * position, so consecutive batches number the whole dictionary.
 */
export function readRawBatch(
  dict: DictionaryName,
  offset: number,
  size: number,
): { rows: RawRow[]; layout: SourceLayout } {
  const { sqlite, spec } = openSource(dict);
  try {
    const layout = sourceLayout(sqlite, spec);
    const rows = sqlite
      .prepare(
        `SELECT rowid AS "__rowid", * FROM ${quoteIdent(layout.table)} ORDER BY ${layout.orderBy}, rowid LIMIT ? OFFSET ?`,
      )
      .all(size, offset) as Array<SourceRow & { __rowid: number }>;
    return {
      layout,
      rows: rows.map((r, i) => {
        const { __rowid, ...rest } = r;
        // Keep the table's own column order (and only its columns)
        const row: SourceRow = {};
        for (const c of layout.columns) row[c] = rest[c] ?? null;
        return {
          key: layout.keyColumn === "rowid" ? String(__rowid) : keyToString(row[layout.keyColumn]),
          seq: offset + i + 1,
          rowid: __rowid,
          headword: String(row[layout.headwordColumn] ?? "").normalize("NFC").trim(),
          row,
          hash: hashRow(row),
        };
      }),
    };
  } finally {
    sqlite.close();
  }
}

export interface CompanionTable {
  role: CompanionSpec["role"];
  file: string;
  table: string;
  columns: string[];
  rows: SourceRow[];
}

/** Reads the dictionary's companion tables that are present in data/dict */
export function readCompanions(dict: DictionaryName): {
  tables: CompanionTable[];
  missing: string[];
} {
  const tables: CompanionTable[] = [];
  const missing: string[] = [];
  for (const c of sourceSpec(dict).companions) {
    const path = resolve(SQLITE_DIR, c.file);
    if (!existsSync(/*turbopackIgnore: true*/ path)) {
      missing.push(c.file);
      continue;
    }
    const sqlite = new Database(path, { readonly: true, fileMustExist: true });
    try {
      const exists = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE name = ? AND type = 'table'")
        .get(c.table);
      if (!exists) {
        missing.push(`${c.file}:${c.table}`);
        continue;
      }
      const n = (
        sqlite.prepare(`SELECT COUNT(*) AS n FROM ${quoteIdent(c.table)}`).get() as { n: number }
      ).n;
      if (n > MAX_COMPANION_ROWS) continue;
      const columns = (
        sqlite.prepare(`PRAGMA table_info(${quoteIdent(c.table)})`).all() as { name: string }[]
      ).map((x) => x.name);
      const rows = sqlite
        .prepare(`SELECT * FROM ${quoteIdent(c.table)} ORDER BY rowid`)
        .all() as SourceRow[];
      tables.push({ role: c.role, file: c.file, table: c.table, columns, rows });
    } finally {
      sqlite.close();
    }
  }
  return { tables, missing };
}
