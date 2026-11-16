/**
 * What becomes of each field of a sanskritsahitya row, book or chapter.
 *
 * This is the one place to extend when the source grows:
 *
 *  - A new commentary / translation declared in a work's `custom` header is
 *    picked up on its own: English (or any non-Sanskrit) fields go to the
 *    entity's meaning, Sanskrit ones become a COMMENTARY annotation titled
 *    with the commentator's name. To route a field differently, add it to
 *    FIELD_RULES.
 *  - A new structured field (like `pc` or `xx`) gets a handler in
 *    ROW_FIELD_HANDLERS.
 *  - Anything else that is a plain value is kept as an attribute
 *    (`src.<field>`), and the source manager lists it under "unhandled
 *    fields" so it can be given a rule.
 *
 * The original rows are always kept, so changing a rule only needs a
 * rebuild (bump SAHITYA_PROCESSOR_VERSION in sahitya-processor.ts).
 */

import type { CustomFieldConfig } from "./sahitya-format";
import { readSourceSyllables, scanVerse, scansionMarkdown } from "./sahitya-chandas";

export const SAHITYA_SOURCE = "sanskritsahitya";

export interface LanguageValue {
  language: string;
  value: string;
}
export interface AttributeValue {
  key: string;
  value: string;
}

export interface BuiltAnnotation {
  kind: string;
  language: string;
  title: string;
  text: string;
  order: number;
  /** "sanskritsahitya:<field>" */
  source: string;
}

/** What the field handlers contribute to one entity. */
export interface BuildParts {
  /** lines put before the text (e.g. the speaker in a play) */
  textPrefix: string[];
  meaning: Array<{ language: string; title: string; text: string; order: number }>;
  annotations: BuiltAnnotation[];
  attributes: AttributeValue[];
  /** fields whose value was AI generated, for the aiGenerated attribute */
  aiFields: string[];
}

export const emptyParts = (): BuildParts => ({
  textPrefix: [],
  meaning: [],
  annotations: [],
  attributes: [],
  aiFields: [],
});

/* ------------------------------------------------------------------ */
/* Languages and text cleanup                                          */
/* ------------------------------------------------------------------ */

const LANG_CODES: Record<string, string> = {
  en: "ENG",
  sa: "SAN",
  hi: "SAN", // Devanagari; the app has no separate Hindi text language
  te: "TEL",
  ta: "TAM",
};

/** Maps a source language ("en", "sa"…) to an app language code. */
export function languageCode(lang: string | undefined, sample = ""): string {
  const code = lang ? LANG_CODES[lang.toLowerCase()] : undefined;
  if (code) return code;
  // undeclared: Devanagari text is Sanskrit, anything else is English
  return /[ऀ-ॿ]/.test(sample) ? "SAN" : "ENG";
}

/** Line breaks the source writes as <br>, for markdown. */
export const htmlBreaks = (text: string) =>
  text.replace(/<br\s*\/?>/gi, "  \n").replace(/\r\n/g, "\n").trim();

const NUM_OPEN = "";
const NUM_CLOSE = "";

/**
 * Verse or prose laid out by its dandas, for markdown: a line ends after
 * every "।", "॥" and verse-number marker "॥ १२ ॥" (kept together), with a
 * space before each danda. A danda left alone on a line (as in "॥ ।") joins
 * the line before it.
 */
export const dandaMarkdown = (text: string) => {
  const marked = htmlBreaks(text)
    .replace(/॥\s*([०-९0-9][०-९0-9.\-–]*)\s*॥/g, `${NUM_OPEN}$1${NUM_CLOSE}\n`)
    .replace(/॥/g, "॥\n")
    .replace(/।/g, "।\n");
  const lines: string[] = [];
  for (const raw of marked.split("\n")) {
    const line = raw
      .replace(/\s*([।॥])/g, " $1")
      .replace(new RegExp(`\\s*${NUM_OPEN}`, "g"), " ॥ ")
      .replace(new RegExp(NUM_CLOSE, "g"), " ॥")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!line) continue;
    if (/^[।॥\s]+$/.test(line) && lines.length) lines[lines.length - 1] += ` ${line}`;
    else lines.push(line);
  }
  return lines.join("  \n");
};

/** @deprecated name kept for callers; verses and prose share the layout */
export const verseMarkdown = dandaMarkdown;

/* ------------------------------------------------------------------ */
/* Routing of text fields (custom fields and well-known codes)         */
/* ------------------------------------------------------------------ */

export type FieldTarget =
  | { to: "meaning" }
  | { to: "annotation"; kind: string }
  | { to: "attribute"; key: string }
  | { to: "ignore" };

export interface FieldRule extends CustomFieldConfig {
  target?: FieldTarget;
}

