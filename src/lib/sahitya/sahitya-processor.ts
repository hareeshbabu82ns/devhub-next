/**
 * Turns stored sanskritsahitya originals into entities. Pure: no database,
 * no files, so it runs the same in the pipeline, the preview and the tests.
 *
 * Bump SAHITYA_PROCESSOR_VERSION whenever the output changes; the source
 * manager then flags every work built by an older version for a rebuild.
 */

import Sanscript from "@indic-transliteration/sanscript";
import {
  BuildParts,
  BuiltAnnotation,
  FieldContext,
  LanguageValue,
  AttributeValue,
  SAHITYA_SOURCE,
  STRUCTURAL_ROW_KEYS,
  STRUCTURAL_SECTION_KEYS,
  applyFields,
  emptyParts,
  joinMeaning,
  dandaMarkdown,
} from "./sahitya-fields";
import { hashValue, type RecordKind, type SahityaHeader } from "./sahitya-format";

/**
 * v2: metre scansion computed from the verse (upstream dropped `ch.s`);
 *     a line break after every danda and "॥ n ॥" in verse and prose.
 */
export const SAHITYA_PROCESSOR_VERSION = 2;
export const SAHITYA_SITE = "https://sanskritsahitya.org";

/** Scripts every text is also written in (the source is Devanagari). */
export const TEXT_SCRIPTS: Record<string, string> = {
  IAST: "iast",
  SLP1: "slp1",
  ITRANS: "itrans_dravidian",
  TEL: "telugu",
};

export interface BuildOptions {
  /** entity type of the work itself; defaults by work (see suggestRootType) */
  entityType?: string;
  bookmarkAll?: boolean;
}

export interface BuiltEntity {
  type: string;
  order: number;
  text: LanguageValue[];
  meaning: LanguageValue[];
  attributes: AttributeValue[];
  annotations: BuiltAnnotation[];
}

export interface WorkContext extends FieldContext {
  header: SahityaHeader;
  rootType: string;
  bookType: string;
  chapterType: string;
  verseType: string;
  options: BuildOptions;
}

/* ------------------------------------------------------------------ */
/* Entity types                                                        */
/* ------------------------------------------------------------------ */

/** Root type suggested for a work; the manager lets you pick another. */
export const WORK_ROOT_TYPES: Record<string, string> = {
  ramayanam: "ITIHASAM",
  mahabharatam: "ITIHASAM",
  srimadbhagavatam: "PURANAM",
  vishnupuranam: "PURANAM",
  amarushatakam: "SHATAKAM",
  anyapadeshashatakam: "SHATAKAM",
  shatakatrayam: "SHATAKAM",
};

export const suggestRootType = (work: string) => WORK_ROOT_TYPES[work] ?? "KAVYAM";

/** Book type by the work's word for a book (terms.bookSg). */
export const BOOK_TYPES: Record<string, string> = {
  काण्डम्: "KAANDAM",
  खण्डः: "KAANDAM",
  लम्बकः: "KAANDAM",
  अंशः: "KAANDAM",
  पर्व: "PARVAM",
  स्कन्धः: "SKANDAM",
};

/** Chapter type by the work's word for a chapter (terms.chapterSg). */
export const CHAPTER_TYPES: Record<string, string> = {
  अध्यायः: "ADHYAAYAM",
  भागः: "ADHYAAYAM",
  सर्गः: "SARGA",
  तरङ्गः: "SARGA",
  मयूखः: "SARGA",
  आश्वासः: "SARGA",
  अङ्कः: "SARGA",
};

/** Chapter type when the work names none, by the type of its books. */
const CHAPTER_TYPE_BY_BOOK: Record<string, string> = {
  KAANDAM: "SARGA",
  PARVAM: "ADHYAAYAM",
  SKANDAM: "ADHYAAYAM",
};

