/**
 * The sanskritsahitya.org data format, as found in
 * data/sanskritsahitya-com-data (see that repository's README).
 *
 * Everything here is deliberately loose: the source keeps growing (AI
 * summaries, padaccheda, new commentaries, speakers…), so unknown keys are
 * kept, never rejected. Only the few keys the structure depends on are
 * checked.
 */

import { createHash } from "crypto";

/** How a work declares an extra per-row field (`custom` in the header). */
export interface CustomFieldConfig {
  /** display name, e.g. "M N Dutt", "सञ्जीविनीटीका (मल्लिनाथः)" */
  name?: string;
  /** "en" | "sa" today; anything else is accepted */
  lang?: string;
  markdown?: boolean;
  order?: number;
  /** the site shows it under the verse rather than behind a toggle */
  showInline?: boolean;
  aiGenerated?: boolean;
  [extra: string]: unknown;
}

export interface SahityaTerms {
  chapterSg?: string;
  chapterPl?: string;
  bookSg?: string;
  bookPl?: string;
  [extra: string]: unknown;
}

/** A book or chapter declaration. Extra keys (subtitle, es, ens…) are kept. */
export interface SahityaSection {
  number: string;
  name?: string;
  subtitle?: string;
  [extra: string]: unknown;
}

/** Everything in a work's (first) file except the data rows. */
export interface SahityaHeader {
  title: string;
  custom?: Record<string, CustomFieldConfig>;
  terms?: SahityaTerms;
  books?: SahityaSection[];
  chapters?: SahityaSection[];
  [extra: string]: unknown;
}

/** One entry of `data`: a verse (`v`) or a piece of prose / stage text (`t`). */
export type SahityaRow = Record<string, unknown> & {
  c?: string | null;
  n?: string | number | null;
  v?: string;
  t?: string;
  sp?: string;
};

export type RecordKind = "book" | "chapter" | "row";

/** A source item ready to be stored as an original. */
export interface RawRecordInput {
  key: string;
  kind: RecordKind;
  seq: number;
  ref: string | null;
  file: string | null;
  row: Record<string, unknown>;
  hash: string;
}

/** Keys of the header the pipeline understands; others are only kept. */
export const KNOWN_HEADER_KEYS = new Set([
  "title",
  "custom",
  "terms",
  "books",
  "chapters",
  "data",
]);

/** seq ranges, so books, chapters and rows sort in reading order */
export const SEQ_BOOK_BASE = 0;
export const SEQ_CHAPTER_BASE = 100_000;
export const SEQ_ROW_FILE_STRIDE = 1_000_000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined =>
  v === undefined || v === null ? undefined : String(v).trim() || undefined;

/**
 * Checks that a parsed file is a sanskritsahitya work and returns its header.
 * Throws with a readable message otherwise.
 */
export function readHeader(json: unknown, file: string): SahityaHeader {
  if (!isObject(json)) throw new Error(`${file}: not a JSON object`);
  if (!Array.isArray(json.data)) throw new Error(`${file}: has no "data" list`);
  const header: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) if (k !== "data") header[k] = v;
  if (typeof header.title !== "string" || !header.title.trim()) {
    throw new Error(`${file}: has no "title"`);
  }
  for (const list of ["books", "chapters"] as const) {
    const items = header[list];
    if (items === undefined) continue;
    if (!Array.isArray(items)) throw new Error(`${file}: "${list}" is not a list`);
    items.forEach((it, i) => {
      if (!isObject(it) || str(it.number) === undefined) {
        throw new Error(`${file}: ${list}[${i}] has no "number"`);
      }
    });
  }
  if (header.custom !== undefined && !isObject(header.custom)) {
    throw new Error(`${file}: "custom" is not an object`);
  }
  return header as SahityaHeader;
}

/** Stable JSON (sorted keys) so equal objects always hash the same. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export const hashValue = (value: unknown): string =>
  createHash("sha1").update(stableStringify(value)).digest("hex");

/**
 * Turns a work's header into book and chapter records. Their keys are their
 * numbers, which is how rows refer to them.
 */
export function headerRecords(header: SahityaHeader, file: string): RawRecordInput[] {
  const out: RawRecordInput[] = [];
  const seen = new Set<string>();
  const add = (kind: "book" | "chapter", base: number, items?: SahityaSection[]) =>
    (items ?? []).forEach((item, i) => {
      const number = String(item.number).trim();
      let key = `${kind === "book" ? "b" : "c"}:${number}`;
      for (let k = 2; seen.has(key); k++) key = `${kind === "book" ? "b" : "c"}:${number}#${k}`;
      seen.add(key);
      out.push({
        key,
        kind,
        seq: base + i,
        ref: number,
        file,
        row: item as Record<string, unknown>,
        hash: hashValue(item),
      });
    });
  add("book", SEQ_BOOK_BASE, header.books);
  add("chapter", SEQ_CHAPTER_BASE, header.chapters);
  return out;
}

/**
 * Assigns stable keys to data rows. Verses are keyed by chapter and number
 * ("v:1.2:17"), which is how the site addresses them, so an entity keeps its
 * identity (and everything attached to it) when the text around it changes.
 * Prose rows are keyed by the verse they follow ("t:1.2:17:1").
 *
 * `state` carries the running counters from one file of a sharded work to
 * the next; it is plain JSON so it can travel between requests. Keys
 * repeated inside one file get "#2", "#3"…; the pipeline resolves repeats
 * across files when it stores them.
 */
export interface RowKeyState {
  /** chapter → last verse number seen */
  lastVerse: Record<string, string>;
  /** "chapter:verse" → prose rows seen after that verse */
  textCount: Record<string, number>;
}

export const newRowKeyState = (): RowKeyState => ({ lastVerse: {}, textCount: {} });

export function rowRecords(
  rows: unknown[],
  file: string,
  fileIndex: number,
  state: RowKeyState,
): RawRecordInput[] {
  const out: RawRecordInput[] = [];
  const used = new Set<string>();
  rows.forEach((raw, i) => {
    const row: Record<string, unknown> = isObject(raw) ? raw : { value: raw };
    const c = str(row.c) ?? "";
    const n = str(row.n);
    let key: string;
    if (n !== undefined) {
      key = `v:${c}:${n}`;
      state.lastVerse[c] = n;
    } else {
      const after = state.lastVerse[c] ?? "0";
      const slot = `${c}:${after}`;
      const k = (state.textCount[slot] ?? 0) + 1;
      state.textCount[slot] = k;
      key = `t:${c}:${after}:${k}`;
    }
    const base = key;
    for (let d = 2; used.has(key); d++) key = `${base}#${d}`;
    used.add(key);
    out.push({
      key,
      kind: "row",
      seq: (fileIndex + 1) * SEQ_ROW_FILE_STRIDE + i,
      ref: c || null,
      file,
      row,
      hash: hashValue(row),
    });
  });
  return out;
}

/** Counts how often each key appears across rows, for the field report. */
export function countFields(rows: unknown[], into: Record<string, number> = {}) {
  for (const r of rows) {
    if (!isObject(r)) continue;
    for (const k of Object.keys(r)) into[k] = (into[k] ?? 0) + 1;
  }
  return into;
}
