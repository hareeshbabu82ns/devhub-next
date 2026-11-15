/**
 * Dictionary pipeline. Server only.
 *
 *   source file ──capture──▶ DictRawEntries ──build──▶ DictWords
 *   (SQLite)                 originals, verbatim       search entries
 *
 * Capture copies every row of a dictionary's source table, untouched, keyed
 * by a stable key (lnum or rowid). Running it again is cheap and safe: rows
 * are compared by hash, so it reports what was added, changed and removed,
 * and only writes those.
 *
 * Build turns originals into search entries with the current processor
 * (see DICTIONARY_PROCESSOR_VERSION). It never needs the source file, so a
 * dictionary can be rebuilt any time the processing rules change. New
 * entries are written under a staging origin ("__import__MW") and swapped in
 * only when complete; the old entries are parked ("__old__MW") until the
 * swap has finished, so an interrupted swap can be undone. Entries edited or
 * added by hand (editedAt set) are kept.
 *
 * Every lookup ignores origins starting with "__".
 */

import { randomUUID } from "crypto";
import { Prisma } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import sanscript from "@indic-transliteration/sanscript";
import { DictionaryName, LEXICON_ALL_DICT } from "./dictionary-constants";
import {
  BuiltDictionaryEntry,
  DICTIONARY_PROCESSOR_VERSION,
  SqliteRowData,
  buildEntryFromRaw,
} from "./dictionary-processor";
import {
  RawRow,
  SourceRow,
  dictionaryForOrigin,
  fileSignature,
  hashRow,
  openSource,
  originFor,
  readCompanions,
  readRawBatch,
  readSourceInfo,
  sourceLayout,
  sourceSpec,
  sqlitePathFor,
} from "./dictionary-sources";

export { dictionaryForOrigin, originFor } from "./dictionary-sources";

export const STAGING_PREFIX = "__import__";
export const PARKED_PREFIX = "__old__";
export const stagingOrigin = (origin: string) => `${STAGING_PREFIX}${origin}`;
export const parkedOrigin = (origin: string) => `${PARKED_PREFIX}${origin}`;
export const isInternalOrigin = (origin: string) => origin.startsWith("__");

export const ORIGIN_PATTERN = /^[A-Z0-9_]{1,32}$/;

const WORDS = "DictWords";
const RAW = "DictRawEntries";

type Json = Prisma.InputJsonValue;