/**
 * Known field codes. Used when a work does not declare the field in `custom`
 * (older files), and to override where a declared field goes. Keys of a
 * work's `custom` header win for name/lang/order; `target` here wins.
 */
export const FIELD_RULES: Record<string, FieldRule> = {
  es: { name: "Summary", lang: "en", order: 3 },
  ens: { name: "Summary", lang: "en", order: 3 },
  md: { name: "M N Dutt", lang: "en", order: 2 },
  et: { name: "Translation", lang: "en", order: 2 },
  anv: {
    name: "अन्वयः",
    lang: "sa",
    order: 1,
    target: { to: "annotation", kind: "ANVAYA" },
  },
  mn: { name: "मल्लिनाथः", lang: "sa", order: 4 },
  vd: { name: "वल्लभदेवः", lang: "sa", order: 4 },
  am: { name: "अमरकीर्तिसूरिः", lang: "sa", order: 4 },
  mr: { name: "मणिरामः", lang: "sa", order: 4 },
  sc: { name: "विस्तारः", lang: "sa", order: 4 },
};

/** The rule for a text field: the work's declaration merged over FIELD_RULES. */
export function ruleFor(
  field: string,
  custom: Record<string, CustomFieldConfig> | undefined,
): FieldRule | undefined {
  const declared = custom?.[field];
  const known = FIELD_RULES[field];
  if (!declared && !known) return undefined;
  return { ...known, ...declared, target: known?.target ?? undefined };
}

function targetOf(rule: FieldRule, value: string): FieldTarget {
  if (rule.target) return rule.target;
  return languageCode(rule.lang, value) === "SAN"
    ? { to: "annotation", kind: "COMMENTARY" }
    : { to: "meaning" };
}

/** Adds one text field (translation, summary, commentary…) to the parts. */
export function addTextField(
  parts: BuildParts,
  field: string,
  value: string,
  rule: FieldRule,
) {
  const text = htmlBreaks(value);
  if (!text) return;
  const language = languageCode(rule.lang, text);
  const title = String(rule.name ?? field);
  const order = typeof rule.order === "number" ? rule.order : 99;
  if (rule.aiGenerated) parts.aiFields.push(field);
  const target = targetOf(rule, text);
  switch (target.to) {
    case "meaning":
      parts.meaning.push({ language, title, text, order });
      break;
    case "annotation":
      parts.annotations.push({
        kind: target.kind,
        language,
        title: rule.aiGenerated ? `${title} (AI)` : title,
        text,
        order,
        source: `${SAHITYA_SOURCE}:${field}`,
      });
      break;
    case "attribute":
      parts.attributes.push({ key: target.key, value: text });
      break;
    case "ignore":
      break;
  }
}

/** Joins the meaning parts into one value per language. */
export function joinMeaning(parts: BuildParts["meaning"]): LanguageValue[] {
  const byLang = new Map<string, BuildParts["meaning"]>();
  for (const p of [...parts].sort((a, b) => a.order - b.order)) {
    byLang.set(p.language, [...(byLang.get(p.language) ?? []), p]);
  }
  return [...byLang.entries()].map(([language, items]) => ({
    language,
    value:
      items.length === 1
        ? items[0].text
        : items.map((i) => `**${i.title}**  \n${i.text}`).join("\n\n---\n\n"),
  }));
}

/* ------------------------------------------------------------------ */
/* Grammar codes                                                       */
/* ------------------------------------------------------------------ */

const VIBHAKTI = ["", "प्रथमा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी", "सम्बोधनम्"];
const VACHANA = ["", "एकवचनम्", "द्विवचनम्", "बहुवचनम्"];
const PURUSHA = ["उत्तमपुरुषः", "मध्यमपुरुषः", "प्रथमपुरुषः"];
const PADA: Record<string, string> = {
  P1: "परस्मैपदम्",
  P2: "परस्मैपदम्",
  A1: "आत्मनेपदम्",
  A2: "आत्मनेपदम्",
};

/**
 * Tense / mood / verbal-form codes of the morphological analysis (`xx.tm`),
 * worked out from the forms they are attached to. Codes not listed are shown
 * as "tm<code>".
 */
