import Sanscript from "@indic-transliteration/sanscript";
import { LANGUAGE_SCHEME_MAP, LANGUAGES_TYPE } from "@/lib/constants";
import { LanguageValueInput } from "@/lib/types";
import { transliteratedText } from "@/app/(app)/sanscript/_components/utils";

/**
 * Scripts that are pure transliterations of each other. Text entered in any
 * one of them can be regenerated in all the others without loss of meaning.
 * Languages outside this list (ENG, TAM, ...) are never auto-generated.
 */
export const SYNC_SCRIPT_LANGUAGES: LANGUAGES_TYPE[] = [
  "SAN",
  "TEL",
  "IAST",
  "SLP1",
  "ITRANS",
];

export const isSyncScriptLanguage = (language: string) =>
  (SYNC_SCRIPT_LANGUAGES as string[]).includes(language);

const TRANSLITERATE_DIRECTIVE = "$transliterateFrom=";

/**
 * Regenerates every transliterable script from `sourceLanguage`, overwriting
 * whatever those scripts held before. Other languages are left untouched.
 * Returns the input unchanged when the source is not a transliterable script
 * or has no text.
 */
export const syncScripts = (
  textData: LanguageValueInput[],
  sourceLanguage: string,
): LanguageValueInput[] => {
  const fromScheme = LANGUAGE_SCHEME_MAP[sourceLanguage];
  const source = textData.find((t) => t.language === sourceLanguage);
  if (!isSyncScriptLanguage(sourceLanguage) || !fromScheme || !source?.value) {
    return textData;
  }

  const generated = new Map<string, string>();
  for (const language of SYNC_SCRIPT_LANGUAGES) {
    if (language === sourceLanguage) continue;
    generated.set(
      language,
      Sanscript.t(source.value, fromScheme, LANGUAGE_SCHEME_MAP[language]),
    );
  }

  const result = textData.map((t) =>
    generated.has(t.language)
      ? { language: t.language, value: generated.get(t.language)! }
      : t,
  );
  for (const [language, value] of generated) {
    if (!result.some((t) => t.language === language)) {
      result.push({ language, value });
    }
  }
  return result;
};

/**
 * Normalises multilingual text before it is stored:
 *  - resolves legacy `$transliterateFrom=` directives,
 *  - drops empty entries and directives that could not be resolved (so the
 *    directive text itself is never saved as content),
 *  - fills in transliterable scripts that are missing. Existing values are
 *    never overwritten here.
 */
export const prepareTextForSave = (
  textData: LanguageValueInput[] | undefined | null,
): LanguageValueInput[] => {
  if (!textData?.length) return [];
  const resolved = transliteratedText(textData) ?? [];
  const cleaned = resolved.filter(
    (t) => t.value?.trim() && !t.value.startsWith(TRANSLITERATE_DIRECTIVE),
  );
  return transliteratedText(cleaned, SYNC_SCRIPT_LANGUAGES) ?? cleaned;
};

/** Replaces (or adds) the value for one language. */
export const setLanguageValue = (
  textData: LanguageValueInput[],
  language: string,
  value: string,
): LanguageValueInput[] =>
  textData.some((t) => t.language === language)
    ? textData.map((t) => (t.language === language ? { language, value } : t))
    : [...textData, { language, value }];

export type VerseSplitMode =
  | "auto"
  | "blank-line"
  | "verse-end"
  | "line"
  | "none";

const DOUBLE_DANDA = "(?:॥|।।|\\|\\|)";
const DIGITS = "[0-9०-९౦-౯]+";
// A verse terminator: `॥`, or a numbered one such as `॥ 12 ॥` / `|| 12 ||`.
const VERSE_END = new RegExp(
  `${DOUBLE_DANDA}(?:[ \\t]*${DIGITS}[ \\t]*${DOUBLE_DANDA})?`,
  "g",
);
const VERSE_NUMBER = new RegExp(
  `(${DOUBLE_DANDA})[ \\t]*${DIGITS}[ \\t]*${DOUBLE_DANDA}`,
  "g",
);

const normalize = (raw: string) => raw.replace(/\r\n?/g, "\n").trim();

/**
 * Joins the lines of one verse with markdown hard breaks (`␠␠\n`), the same
 * convention the importers use, so line breaks survive markdown rendering.
 */
const formatVerse = (chunk: string) =>
  chunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("  \n");

/** Picks the most likely way a pasted block is divided into verses. */
export const detectVerseSplitMode = (
  raw: string,
): Exclude<VerseSplitMode, "auto"> => {
  const text = normalize(raw);
  if (/\n[ \t]*\n/.test(text)) return "blank-line";
  if ((text.match(VERSE_END) ?? []).length >= 2) return "verse-end";
  // A few lines with no separators is most likely a single verse.
  return text.split("\n").filter((l) => l.trim()).length > 4 ? "line" : "none";
};

/** Splits a pasted block of text into individual verses. */
export const splitVerses = (
  raw: string,
  mode: VerseSplitMode = "auto",
): string[] => {
  const text = normalize(raw);
  if (!text) return [];
  const resolved = mode === "auto" ? detectVerseSplitMode(text) : mode;

  let chunks: string[];
  switch (resolved) {
    case "blank-line":
      chunks = text.split(/\n[ \t]*\n+/);
      break;
    case "line":
      chunks = text.split("\n");
      break;
    case "verse-end": {
      chunks = [];
      let start = 0;
      for (const match of text.matchAll(VERSE_END)) {
        const end = match.index + match[0].length;
        chunks.push(text.slice(start, end));
        start = end;
      }
      chunks.push(text.slice(start));
      break;
    }
    default:
      chunks = [text];
  }
  return chunks.map(formatVerse).filter(Boolean);
};

/** Turns `... ॥ 12 ॥` into `... ॥` (the list already shows verse numbers). */
export const stripVerseNumbers = (text: string) =>
  text.replace(VERSE_NUMBER, "$1");