export function workContext(
  work: string,
  header: SahityaHeader,
  options: BuildOptions = {},
): WorkContext {
  const rootType = options.entityType || suggestRootType(work);
  const terms = header.terms ?? {};
  const bookType = (terms.bookSg && BOOK_TYPES[terms.bookSg]) || "KAANDAM";
  const hasBooks = (header.books?.length ?? 0) > 0;
  const chapterType =
    (terms.chapterSg && CHAPTER_TYPES[terms.chapterSg]) ||
    (hasBooks ? CHAPTER_TYPE_BY_BOOK[bookType] : undefined) ||
    (rootType === "KAVYAM" ? "SARGA" : "ADHYAAYAM");
  return {
    work,
    header,
    custom: header.custom,
    rootType,
    bookType,
    chapterType,
    verseType: "SLOKAM",
    options,
  };
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

/** The Devanagari text plus every script in TEXT_SCRIPTS. */
export function inAllScripts(san: string): LanguageValue[] {
  const out: LanguageValue[] = [{ language: "SAN", value: san }];
  if (!san) return out;
  for (const [language, scheme] of Object.entries(TEXT_SCRIPTS)) {
    try {
      out.push({ language, value: Sanscript.t(san, "devanagari", scheme) });
    } catch {
      // leave the script out rather than fail the entity
    }
  }
  return out;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

/** How sanskritsahitya.org addresses a verse: "4", "1.4", "1.1.4". */
export function siteRef(row: Record<string, unknown>): string {
  const c = str(row.c);
  const n = str(row.n);
  if (!n) return c;
  return c ? `${c}.${n}` : n;
}

const baseAttributes = (ctx: WorkContext, key: string): AttributeValue[] => [
  { key: "sourceType", value: SAHITYA_SOURCE },
  { key: "ssWork", value: ctx.work },
  { key: "ssKey", value: key },
];

function finish(
  type: string,
  order: number,
  san: string,
  parts: BuildParts,
  attributes: AttributeValue[],
): BuiltEntity {
  const prefixed = parts.textPrefix.length ? `${parts.textPrefix.join(" ")}  \n${san}` : san;
  if (parts.aiFields.length) {
    attributes.push({ key: "aiGenerated", value: parts.aiFields.join(",") });
  }
  return {
    type,
    order,
    text: inAllScripts(prefixed),
    meaning: joinMeaning(parts.meaning),
    attributes: [...attributes, ...parts.attributes],
    annotations: parts.annotations,
  };
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

export function buildRoot(ctx: WorkContext): BuiltEntity {
  const { header } = ctx;
  const attributes: AttributeValue[] = [
    ...baseAttributes(ctx, ""),
    { key: "rootTitle", value: header.title },
    { key: "sourceUrl", value: `${SAHITYA_SITE}/${ctx.work}` },
  ];
  const terms = header.terms ?? {};
  for (const [k, attr] of [
    ["bookSg", "bookSingular"],
    ["bookPl", "bookPlural"],
    ["chapterSg", "chapterSingular"],
    ["chapterPl", "chapterPlural"],
  ] as const) {
    if (terms[k]) attributes.push({ key: attr, value: String(terms[k]) });
  }
  return finish(ctx.rootType, 0, header.title, emptyParts(), attributes);
}

function buildSection(
  ctx: WorkContext,
  kind: "book" | "chapter",
  key: string,
  row: Record<string, unknown>,
  pos: number,
): BuiltEntity {
  const number = str(row.number);
  const terms = ctx.header.terms ?? {};
  const word = kind === "book" ? terms.bookSg : terms.chapterSg;
  const name = str(row.name) || [word, number].filter(Boolean).join(" ");
  const parts = emptyParts();
  const subtitle = str(row.subtitle);
  if (subtitle) {
    parts.meaning.push({ language: "ENG", title: "Subtitle", text: subtitle, order: -1 });
  }
  applyFields(row, parts, ctx, STRUCTURAL_SECTION_KEYS);
  // a section's subtitle and summary read as one text, not two headed parts
  const eng = parts.meaning.filter((m) => m.language === "ENG");
  if (eng.length > 1) {
    const sorted = [...eng].sort((a, b) => a.order - b.order);
    parts.meaning = [
      ...parts.meaning.filter((m) => m.language !== "ENG"),
      {
        language: "ENG",
        title: "",
        order: 0,
        text: sorted.map((m, i) => (i === 0 && subtitle ? `**${m.text}**` : m.text)).join("\n\n"),
      },
    ];
  }
  const attributes = baseAttributes(ctx, key);
  attributes.push({ key: kind === "book" ? "bookNumber" : "chapterNumber", value: number });
  if (subtitle) attributes.push({ key: "subtitle", value: subtitle });
  attributes.push({ key: "sourceUrl", value: `${SAHITYA_SITE}/${ctx.work}/${number}` });
  return finish(kind === "book" ? ctx.bookType : ctx.chapterType, pos, name, parts, attributes);
}

function buildRow(
  ctx: WorkContext,
  key: string,
  row: Record<string, unknown>,
  pos: number,
): BuiltEntity {
  const isVerse = row.v !== undefined && row.v !== null;
  const san = dandaMarkdown(str(isVerse ? row.v : (row.t ?? row.v)));
  const parts = emptyParts();
  applyFields(row, parts, ctx, STRUCTURAL_ROW_KEYS);
  const attributes = baseAttributes(ctx, key);
  const c = str(row.c);
  const n = str(row.n);
  if (c) attributes.push({ key: "chapterNumber", value: c });
  if (n) attributes.push({ key: "verseNumber", value: n });
  if (!isVerse) attributes.push({ key: "textKind", value: "prose" });
  const ref = siteRef(row);
  if (n) {
    attributes.push({ key: "ssRef", value: ref });
    attributes.push({ key: "sourceUrl", value: `${SAHITYA_SITE}/${ctx.work}/${ref}` });
  }
  return finish(ctx.verseType, pos, san, parts, attributes);
}

/** Builds the entity for one stored original. */
export function buildRecord(
  ctx: WorkContext,
  rec: { key: string; kind: RecordKind | string; row: unknown; pos?: number | null },
): BuiltEntity {
  const row = (typeof rec.row === "object" && rec.row !== null ? rec.row : {}) as Record<
    string,
    unknown
  >;
  const pos = rec.pos ?? 0;
  if (rec.kind === "book" || rec.kind === "chapter") {
    return buildSection(ctx, rec.kind, rec.key, row, pos);
  }
  return buildRow(ctx, rec.key, row, pos);
}

/* ------------------------------------------------------------------ */
/* Structure                                                           */
/* ------------------------------------------------------------------ */

export interface PlanItem {
  key: string;
  kind: string;
  ref: string | null;
  seq: number;
}

export interface PlanEntry {
  /** "" = the work's root */
  parentKey: string;
  pos: number;
}

/**
 * Works out where every book, chapter and row goes.
 *
 * - books sit under the root;
 * - a chapter "3.1" sits under book 3 (or chapter 3 when there are no
 *   books); other chapters under the root;
 * - a row sits under its chapter, else under the book its chapter number
 *   names, else under the longest dotted prefix that is a chapter or book,
 *   else under the root.
 *
 * Positions run per parent, in reading order: from 1 when the first child
 * is a book or chapter, from 0 when it is a row (as the earlier importer
 * numbered them).
 */
export function planStructure(items: PlanItem[]): Map<string, PlanEntry> {
  const sorted = [...items].sort((a, b) => a.seq - b.seq);
  const books = new Set<string>();
  const chapters = new Set<string>();
  for (const it of sorted) {
    if (it.kind === "book" && it.ref) books.add(it.ref);
    if (it.kind === "chapter" && it.ref) chapters.add(it.ref);
  }
  const prefixes = (ref: string) => {
    const segs = ref.split(".");
    const out: string[] = [];
    for (let i = segs.length - 1; i > 0; i--) out.push(segs.slice(0, i).join("."));
    return out;
  };
  const sectionParent = (ref: string): string => {
    for (const p of prefixes(ref)) {
      if (chapters.has(p)) return `c:${p}`;
      if (books.has(p)) return `b:${p}`;
    }
    return "";
  };
  const counters = new Map<string, number>();
  const next = (parent: string, start: number) => {
    const v = counters.has(parent) ? counters.get(parent)! + 1 : start;
    counters.set(parent, v);
    return v;
  };
  const plan = new Map<string, PlanEntry>();
  for (const it of sorted) {
    let parentKey = "";
    if (it.kind === "book") {
      parentKey = "";
    } else if (it.kind === "chapter") {
      parentKey = it.ref ? sectionParent(it.ref) : "";
    } else if (it.ref) {
      if (chapters.has(it.ref)) parentKey = `c:${it.ref}`;
      else if (books.has(it.ref)) parentKey = `b:${it.ref}`;
      else parentKey = sectionParent(it.ref);
    }
    const pos = next(parentKey, it.kind === "row" ? 0 : 1);
    plan.set(it.key, { parentKey, pos });
  }
  return plan;
}

/* ------------------------------------------------------------------ */
/* Edit detection                                                      */
/* ------------------------------------------------------------------ */

/**
 * Hash of the parts of an entity a build writes. Stored with the original
 * when an entity is built; if the entity hashes differently later, someone
 * edited it, and a rebuild leaves it alone (unless told to overwrite).
 * Notes, bookmarks, images and audio are never written by a rebuild.
 */
export function entityHash(e: {
  type: string;
  text: LanguageValue[];
  meaning: LanguageValue[];
  attributes: AttributeValue[];
}): string {
  const lv = (xs: LanguageValue[]) => xs.map((x) => [x.language, x.value]);
  return hashValue({
    type: e.type,
    text: lv(e.text),
    meaning: lv(e.meaning),
    attributes: e.attributes.map((a) => [a.key, a.value]),
  });
}