export const TENSE_MOOD: Record<number, string> = {
  1: "लट्",
  2: "विधिलिङ्",
  3: "लोट्",
  4: "लङ्",
  5: "लृट्",
  7: "लुट्",
  8: "लुङ्",
  9: "लुङ्",
  10: "लुङ्",
  11: "लुङ्",
  15: "लिट्",
  16: "लिट् (आम्)",
  19: "क्त",
  20: "क्तवतु",
  21: "कृत्य",
  22: "तुमुन्",
  23: "क्त्वा/ल्यप्",
  24: "कर्मणि लट्",
  26: "कर्मणि लोट्",
  27: "कर्मणि लङ्",
  29: "कर्मणि विधिलिङ्",
  30: "लुङ् (अडभावः)",
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** "6.1" (case.number) → "षष्ठी एकवचनम्" */
export function decodeCaseNumber(cn: unknown): string {
  const [c, n] = String(cn ?? "").split(".").map(Number);
  return [VIBHAKTI[c] ?? "", VACHANA[n] ?? ""].filter(Boolean).join(" ");
}

/** person+number code 1…9 (1 = first singular … 9 = third plural) */
export function decodePersonNumber(pn: unknown): string {
  const p = num(pn);
  if (!p || p < 1 || p > 9) return "";
  return `${PURUSHA[(p - 1) % 3]} ${VACHANA[Math.ceil(p / 3)]}`;
}

/* ------------------------------------------------------------------ */
/* Structured row fields                                               */
/* ------------------------------------------------------------------ */

export interface FieldContext {
  work: string;
  custom?: Record<string, CustomFieldConfig>;
}

export type FieldHandler = (
  value: unknown,
  parts: BuildParts,
  ctx: FieldContext,
  field: string,
  /** the whole row, for handlers that need other fields (e.g. the verse) */
  row: Record<string, unknown>,
) => void;

const isObject = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const cell = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

/** Analysis of one padaccheda segment (lemma with suffixes, case, form…). */
function segmentAnalysis(seg: Record<string, any>): string {
  const bits: string[] = [];
  const pre = Array.isArray(seg.vp) ? seg.vp.join("-") : seg.vp;
  const stem = seg.inf && seg.inf !== seg.l ? `${seg.l} → ${seg.inf}` : seg.l;
  bits.push([pre ? `${pre}-` : "", stem ?? ""].join(""));
  if (seg.r) bits.push(`√${seg.r}`);
  if (Array.isArray(seg.s) && seg.s.length) bits.push(`+${seg.s.join(" +")}`);
  if (seg.cn && seg.cn !== "0.0") bits.push(decodeCaseNumber(seg.cn) || seg.cn);
  if (seg.t) bits.push(String(seg.t));
  if (seg.pn) bits.push(decodePersonNumber(seg.pn));
  if (seg.pp) bits.push(PADA[seg.pp] ?? seg.pp);
  const known = new Set(["l", "inf", "r", "s", "cn", "t", "pn", "pp", "vp", "fin", "p", "w", "e"]);
  for (const [k, v] of Object.entries(seg)) {
    if (!known.has(k) && v !== undefined && v !== null && v !== "") {
      bits.push(`${k}=${Array.isArray(v) ? v.join(",") : v}`);
    }
  }
  return bits.filter(Boolean).join(", ");
}

/** padaccheda: word split with lemma, grammar and English gloss per word */
export function padacchedaMarkdown(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const rows: string[] = [];
  const walk = (word: Record<string, any>) => {
    const segs: Record<string, any>[] = Array.isArray(word.p) ? word.p : [];
    const analysis = segs
      .map((s) => (Array.isArray(s.p) ? `(${s.p.map(segmentAnalysis).join(" + ")})` : segmentAnalysis(s)))
      .join(" + ");
    rows.push(`| ${cell(word.w)} | ${cell(analysis)} | ${cell(word.e)} |`);
  };
  value.filter(isObject).forEach(walk);
  if (rows.length === 0) return "";
  return ["| पदम् | विश्लेषणम् | Meaning |", "| --- | --- | --- |", ...rows].join("\n");
}

const CASE_ABBR = ["", "nom.", "acc.", "ins.", "dat.", "abl.", "gen.", "loc.", "voc."];
const NUMBER_ABBR = ["", "sg.", "du.", "pl."];
const GENDER_ABBR = ["", "m.", "f.", "n."];

/** One analysis of the morphological table (`xx`). */
function morphAnalysis(a: Record<string, any>): string {
  const bits: string[] = [];
  if (a.pos) bits.push(String(a.pos));
  const c = num(a.c);
  const n = num(a.n);
  const g = num(a.g);
  if (c && CASE_ABBR[c]) bits.push(CASE_ABBR[c]);
  if (n && NUMBER_ABBR[n]) bits.push(NUMBER_ABBR[n]);
  // a noun's pos already is its gender (m, f, n, mn…)
  if (g && GENDER_ABBR[g] && !/^[mfn]+$/.test(String(a.pos ?? ""))) bits.push(GENDER_ABBR[g]);
  const tm = num(a.tm);
  if (tm) bits.push(TENSE_MOOD[tm] ?? `tm${tm}`);
  if (a.pn) bits.push(decodePersonNumber(a.pn));
  if (a.vp) bits.push(`${a.vp}-`);
  if (a.pl && a.pl !== a.l) bits.push(`√${a.pl}`);
  if (a.inf && a.inf !== a.l) bits.push(`→ ${a.inf}`);
  if (a.fin && a.fin !== a.w) bits.push(`= ${a.fin}`);
  return bits.filter(Boolean).join(" ");
}

/**
 * Morphological analysis: half-verses → words → analyses (a compound has one
 * analysis per member).
 */
export function morphologyMarkdown(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const rows: string[] = [];
  for (const half of value) {
    if (!Array.isArray(half)) continue;
    for (const word of half) {
      const analyses = (Array.isArray(word) ? word : [word]).filter(isObject);
      if (analyses.length === 0) continue;
      rows.push(
        `| ${cell(analyses[0].w)} | ${cell(analyses.map((a) => a.l).join(" + "))} | ${cell(
          analyses.map(morphAnalysis).join(" + "),
        )} |`,
      );
    }
  }
  if (rows.length === 0) return "";
  return ["| Word | Lemma | Analysis |", "| --- | --- | --- |", ...rows].join("\n");
}

/**
 * Handlers for fields that are not plain text. Each adds what it can to the
 * parts; the original value stays in the stored row either way.
 */
export const ROW_FIELD_HANDLERS: Record<string, FieldHandler> = {
  // speaker in a play
  sp: (value, parts) => {
    const sp = String(value ?? "").trim();
    if (!sp) return;
    parts.attributes.push({ key: "speaker", value: sp });
    parts.textPrefix.push(`**${sp}** —`);
  },
  // metre: { n: name, s?: syllables }. Upstream dropped `s` in July 2025,
  // so the scansion is computed from the verse unless the record has it.
  ch: (value, parts, _ctx, field, row) => {
    if (!isObject(value)) return;
    const name = String(value.n ?? "").trim();
    if (name) parts.attributes.push({ key: "chandas", value: name });
    const verse = typeof row.v === "string" ? row.v : "";
    const lines = readSourceSyllables(value.s) ?? (verse ? scanVerse(verse, name) : []);
    const text = scansionMarkdown(lines, name);
    if (!text) return;
    parts.annotations.push({
      kind: "CHANDAS",
      language: "SAN",
      title: name ? `छन्दः — ${name}` : "छन्दः",
      text,
      order: 0,
      source: `${SAHITYA_SOURCE}:${field}`,
    });
  },
  // padaccheda: [{ w, p: [{ l, cn, inf, s, … }], e }]
  pc: (value, parts, _ctx, field) => {
    const text = padacchedaMarkdown(value);
    if (!text) return;
    parts.annotations.push({
      kind: "WORD_MEANING",
      language: "SAN",
      title: "पदच्छेदः",
      text,
      order: 0,
      source: `${SAHITYA_SOURCE}:${field}`,
    });
  },
  // morphological analysis: [[[{ w, l, pos, c, n, g, … }]]]
  xx: (value, parts, _ctx, field) => {
    const text = morphologyMarkdown(value);
    if (!text) return;
    parts.annotations.push({
      kind: "WORD_ANALYSIS",
      language: "SAN",
      title: "Morphology",
      text,
      order: 10,
      source: `${SAHITYA_SOURCE}:${field}`,
    });
  },
};

/** Row keys that make up the structure and text itself. */
export const STRUCTURAL_ROW_KEYS = new Set(["c", "n", "i", "v", "t"]);
/** Book / chapter keys that make up the structure and title. */
export const STRUCTURAL_SECTION_KEYS = new Set(["number", "name", "subtitle"]);

/** Whether the processor does something with this field (for the report). */
export function isHandledField(
  field: string,
  custom: Record<string, CustomFieldConfig> | undefined,
  structural: Set<string> = STRUCTURAL_ROW_KEYS,
): boolean {
  return (
    structural.has(field) ||
    field in ROW_FIELD_HANDLERS ||
    ruleFor(field, custom) !== undefined
  );
}

/**
 * Runs every non-structural field of a row (or book / chapter) through its
 * handler or text rule. Plain values with no rule are kept as `src.<field>`
 * attributes; other unknown values stay only in the stored original.
 */
export function applyFields(
  row: Record<string, unknown>,
  parts: BuildParts,
  ctx: FieldContext,
  structural: Set<string>,
) {
  for (const [field, value] of Object.entries(row)) {
    if (structural.has(field) || value === undefined || value === null) continue;
    const handler = ROW_FIELD_HANDLERS[field];
    if (handler) {
      handler(value, parts, ctx, field, row);
      continue;
    }
    const rule = ruleFor(field, ctx.custom);
    if (rule && typeof value === "string") {
      addTextField(parts, field, value, rule);
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const v = String(value).trim();
      if (v) parts.attributes.push({ key: `src.${field}`, value: v });
    }
  }
}