async function command(cmd: Record<string, unknown>): Promise<Record<string, any>> {
  const r = (await db.$runCommandRaw(cmd as Prisma.InputJsonObject)) as Record<string, any>;
  const errs = r?.writeErrors as Array<{ errmsg?: string }> | undefined;
  if (errs?.length) throw new Error(errs[0]?.errmsg ?? "Database write failed");
  return r;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function requireDictionary(origin: string): DictionaryName {
  const dict = dictionaryForOrigin(origin);
  if (!dict) throw new Error(`${origin} has no processor; it can only be exported or deleted`);
  return dict;
}

// ---------------------------------------------------------------------------
// Originals
// ---------------------------------------------------------------------------

export interface RawWriteInput {
  key: string;
  seq: number;
  rowid?: number | null;
  headword: string;
  row: SourceRow;
  hash?: string;
}

export interface RawWriteResult {
  added: number;
  changed: number;
  unchanged: number;
}

/**
 * Upserts original rows. Unchanged rows (same hash) only get their position
 * and run id refreshed, so a re-capture of an unchanged file writes little.
 */
export async function writeRawRows(
  origin: string,
  rows: RawWriteInput[],
  runId: string,
): Promise<RawWriteResult> {
  const result: RawWriteResult = { added: 0, changed: 0, unchanged: 0 };
  if (rows.length === 0) return result;
  for (const part of chunks(rows, 1000)) {
    const existing = await db.dictionaryRawEntry.findMany({
      where: { origin, key: { in: part.map((r) => r.key) } },
      select: { key: true, hash: true },
    });
    const have = new Map(existing.map((e) => [e.key, e.hash]));
    const updates = part.map((r) => {
      const hash = r.hash ?? hashRow(r.row);
      const prev = have.get(r.key);
      if (prev === hash) {
        result.unchanged++;
        return { q: { origin, key: r.key }, u: { $set: { seq: r.seq, runId } } };
      }
      if (prev === undefined) result.added++;
      else result.changed++;
      return {
        q: { origin, key: r.key },
        u: {
          $set: {
            origin,
            key: r.key,
            seq: r.seq,
            rowid: r.rowid ?? null,
            headword: r.headword,
            row: r.row,
            hash,
            runId,
          },
          $currentDate: { importedAt: true },
        },
        upsert: true,
      };
    });
    await command({ update: RAW, updates, ordered: false });
  }
  return result;
}

export interface CaptureBegin {
  runId: string;
  total: number;
  sourceRows: number;
  signature: string;
  keyColumn: string;
}

/** Prepares a capture from the dictionary's SQLite file */
export async function beginCapture(
  dict: DictionaryName,
  opts: { limitRows?: number } = {},
): Promise<CaptureBegin> {
  const info = readSourceInfo(dict);
  if (!info.exists) throw new Error("Upload the SQLite file first");
  if (info.error || info.rows === undefined || !info.signature) {
    throw new Error(info.error ?? "Cannot read the SQLite file");
  }
  const { sqlite, spec } = openSource(dict);
  let layout;
  try {
    layout = sourceLayout(sqlite, spec);
  } finally {
    sqlite.close();
  }
  const companions = readCompanions(dict);
  const origin = originFor(dict);
  const data = {
    sourceFile: spec.file,
    sourceTable: layout.table,
    columns: layout.columns,
    keyColumn: layout.keyColumn,
    extras: {
      orderBy: layout.orderBy,
      headwordColumn: layout.headwordColumn,
      companions: companions.tables,
      missingCompanions: companions.missing,
    } as unknown as Json,
    lastError: null,
  };
  await db.dictionarySource.upsert({
    where: { origin },
    create: { origin, ...data },
    update: data,
  });
  const total = opts.limitRows ? Math.min(opts.limitRows, info.rows) : info.rows;
  return {
    runId: randomUUID(),
    total,
    sourceRows: info.rows,
    signature: info.signature,
    keyColumn: layout.keyColumn,
  };
}

export interface CaptureBatchResult extends RawWriteResult {
  read: number;
}

export async function captureBatch(
  dict: DictionaryName,
  runId: string,
  offset: number,
  size: number,
  signature: string,
): Promise<CaptureBatchResult> {
  if (fileSignature(sqlitePathFor(dict)) !== signature) {
    throw new Error("The source file changed during the capture — start it again");
  }
  const { rows } = readRawBatch(dict, offset, size);
  const r = await writeRawRows(originFor(dict), rows as RawRow[], runId);
  return { read: rows.length, ...r };
}

/**
 * Ends a capture. A complete capture removes originals the source no longer
 * has (rows this run did not see); a partial one (row limit) keeps them.
 */
export async function finishCapture(
  origin: string,
  runId: string,
  opts: { complete: boolean; signature?: string | null; sourceFile?: string },
): Promise<{ removed: number; rawCount: number }> {
  let removed = 0;
  if (opts.complete) {
    const r = await command({
      delete: RAW,
      deletes: [{ q: { origin, runId: { $ne: runId } }, limit: 0 }],
    });
    removed = Number(r?.n ?? 0);
  }
  const rawCount = await db.dictionaryRawEntry.count({ where: { origin } });
  await db.dictionarySource.upsert({
    where: { origin },
    create: {
      origin,
      rawCount,
      capturedAt: new Date(),
      sourceSignature: opts.signature ?? null,
      sourceFile: opts.sourceFile,
    },
    update: {
      rawCount,
      capturedAt: new Date(),
      sourceSignature: opts.signature ?? null,
      ...(opts.sourceFile ? { sourceFile: opts.sourceFile } : {}),
      lastError: null,
    },
  });
  return { removed, rawCount };
}

// --- Capturing from entries imported by the old importer ------------------

export const FROM_ENTRIES = "(existing entries)";

/**
 * Entries imported before originals were kept hold their source row in
 * sourceData.data. This copies those rows into the originals, so such a
 * dictionary can be rebuilt without its SQLite file.
 */
export async function beginAdopt(origin: string): Promise<{ runId: string; total: number }> {
  const total = await db.dictionaryWord.count({ where: { origin } });
  if (total === 0) throw new Error("There are no entries to take originals from");
  return { runId: randomUUID(), total };
}

export async function adoptBatch(
  origin: string,
  runId: string,
  afterWordIndex: number,
  size: number,
): Promise<CaptureBatchResult & { skipped: number; last: number }> {
  const dict = dictionaryForOrigin(origin);
  const spec = dict ? sourceSpec(dict) : null;
  const words = await db.dictionaryWord.findMany({
    where: { origin, wordIndex: { gt: afterWordIndex } },
    orderBy: { wordIndex: "asc" },
    take: size,
    select: { wordIndex: true, sourceData: true, word: true },
  });
  const rows: RawWriteInput[] = [];
  let skipped = 0;
  let columns: string[] | null = null;
  for (const w of words) {
    const data = (w.sourceData as { data?: SourceRow } | null)?.data;
    if (!data || typeof data !== "object") {
      skipped++;
      continue;
    }
    columns ??= Object.keys(data);
    const keyValue = spec?.keyColumn ? data[spec.keyColumn] : null;
    rows.push({
      key: keyValue !== null && keyValue !== undefined ? String(keyValue) : `wi:${w.wordIndex}`,
      seq: w.wordIndex,
      headword: String(
        (spec ? data[spec.headwordColumn] : null) ?? w.word[0]?.value ?? "",
      ).normalize("NFC"),
      row: data,
    });
  }
  if (columns && words.length > 0 && afterWordIndex === 0) {
    await db.dictionarySource.upsert({
      where: { origin },
      create: {
        origin,
        sourceFile: FROM_ENTRIES,
        sourceTable: spec?.table,
        columns,
        keyColumn: spec?.keyColumn ?? "wordIndex",
      },
      update: { sourceFile: FROM_ENTRIES, sourceTable: spec?.table, columns },
    });
  }
  const r = await writeRawRows(origin, rows, runId);
  return {
    read: words.length,
    skipped,
    last: words.length ? words[words.length - 1].wordIndex : afterWordIndex,
    ...r,
  };
}

// ---------------------------------------------------------------------------
// Building search entries
// ---------------------------------------------------------------------------

async function sourceLayoutFor(origin: string, sample?: SourceRow) {
  const src = await db.dictionarySource.findUnique({ where: { origin } });
  const dict = requireDictionary(origin);
  return {
    table: src?.sourceTable ?? sourceSpec(dict).table,
    columns: src?.columns?.length ? src.columns : Object.keys(sample ?? {}),
  };
}

function entryData(e: BuiltDictionaryEntry, origin: string, now: Date) {
  return {
    origin,
    wordIndex: e.wordIndex,
    wordLnum: e.wordLnum,
    word: e.word,
    description: e.description,
    attributes: e.attributes,
    phonetic: e.phonetic,
    searchText: e.searchText,
    sourceKey: e.sourceKey,
    sourceData: e.sourceData as Json,
    processorVersion: e.processorVersion,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * A swap that stopped after parking the old entries but before moving the
 * new ones in leaves the dictionary empty; put the old entries back.
 */
export async function recoverInterruptedSwap(origin: string): Promise<number> {
  const parked = await db.dictionaryWord.count({ where: { origin: parkedOrigin(origin) } });
  if (parked === 0) return 0;
  const live = await db.dictionaryWord.count({ where: { origin } });
  if (live > 0) {
    // The swap got through; only the clean-up was missed
    await db.dictionaryWord.deleteMany({ where: { origin: parkedOrigin(origin) } });
    return 0;
  }
  const r = await db.dictionaryWord.updateMany({
    where: { origin: parkedOrigin(origin) },
    data: { origin },
  });
  return r.count;
}

/** Position in dictionary order: originals sort by seq, then key */
export interface BuildCursor {
  seq: number;
  key: string;
}

export interface BuildBegin {
  total: number;
  /** Continue after this original (null = from the start) */
  cursor: BuildCursor | null;
  /** wordIndex the next built entry gets */
  nextIndex: number;
  /** Rows already built when resuming */
  done: number;
}

export async function beginBuild(
  origin: string,
  opts: { resume?: boolean } = {},
): Promise<BuildBegin> {
  requireDictionary(origin);
  await recoverInterruptedSwap(origin);
  const total = await db.dictionaryRawEntry.count({ where: { origin } });
  if (total === 0) throw new Error("Capture the originals first");
  const staging = stagingOrigin(origin);
  if (opts.resume) {
    const last = await db.dictionaryWord.findFirst({
      where: { origin: staging },
      orderBy: { wordIndex: "desc" },
      select: { wordIndex: true, sourceKey: true },
    });
    const raw = last?.sourceKey
      ? await db.dictionaryRawEntry.findUnique({
          where: { origin_key: { origin, key: last.sourceKey } },
          select: { seq: true, key: true },
        })
      : null;
    if (last && raw) {
      const done = await db.dictionaryRawEntry.count({
        where: {
          origin,
          OR: [{ seq: { lt: raw.seq } }, { seq: raw.seq, key: { lte: raw.key } }],
        },
      });
      return { total, cursor: raw, nextIndex: last.wordIndex + 1, done };
    }
  }
  await db.dictionaryWord.deleteMany({ where: { origin: staging } });
  return { total, cursor: null, nextIndex: 1, done: 0 };
}

export interface BuildBatchResult {
  read: number;
  written: number;
  failed: number;
  errors: string[];
  cursor: BuildCursor | null;
  nextIndex: number;
}

/**
 * Builds the next batch of originals into staged entries. Entries are
 * numbered here (wordIndex = position in dictionary order), so originals
 * that share a seq — e.g. after merging a backup — still get distinct places.
 */
export async function buildBatch(
  origin: string,
  cursor: BuildCursor | null,
  nextIndex: number,
  size: number,
): Promise<BuildBatchResult> {
  const dict = requireDictionary(origin);
  const raws = await db.dictionaryRawEntry.findMany({
    where: cursor
      ? {
          origin,
          OR: [{ seq: { gt: cursor.seq } }, { seq: cursor.seq, key: { gt: cursor.key } }],
        }
      : { origin },
    orderBy: [{ seq: "asc" }, { key: "asc" }],
    take: size,
    select: { key: true, seq: true, row: true },
  });
  if (raws.length === 0) {
    return { read: 0, written: 0, failed: 0, errors: [], cursor, nextIndex };
  }
  const layout = await sourceLayoutFor(origin, raws[0].row as SourceRow);
  const now = new Date();
  const staging = stagingOrigin(origin);
  const docs: ReturnType<typeof entryData>[] = [];
  const errors: string[] = [];
  let failed = 0;
  let index = nextIndex;
  for (const r of raws) {
    try {
      const built = buildEntryFromRaw(
        dict,
        { key: r.key, seq: index, row: r.row as SqliteRowData },
        layout,
      );
      docs.push(entryData(built, staging, now));
      index++;
    } catch (e) {
      failed++;
      if (errors.length < 20) {
        errors.push(`${r.key}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  if (docs.length) await db.dictionaryWord.createMany({ data: docs });
  const lastRaw = raws[raws.length - 1];
  return {
    read: raws.length,
    written: docs.length,
    failed,
    errors,
    cursor: { seq: lastRaw.seq, key: lastRaw.key },
    nextIndex: index,
  };
}

export interface BuildFinish {
  entryCount: number;
  kept: number;
}

/**
 * Swaps the staged entries in. Hand-edited entries stay (their freshly built
 * twin is dropped); everything else is parked, replaced, then deleted.
 */
export async function finishBuild(
  origin: string,
  opts: {
    keepEdits?: boolean;
    /** false when the staged entries came from a backup, not a build */
    markBuilt?: boolean;
  } = {},
): Promise<BuildFinish> {
  const keepEdits = opts.keepEdits ?? true;
  const markBuilt = opts.markBuilt ?? true;
  const staging = stagingOrigin(origin);
  const parked = parkedOrigin(origin);
  const staged = await db.dictionaryWord.count({ where: { origin: staging } });
  if (staged === 0) throw new Error(`Nothing was built for ${origin}`);

  // Leftovers of an earlier swap would collide with this one
  await db.dictionaryWord.deleteMany({ where: { origin: parked } });

  const kept = keepEdits
    ? await db.dictionaryWord.findMany({
        where: { origin, editedAt: { not: null } },
        select: { id: true, sourceKey: true },
      })
    : [];

  if (kept.length > 0) {
    const keys = [...new Set(kept.map((k) => k.sourceKey).filter((k): k is string => !!k))];
    // Each kept entry takes the place its freshly built twin was given
    const slots = new Map<string, number>();
    for (const part of chunks(keys, 1000)) {
      const twins = await db.dictionaryWord.findMany({
        where: { origin: staging, sourceKey: { in: part } },
        select: { sourceKey: true, wordIndex: true },
      });
      for (const t of twins) if (t.sourceKey) slots.set(t.sourceKey, t.wordIndex);
      await db.dictionaryWord.deleteMany({ where: { origin: staging, sourceKey: { in: part } } });
    }
    // Hand-added entries (and any whose original is gone) go last
    const lastStaged = await db.dictionaryWord.findFirst({
      where: { origin: staging },
      orderBy: { wordIndex: "desc" },
      select: { wordIndex: true },
    });
    let next = Math.max(lastStaged?.wordIndex ?? 0, ...slots.values(), 0);
    const targets = kept.map((k) => {
      const slot = k.sourceKey ? slots.get(k.sourceKey) : undefined;
      if (slot !== undefined) slots.delete(k.sourceKey!); // one entry per slot
      return { id: k.id, wordIndex: slot ?? ++next };
    });
    // Park everything that is not kept
    await command({
      update: WORDS,
      updates: [{ q: { origin, editedAt: null }, u: { $set: { origin: parked } }, multi: true }],
    });
    // Two steps so kept entries never collide with each other
    for (const [i, t] of targets.entries()) {
      await db.dictionaryWord.update({ where: { id: t.id }, data: { wordIndex: -(i + 1) } });
    }
    for (const t of targets) {
      await db.dictionaryWord.update({ where: { id: t.id }, data: { wordIndex: t.wordIndex } });
    }
  } else {
    await db.dictionaryWord.updateMany({ where: { origin }, data: { origin: parked } });
  }

  await db.dictionaryWord.updateMany({ where: { origin: staging }, data: { origin } });
  await db.dictionaryWord.deleteMany({ where: { origin: parked } });

  const entryCount = await db.dictionaryWord.count({ where: { origin } });
  const built = markBuilt
    ? { builtAt: new Date(), builtVersion: DICTIONARY_PROCESSOR_VERSION }
    : { builtAt: null, builtVersion: null };
  await db.dictionarySource.upsert({
    where: { origin },
    create: { origin, entryCount, ...built },
    update: { entryCount, ...built, lastError: null },
  });
  return { entryCount, kept: kept.length };
}

export async function discardStaging(origin: string): Promise<number> {
  const r = await db.dictionaryWord.deleteMany({ where: { origin: stagingOrigin(origin) } });
  return r.count;
}

/** Rebuilds one entry from its original (or, for old imports, its sourceData) */
export async function rebuildEntry(id: string): Promise<boolean> {
  const entry = await db.dictionaryWord.findUnique({
    where: { id },
    select: { id: true, origin: true, wordIndex: true, sourceKey: true, sourceData: true },
  });
  if (!entry) throw new Error("Entry not found");
  const dict = requireDictionary(entry.origin);
  let built: BuiltDictionaryEntry | null = null;
  let legacy = false;
  if (entry.sourceKey) {
    const raw = await db.dictionaryRawEntry.findUnique({
      where: { origin_key: { origin: entry.origin, key: entry.sourceKey } },
    });
    if (raw) {
      const layout = await sourceLayoutFor(entry.origin, raw.row as SourceRow);
      built = buildEntryFromRaw(
        dict,
        { key: raw.key, seq: entry.wordIndex, row: raw.row as SqliteRowData },
        layout,
      );
    }
  }
  if (!built) {
    const data = (entry.sourceData as { data?: SourceRow } | null)?.data;
    if (!data) throw new Error("This entry has no original to rebuild from");
    legacy = true;
    built = buildEntryFromRaw(
      dict,
      { key: entry.sourceKey ?? `wi:${entry.wordIndex}`, seq: entry.wordIndex, row: data },
      { table: sourceSpec(dict).table, columns: Object.keys(data) },
    );
  }
  await db.dictionaryWord.update({
    where: { id },
    data: {
      word: built.word,
      description: built.description,
      attributes: built.attributes,
      phonetic: built.phonetic,
      searchText: built.searchText,
      wordLnum: built.wordLnum,
      processorVersion: built.processorVersion,
      editedAt: null,
      // Old imports keep their full source row: it is their only original
      ...(legacy
        ? {}
        : { sourceKey: built.sourceKey, sourceData: built.sourceData as Json }),
    },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Removing
// ---------------------------------------------------------------------------

export async function deleteEntries(origin: string): Promise<number> {
  const r = await db.dictionaryWord.deleteMany({ where: { origin } });
  await db.dictionaryWord.deleteMany({
    where: { origin: { in: [stagingOrigin(origin), parkedOrigin(origin)] } },
  });
  await db.dictionarySource.updateMany({
    where: { origin },
    data: { entryCount: 0, builtAt: null, builtVersion: null },
  });
  return r.count;
}

export async function deleteOriginals(origin: string): Promise<number> {
  const r = await command({ delete: RAW, deletes: [{ q: { origin }, limit: 0 }] });
  await db.dictionarySource.deleteMany({ where: { origin } });
  return Number(r?.n ?? 0);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface CompanionSummary {
  table: string;
  role: string;
  rows: number;
}

export interface PipelineRow {
  dictionary: DictionaryName | null;
  origin: string;
  file: {
    exists: boolean;
    file: string;
    size?: number;
    modifiedAt?: string;
    rows?: number;
    error?: string;
  } | null;
  originals: {
    count: number;
    capturedAt: string | null;
    sourceFile: string | null;
    keyColumn: string | null;
    /** The source file differs from the one captured */
    sourceChanged: boolean;
    companions: CompanionSummary[];
  };
  entries: {
    count: number;
    staged: number;
    parked: number;
    /** Entries built from originals (the rest are old imports) */
    linked: number;
    builtAt: string | null;
    builtVersion: number | null;
    outdated: boolean;
  };
  lastError: string | null;
}

export interface IndexStatus {
  ok: boolean;
  missing: string[];
  /** A full-text index other than ours blocks creating it */
  conflicting: string[];
}

const WORD_INDEXES: Array<{ name: string; key: Record<string, unknown>; [k: string]: unknown }> = [
  { name: "origin_wordIndex_asc_idx", key: { origin: 1, wordIndex: 1 } },
  { name: "origin_sourceKey_idx", key: { origin: 1, sourceKey: 1 } },
  { name: "word_value_idx", key: { "word.value": 1 } },
  { name: "dict_fulltext_idx", key: { phonetic: "text", searchText: "text" } },
];

const RAW_INDEXES: Array<{ name: string; key: Record<string, unknown>; [k: string]: unknown }> = [
  { name: "raw_origin_key_uq", key: { origin: 1, key: 1 }, unique: true },
  { name: "raw_origin_seq_idx", key: { origin: 1, seq: 1, key: 1 } },
  { name: "raw_origin_headword_idx", key: { origin: 1, headword: 1 } },
  { name: "raw_origin_run_idx", key: { origin: 1, runId: 1 } },
];

async function listIndexes(collection: string): Promise<Array<{ name: string; key: any }>> {
  try {
    const r = await db.$runCommandRaw({ listIndexes: collection });
    return ((r as any)?.cursor?.firstBatch ?? []) as Array<{ name: string; key: any }>;
  } catch {
    return []; // collection does not exist yet
  }
}

export async function indexStatus(): Promise<IndexStatus> {
  const [words, raw] = await Promise.all([listIndexes(WORDS), listIndexes(RAW)]);
  const wordNames = new Set(words.map((i) => i.name));
  const rawNames = new Set(raw.map((i) => i.name));
  const missing = [
    ...WORD_INDEXES.filter((i) => !wordNames.has(i.name)).map((i) => `${WORDS}.${i.name}`),
    ...RAW_INDEXES.filter((i) => !rawNames.has(i.name)).map((i) => `${RAW}.${i.name}`),
  ];
  const conflicting = words
    .filter((i) => i.key?._fts === "text" && i.name !== "dict_fulltext_idx")
    .map((i) => i.name);
  return { ok: missing.length === 0 && conflicting.length === 0, missing, conflicting };
}

/**
 * Creates the indexes the pipeline and lookups rely on. A collection has
 * room for one full-text index, so an older one is dropped first. Building
 * the full-text index over every entry can take several minutes.
 */
export async function ensureIndexes(): Promise<IndexStatus> {
  const status = await indexStatus();
  for (const name of status.conflicting) {
    await db.$runCommandRaw({ dropIndexes: WORDS, index: name });
  }
  const words = new Set((await listIndexes(WORDS)).map((i) => i.name));
  const wantWords = WORD_INDEXES.filter((i) => !words.has(i.name));
  if (wantWords.length) {
    await db.$runCommandRaw({ createIndexes: WORDS, indexes: wantWords as Json[] });
  }
  const raw = new Set((await listIndexes(RAW)).map((i) => i.name));
  const wantRaw = RAW_INDEXES.filter((i) => !raw.has(i.name));
  if (wantRaw.length) {
    await db.$runCommandRaw({ createIndexes: RAW, indexes: wantRaw as Json[] });
  }
  return indexStatus();
}

async function distinctOrigins(collection: string): Promise<string[]> {
  try {
    const r = await db.$runCommandRaw({ distinct: collection, key: "origin" });
    return ((r as any)?.values ?? []) as string[];
  } catch {
    return [];
  }
}

function companionSummary(extras: unknown): CompanionSummary[] {
  const tables = (extras as { companions?: Array<{ table: string; role: string; rows: unknown[] }> })
    ?.companions;
  return (tables ?? []).map((t) => ({ table: t.table, role: t.role, rows: t.rows?.length ?? 0 }));
}

export async function pipelineOverview(): Promise<PipelineRow[]> {
  const [wordOrigins, rawOrigins, sources] = await Promise.all([
    distinctOrigins(WORDS),
    distinctOrigins(RAW),
    db.dictionarySource.findMany(),
  ]);
  const sourceByOrigin = new Map(sources.map((s) => [s.origin, s]));
  const origins = new Set<string>(LEXICON_ALL_DICT.map((d) => originFor(d)));
  for (const o of [...wordOrigins, ...rawOrigins, ...sources.map((s) => s.origin)]) {
    const base = o.replace(/^__(import|old)__/, "");
    if (ORIGIN_PATTERN.test(base)) origins.add(base);
  }

  const rows = await Promise.all(
    [...origins].map(async (origin): Promise<PipelineRow> => {
      const dict = dictionaryForOrigin(origin);
      const src = sourceByOrigin.get(origin);
      const [count, staged, parked, linked, rawCount] = await Promise.all([
        db.dictionaryWord.count({ where: { origin } }),
        db.dictionaryWord.count({ where: { origin: stagingOrigin(origin) } }),
        db.dictionaryWord.count({ where: { origin: parkedOrigin(origin) } }),
        db.dictionaryWord.count({ where: { origin, sourceKey: { gt: "" } } }),
        db.dictionaryRawEntry.count({ where: { origin } }),
      ]);
      const info = dict ? readSourceInfo(dict) : null;
      const capturedFromFile = !!src?.sourceSignature && src.sourceFile !== FROM_ENTRIES;
      return {
        dictionary: dict,
        origin,
        file: info
          ? {
              exists: info.exists,
              file: info.file,
              size: info.size,
              modifiedAt: info.modifiedAt?.toISOString(),
              rows: info.rows,
              error: info.error,
            }
          : null,
        originals: {
          count: rawCount,
          capturedAt: src?.capturedAt?.toISOString() ?? null,
          sourceFile: src?.sourceFile ?? null,
          keyColumn: src?.keyColumn ?? null,
          sourceChanged:
            capturedFromFile && !!info?.signature && info.signature !== src!.sourceSignature,
          companions: companionSummary(src?.extras),
        },
        entries: {
          count,
          staged,
          parked,
          linked,
          builtAt: src?.builtAt?.toISOString() ?? null,
          builtVersion: src?.builtVersion ?? null,
          // Old imports (no link to originals) or an older processor
          outdated:
            count > 0 &&
            (linked === 0 || (src?.builtVersion ?? 0) < DICTIONARY_PROCESSOR_VERSION),
        },
        lastError: src?.lastError ?? null,
      };
    }),
  );
  return rows.sort((a, b) => {
    // Known dictionaries in catalog order, then the rest
    const ia = a.dictionary ? LEXICON_ALL_DICT.indexOf(a.dictionary) : 999;
    const ib = b.dictionary ? LEXICON_ALL_DICT.indexOf(b.dictionary) : 999;
    return ia - ib || a.origin.localeCompare(b.origin);
  });
}

export async function recordError(origin: string, message: string): Promise<void> {
  await db.dictionarySource
    .upsert({
      where: { origin },
      create: { origin, lastError: message.slice(0, 500) },
      update: { lastError: message.slice(0, 500) },
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Inspecting originals
// ---------------------------------------------------------------------------

export type RawSearchField = "headword" | "key" | "text";

export interface RawSearchItem {
  key: string;
  seq: number;
  headword: string;
  preview: string;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
}

function safeT(text: string, from: string, to: string): string {
  try {
    return sanscript.t(text, from, to);
  } catch {
    return "";
  }
}

/** The query in the scripts source headwords may be written in */
function headwordForms(q: string): string[] {
  const forms = new Set([q]);
  if (/[ऀ-ॿ]/.test(q)) {
    forms.add(safeT(q, "devanagari", "slp1"));
    forms.add(safeT(q, "devanagari", "iast"));
  } else if (/[ఀ-౿]/.test(q)) {
    forms.add(safeT(q, "telugu", "devanagari"));
    forms.add(safeT(q, "telugu", "slp1"));
  } else if (/[āīūṛṝḷṃḥṅñṭḍṇśṣ]/i.test(q)) {
    forms.add(safeT(q.toLowerCase(), "iast", "slp1"));
    forms.add(safeT(q.toLowerCase(), "iast", "devanagari"));
  } else if (/^[\x20-\x7E]+$/.test(q)) {
    forms.add(safeT(q, "itrans", "slp1"));
    forms.add(safeT(q, "itrans", "devanagari"));
    forms.add(safeT(q, "itrans", "telugu"));
  }
  return [...forms].filter(Boolean);
}

function previewOf(row: Record<string, unknown>, headwordColumn?: string): string {
  const longest = Object.entries(row)
    .filter(([k, v]) => k !== headwordColumn && typeof v === "string")
    .map(([, v]) => v as string)
    .sort((a, b) => b.length - a.length)[0];
  return (longest ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export async function searchOriginals(
  origin: string,
  opts: { query: string; field: RawSearchField; afterSeq?: number; limit?: number },
): Promise<{ items: RawSearchItem[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const q = opts.query.normalize("NFC").trim().slice(0, 100);
  const src = await db.dictionarySource.findUnique({ where: { origin } });
  const headwordColumn = (src?.extras as { headwordColumn?: string } | null)?.headwordColumn;
  const match: Record<string, unknown> = { origin };
  if (opts.afterSeq) match.seq = { $gt: opts.afterSeq };
  if (q) {
    if (opts.field === "key") {
      match.key = q;
    } else if (opts.field === "headword") {
      match.$or = headwordForms(q).map((f) => ({ headword: { $regex: `^${escapeRegex(f)}` } }));
    } else {
      const columns = src?.columns?.length ? src.columns : ["data"];
      const forms = headwordForms(q);
      match.$or = columns.flatMap((c) =>
        forms.map((f) => ({ [`row.${c}`]: { $regex: escapeRegex(f), $options: "i" } })),
      );
    }
  }
  const raw = (await db.dictionaryRawEntry.aggregateRaw({
    pipeline: [
      { $match: match },
      { $sort: { seq: 1 } },
      { $limit: limit + 1 },
      { $project: { key: 1, seq: 1, headword: 1, row: 1 } },
    ] as Json[],
  })) as unknown as Array<{ key: string; seq: number; headword: string; row: Record<string, unknown> }>;
  const items = (raw ?? []).slice(0, limit).map((r) => ({
    key: r.key,
    seq: r.seq,
    headword: r.headword,
    preview: previewOf(r.row ?? {}, headwordColumn),
  }));
  return { items, hasMore: (raw?.length ?? 0) > limit };
}

export interface OriginalDetail {
  origin: string;
  key: string;
  seq: number;
  rowid: number | null;
  headword: string;
  importedAt: string;
  hash: string;
  row: Record<string, unknown>;
  /** The live search entry built from this original, if any */
  entry: {
    id: string;
    wordIndex: number;
    word: { language: string; value: string }[];
    description: { language: string; value: string }[];
    processorVersion: number | null;
    editedAt: string | null;
    searchTextLength: number;
  } | null;
  /** What the current processor makes of the original now */
  preview: {
    word: { language: string; value: string }[];
    description: { language: string; value: string }[];
    searchTextLength: number;
  } | null;
  previewError: string | null;
  /** The live entry differs from what a rebuild would produce */
  differs: boolean;
}

export async function originalDetail(origin: string, key: string): Promise<OriginalDetail | null> {
  const raw = await db.dictionaryRawEntry.findUnique({
    where: { origin_key: { origin, key } },
  });
  if (!raw) return null;
  const entry = await db.dictionaryWord.findFirst({
    where: { origin, sourceKey: key },
    select: {
      id: true,
      wordIndex: true,
      word: true,
      description: true,
      processorVersion: true,
      editedAt: true,
      searchText: true,
    },
  });
  let preview: OriginalDetail["preview"] = null;
  let previewError: string | null = null;
  const dict = dictionaryForOrigin(origin);
  if (dict) {
    try {
      const layout = await sourceLayoutFor(origin, raw.row as SourceRow);
      const b = buildEntryFromRaw(
        dict,
        { key: raw.key, seq: raw.seq, row: raw.row as SqliteRowData },
        layout,
      );
      preview = {
        word: b.word,
        description: b.description,
        searchTextLength: b.searchText.length,
      };
    } catch (e) {
      previewError = e instanceof Error ? e.message : String(e);
    }
  }
  const differs =
    !!entry &&
    !!preview &&
    (JSON.stringify(entry.word) !== JSON.stringify(preview.word) ||
      JSON.stringify(entry.description) !== JSON.stringify(preview.description));
  return {
    origin,
    key: raw.key,
    seq: raw.seq,
    rowid: raw.rowid ?? null,
    headword: raw.headword,
    importedAt: raw.importedAt.toISOString(),
    hash: raw.hash,
    row: raw.row as Record<string, unknown>,
    entry: entry
      ? {
          id: entry.id,
          wordIndex: entry.wordIndex,
          word: entry.word,
          description: entry.description,
          processorVersion: entry.processorVersion ?? null,
          editedAt: entry.editedAt?.toISOString() ?? null,
          searchTextLength: entry.searchText?.length ?? 0,
        }
      : null,
    preview,
    previewError,
    differs,
  };
}

/** Companion tables (abbreviations, authorities…) kept with a dictionary */
export async function companionTables(origin: string) {
  const src = await db.dictionarySource.findUnique({ where: { origin }, select: { extras: true } });
  return ((src?.extras as { companions?: unknown[] } | null)?.companions ?? []) as Array<{
    role: string;
    file: string;
    table: string;
    columns: string[];
    rows: Record<string, unknown>[];
  }>;
}

// ---------------------------------------------------------------------------
// Originals backup format (JSON lines)
// ---------------------------------------------------------------------------

export const ORIGINALS_TYPE = "devhub-dictionary-originals";
export const ORIGINALS_VERSION = 1;

export interface OriginalsHeader {
  type: typeof ORIGINALS_TYPE;
  version: number;
  exportedAt: string;
  origins: string[];
}

/** Validates one originals line; returns an error message or null */
export function validateOriginalLine(e: any): string | null {
  if (!e || typeof e !== "object") return "not an object";
  if (typeof e.origin !== "string" || !ORIGIN_PATTERN.test(e.origin)) return "bad origin";
  if (isInternalOrigin(e.origin)) return "internal origin";
  if (typeof e.key !== "string" || !e.key) return "bad key";
  if (!Number.isInteger(e.seq)) return "bad seq";
  if (!e.row || typeof e.row !== "object" || Array.isArray(e.row)) return "bad row";
  for (const v of Object.values(e.row)) {
    if (v !== null && typeof v !== "string" && typeof v !== "number") return "bad row value";
  }
  return null;
}
