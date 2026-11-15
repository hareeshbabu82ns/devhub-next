/**
 * Dictionary Word Processor for DevHub
 *
 * This module handles the conversion of SQLite row data to MongoDB-compatible
 * DictionaryWord documents. It's designed to be testable without requiring
 * database connections.
 */

import { LanguageValueType, AttributeValueType } from "@/app/generated/prisma";
import { buildSearchText, generatePhoneticString } from "./word-utils";
import {
  DictionaryName,
  LEXICON_ALL_DICT_TO_DB_MAP,
  LEXICON_ALL_TABLE_WORD_FIELD_MAP,
  LEXICON_ALL_TABLE_DESC_FIELD_MAP,
  LEXICON_SAN_DICT_LIST,
  LEXICON_TEL_DICT_LIST,
  DICTIONARY_LANGUAGE_MAPPING,
  SANSCRIPT_LANGS,
  SANSCRIPT_LANGS_TO_DB,
} from "./dictionary-constants";
import sanscript from "@indic-transliteration/sanscript";
import { convertLexiconHtmlToMarkdown, TagHandler } from "./lexicon-utils";

/**
 * Version of the rules that turn an original row into a searchable entry.
 * Bump it whenever the output changes; entries built by an older version
 * are flagged for a rebuild in the dictionary manager.
 *
 *   1  original importer
 *   2  full-text searchText, source pointer, Telugu dictionaries
 */
export const DICTIONARY_PROCESSOR_VERSION = 2;

/**
 * SQLite row data structure
 */
export interface SqliteRowData {
  [columnName: string]: string | number | null;
}

/**
 * Table metadata for processing SQLite data
 */
export interface TableMetadata {
  tableName: string;
  columns: string[];
  columnPositions: Record<string, number>;
  wordFieldName: string;
  descFieldName: string;
  orderFieldName: string;
}

/**
 * Processed dictionary word document ready for MongoDB
 */
export interface ProcessedDictionaryWord {
  wordIndex: number;
  origin: string;
  word: LanguageValueType[];
  description: LanguageValueType[];
  attributes: AttributeValueType[];
  phonetic: string;
  sourceData: {
    data: SqliteRowData;
    wordField: string;
    descriptionField: string;
    wordLang: string;
    descriptionLang: string;
  };
  wordLnum?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for processing dictionary words
 */
export interface ProcessingOptions {
  includeHtmlProcessing?: boolean;
  customTransliterationMap?: Record<string, string>;
}

/**
 * Convert text from one script to another using sanscript
 */
export function convertText(
  text: string,
  from = "slp1",
  to = "itrans",
): string {
  try {
    return sanscript.t(text, from, to);
  } catch (error) {
    console.warn(
      `Failed to transliterate text "${text}" from ${from} to ${to}:`,
      error,
    );
    return text; // Return original text if transliteration fails
  }
}

/**
 * Generate word transcripts for different languages
 */
function getWordTranscripts(
  text: string,
  dictName: DictionaryName,
): LanguageValueType[] {
  const data: LanguageValueType[] = [];

  if (dictName === "dhatu_pata") {
    // For dhatu_pata, convert from Devanagari to all supported scripts
    for (const lang of SANSCRIPT_LANGS) {
      const value = convertText(text, "devanagari", lang);
      const valueTrimmed = value.trim();
      data.push({
        language: SANSCRIPT_LANGS_TO_DB[lang],
        value: valueTrimmed,
      });
    }
  } else if (LEXICON_SAN_DICT_LIST.includes(dictName)) {
    // For Sanskrit dictionaries, convert from SLP1 to all supported scripts
    for (const lang of SANSCRIPT_LANGS) {
      const value = convertText(text, "slp1", lang);
      data.push({
        language: SANSCRIPT_LANGS_TO_DB[lang],
        value: value,
      });
    }
  } else {
    // For non-Sanskrit dictionaries, treat as English
    data.push({
      language: "ENG",
      value: text,
    });
  }

  return data;
}

/**
 * Generate description transcripts for different languages
 */
function getDescriptionTranscripts(
  text: string,
  dictName: DictionaryName,
  word: string,
  options: ProcessingOptions = {},
): LanguageValueType[] {
  const data: LanguageValueType[] = [];

  // check if the text is html
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(text);

  if (dictName === "dhatu_pata") {
    // For dhatu_pata, convert from Devanagari to all supported scripts
    for (const lang of SANSCRIPT_LANGS) {
      const value = convertText(text, "devanagari", lang);
      const valueTrimmed = value.trim();
      data.push({
        language: SANSCRIPT_LANGS_TO_DB[lang],
        value: valueTrimmed,
      });
    }
  } else if (dictName === "eng2en") {
    // English-to-English dictionaries
    const valueTrimmed = text.trim();
    data.push({
      language: "ENG",
      value: valueTrimmed,
    });
  } else if (["pe", "md", "pui", "pgn"].includes(dictName)) {
    // HTML processing needed but not transliteration
    let value = text;
    if (options.includeHtmlProcessing || isHtml) {
      value = convertLexiconHtmlToMarkdown(
        dictName,
        text,
        word,
        undefined,
        customDictionaryWordHandlers,
      );
    }
    const valueTrimmed = value.trim();
    data.push({
      language: "ENG",
      value: valueTrimmed,
    });
  } else if (dictName === "eng2te") {
    // Telugu dictionaries - convert from Telugu script
    for (const lang of SANSCRIPT_LANGS) {
      const value = convertText(text, "telugu", lang);
      const valueTrimmed = value.trim();
      data.push({
        language: SANSCRIPT_LANGS_TO_DB[lang],
        value: valueTrimmed,
      });
    }
  } else {
    // Sanskrit dictionaries with HTML processing and transliteration
    for (const lang of SANSCRIPT_LANGS) {
      let value = text;
      if (options.includeHtmlProcessing || isHtml) {
        value = convertLexiconHtmlToMarkdown(
          dictName,
          text,
          word,
          lang,
          customDictionaryWordHandlers,
        );
      } else {
        // Simple transliteration without HTML processing
        value = convertText(text, "slp1", lang);
      }
      const valueTrimmed = value.trim();
      data.push({
        language: SANSCRIPT_LANGS_TO_DB[lang],
        value: valueTrimmed,
      });
    }
  }

  return data;
}

/**
 * Extract word and description from row data based on dictionary configuration
 */
function extractWordAndDescription(
  rowData: SqliteRowData,
  dictName: DictionaryName,
  tableMetadata: TableMetadata,
): { word: string; description: string } {
  const wordFieldName =
    tableMetadata.wordFieldName || LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName];
  const descFieldName =
    tableMetadata.descFieldName || LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName];

  let word = "";
  let description = "";

  // Extract word
  if (wordFieldName && rowData[wordFieldName] !== undefined) {
    word = String(rowData[wordFieldName] || "");
  }

  // Extract description
  if (descFieldName && rowData[descFieldName] !== undefined) {
    description = String(rowData[descFieldName] || "");
  }

  // Handle comma-separated description fields
  if (!description && descFieldName.includes(",")) {
    const fields = descFieldName.split(",");
    const values = fields
      .filter((field) => field in tableMetadata.columnPositions)
      .map((field) => String(rowData[field] || ""))
      .filter((value) => value);
    description = values.join(" ");
  }

  return { word, description };
}

/**
 * Determine language settings for a dictionary
 */
function getDictionaryLanguageSettings(dictName: DictionaryName): {
  wordLang: string;
  descriptionLang: string;
} {
  const customMapping = DICTIONARY_LANGUAGE_MAPPING[dictName];
  if (customMapping) {
    return customMapping;
  }

  // Default settings
  const wordLang = LEXICON_SAN_DICT_LIST.includes(dictName) ? "SLP1" : "ENG";
  return {
    wordLang,
    descriptionLang: "SLP1",
  };
}

/**
 * Process a single SQLite row into a dictionary word document
 */
export function processDictionaryWordRow(
  rowData: SqliteRowData,
  dictName: DictionaryName,
  wordIndex: number,
  tableMetadata: TableMetadata,
  options: ProcessingOptions = {},
): ProcessedDictionaryWord {
  if (LEXICON_TEL_DICT_LIST.includes(dictName)) {
    return processTeluguRow(rowData, dictName, wordIndex, tableMetadata);
  }

  // Extract word and description from row data
  const { word, description } = extractWordAndDescription(
    rowData,
    dictName,
    tableMetadata,
  );

  // Determine language settings
  const languageSettings = getDictionaryLanguageSettings(dictName);

  // Build source data object
  const sourceData = {
    data: rowData,
    wordField:
      tableMetadata.wordFieldName || LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName],
    descriptionField:
      tableMetadata.descFieldName || LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName],
    ...languageSettings,
  };

  // Generate transcripts
  const wordTranscripts = getWordTranscripts(word, dictName);
  const descriptionTranscripts = getDescriptionTranscripts(
    description,
    dictName,
    word,
    options,
  );

  // Generate phonetic string for search
  const phonetic = generatePhoneticString(
    wordTranscripts,
    descriptionTranscripts,
  );

  // Build the final document
  const document: ProcessedDictionaryWord = {
    wordIndex,
    origin: LEXICON_ALL_DICT_TO_DB_MAP[dictName],
    word: wordTranscripts,
    description: descriptionTranscripts,
    attributes: [], // Can be extended based on requirements
    phonetic,
    sourceData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add lnum if available
  if (
    "lnum" in rowData &&
    rowData.lnum !== null &&
    rowData.lnum !== undefined
  ) {
    document.wordLnum = Number(rowData.lnum);
  }

  return document;
}

/**
 * Process multiple SQLite rows into dictionary word documents
 */
export function processDictionaryWordRows(
  rows: SqliteRowData[],
  dictName: DictionaryName,
  tableMetadata: TableMetadata,
  options: ProcessingOptions = {},
): ProcessedDictionaryWord[] {
  return rows.map((row, index) =>
    processDictionaryWordRow(row, dictName, index + 1, tableMetadata, options),
  );
}

/**
 * Validate that a row has the required fields for processing
 */
export function validateRowData(
  rowData: SqliteRowData,
  dictName: DictionaryName,
  tableMetadata: TableMetadata,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const wordFieldName =
    tableMetadata.wordFieldName || LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName];
  if (!wordFieldName || !(wordFieldName in rowData)) {
    errors.push(
      `Missing word field '${wordFieldName}' for dictionary '${dictName}'`,
    );
  }

  const descFieldName =
    tableMetadata.descFieldName || LEXICON_ALL_TABLE_DESC_FIELD_MAP[dictName];
  if (!descFieldName) {
    errors.push(
      `Missing description field configuration for dictionary '${dictName}'`,
    );
  }

  if (!LEXICON_ALL_DICT_TO_DB_MAP[dictName]) {
    errors.push(`Unknown dictionary name '${dictName}'`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * DictionaryWord Lexicon Tag Handler Helpers
 */

const divHandler: TagHandler = ($, element, parser) => {
  const attrN = element.attr("n") as string;
  if (attrN && ["lb", "NI"].includes(attrN)) {
    parser.addToMarkdown("  \n");
  } else {
  }
  parser.processElement($, element);
};

const ignoreHandler: TagHandler = ($, element, parser) => {
  parser.addToMarkdown("");
};

const infoHandler: TagHandler = ($, element, parser) => {
  const tag = element.prop("tagName")?.toLowerCase();
  const text = element.text();
  const attrs = element.attr();
  const config = parser.getConfig();

  // console.log(
  //   `Processing tag: ${tag}, text: ${text}, attrs: ${JSON.stringify(attrs)}`,
  // );
  if (attrs) {
    parser.addToMarkdown(` (${tag}:`);
    for (const attrName in attrs) {
      const attrValue = attrs[attrName].trim();
      if (attrValue === "" || ["lex"].includes(attrName)) {
        // Ignore these tags
      } else if (["or", "verb", "parse"].includes(attrName)) {
        // "cp" ??
        const finalData = convertText(
          attrValue,
          config.fromLang,
          config.toLang,
        );
        parser.addToMarkdown(` ${attrName}: __${finalData}__ `);
      } else {
        parser.addToMarkdown(`${attrName}: ${attrValue} `);
      }
    }
    parser.addToMarkdown(` ${text} ) `);
  }
};

const keyHandler: TagHandler = ($, element, parser) => {
  // const tag = element.prop("tagName")?.toLowerCase();
  const currentKeyText = element.text();
  const configKeyText = parser.getConfig().keyWord;
  if (currentKeyText === configKeyText) {
    parser.addToMarkdown("");
  } else {
    parser.addToMarkdown("**");
    parser.processElement($, element);
    parser.addToMarkdown("**  \n");
  }
};

const s1Handler: TagHandler = ($, element, parser) => {
  const tag = element.prop("tagName")?.toLowerCase();
  const text = element.text();
  const slpAttr = element.attr("slp1");
  const config = parser.getConfig();
  if (slpAttr) {
    const convertedText = convertText(slpAttr, "slp1", config.toLang);
    parser.addToMarkdown(` __${convertedText}__ `);
  } else {
    const convertedText = convertText(text, "iast", config.toLang);
    parser.addToMarkdown(` __${convertedText}__ `);
  }
};

const customDictionaryWordHandlers = {
  h1: {
    open: "",
    close: "",
  },
  h: {
    open: "",
    close: "",
  },
  s1: s1Handler,
  key1: keyHandler,
  key2: keyHandler,
  body: "  \n",
  lb: "  \n",
  div: divHandler,
  b: {
    open: "",
    close: "",
  },
  ab: {
    open: " `",
    close: "` ",
  },
  tail: ignoreHandler,
  l: ignoreHandler,
  pc: ignoreHandler,
  info: infoHandler,
  vlex: infoHandler,
};

// ---------------------------------------------------------------------------
// Telugu-English dictionaries (Brown, Gwynn)
// ---------------------------------------------------------------------------

/** Script forms stored for Telugu text, in sanscript scheme names */
const TELUGU_FORMS: Array<[string, string]> = [
  ["TEL", "telugu"],
  ["SAN", "devanagari"],
  ["IAST", "iast"],
  // keeps the short/long e and o of Telugu apart
  ["ITRANS", "itrans_dravidian"],
  ["SLP1", "slp1"],
];

const TELUGU_RUN = /[ఀ-౿]+(?:[\s‌‍]+[ఀ-౿]+)*/g;

/** Transliterates only the Telugu runs of a text, leaving English alone */
function transliterateTeluguRuns(text: string, scheme: string): string {
  if (scheme === "telugu") return text;
  return text.replace(TELUGU_RUN, (m) => convertText(m, "telugu", scheme));
}

const CONSONANT_AFTER_N = /^[bcdfghjklpqstvxzDTNLS]/;

/**
 * Gwynn's romanisation → ITRANS (Dravidian variant): aa/ii/uu/ee/oo are long
 * vowels, e/o short, w = v, c = ch, ś = sh, S = Sh, ṛ = RRi, T/D/N/L retroflex.
 * n before a stop and a final m are written as anusvara, as Telugu does.
 */
export function gwynnToItrans(input: string): string {
  const s = input.normalize("NFC").replace(/!/g, "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    const next = s[i + 1] ?? "";
    if (two === "aa" || two === "ii" || two === "uu") {
      out += c.toUpperCase();
      i++;
    } else if (two === "ee" || two === "oo") {
      out += c === "e" ? "E" : "O";
      i++;
    } else if (c === "c") {
      if (next === "h") {
        out += "Ch";
        i++;
      } else out += "ch";
    } else if (c === "w") out += "v";
    else if (c === "ś") out += "sh";
    else if (c === "S") out += "Sh";
    else if (c === "ṛ") out += "RRi";
    else if (c === "ñ") out += "~n";
    else if (c === "ḥ") out += "H";
    else if (c === "n" && CONSONANT_AFTER_N.test(next) && !/[nymvwr]/.test(next)) out += "M";
    else if (c === "m" && (next === "" || /[\s,;)\]]/.test(next)) && i > 0) out += "M";
    else out += c;
  }
  return out;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** The small HTML these files use → Markdown */
export function simpleHtmlToMarkdown(html: string): string {
  return decodeEntities(
    html
      // a quotation tag glued to the previous word gets a space
      .replace(/([^\s(["“])<(tel|tam)>/g, "$1 <$2>")
      .replace(/<\/?(tel|tam)>/g, "")
      .replace(/<br\s*\/?>/gi, "  \n")
      .replace(/<p>\s*<\/p>/gi, "\n\n")
      .replace(/<\/?p>/gi, "\n\n")
      .replace(/<\/?(b|strong)>/gi, "**")
      .replace(/<\/?(i|em)>/gi, "_")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function processTeluguRow(
  rowData: SqliteRowData,
  dictName: DictionaryName,
  wordIndex: number,
  tableMetadata: TableMetadata,
): ProcessedDictionaryWord {
  const rawWord = String(rowData.key ?? "").normalize("NFC").trim();
  const rawData = String(rowData.data ?? "");
  const teluguWord =
    dictName === "gwynn_te"
      ? convertText(gwynnToItrans(rawWord), "itrans_dravidian", "telugu")
      : rawWord;

  const word: LanguageValueType[] = TELUGU_FORMS.map(([language, scheme]) => ({
    language,
    value: scheme === "telugu" ? teluguWord : convertText(teluguWord, "telugu", scheme),
  }));
  if (dictName === "gwynn_te") {
    // Gwynn's own spelling, so it can be searched as printed
    word.push({ language: "ENG", value: rawWord });
  }

  const markdown = simpleHtmlToMarkdown(rawData);
  const description: LanguageValueType[] =
    dictName === "brown_te"
      ? TELUGU_FORMS.map(([language, scheme]) => ({
          language,
          value: transliterateTeluguRuns(markdown, scheme),
        }))
      : [{ language: "ENG", value: markdown }];

  const languageSettings = getDictionaryLanguageSettings(dictName);
  const doc: ProcessedDictionaryWord = {
    wordIndex,
    origin: LEXICON_ALL_DICT_TO_DB_MAP[dictName],
    word,
    description,
    attributes: [],
    phonetic: generatePhoneticString(word, description),
    sourceData: {
      data: rowData,
      wordField: "key",
      descriptionField: "data",
      ...languageSettings,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (rowData.lnum !== null && rowData.lnum !== undefined) {
    doc.wordLnum = Number(rowData.lnum);
  }
  return doc;
}

// ---------------------------------------------------------------------------
// Building a search entry from a captured original row
// ---------------------------------------------------------------------------

export interface RawEntryInput {
  key: string;
  seq: number;
  row: SqliteRowData;
}

export interface SourceLayoutInput {
  table: string;
  columns: string[];
}

/** A DictWords document built from an original row */
export interface BuiltDictionaryEntry {
  wordIndex: number;
  wordLnum: number;
  origin: string;
  word: LanguageValueType[];
  description: LanguageValueType[];
  attributes: AttributeValueType[];
  phonetic: string;
  searchText: string;
  sourceKey: string;
  /** Pointer to the original row; the row itself stays in DictRawEntries */
  sourceData: { key: string; table: string; lnum?: number };
  processorVersion: number;
}

/**
 * Turns one captured original row into its search entry. Pure: the same row
 * and processor version always give the same entry.
 */
export function buildEntryFromRaw(
  dictName: DictionaryName,
  raw: RawEntryInput,
  layout: SourceLayoutInput,
): BuiltDictionaryEntry {
  const meta: TableMetadata = {
    tableName: layout.table,
    columns: layout.columns,
    columnPositions: Object.fromEntries(layout.columns.map((c, i) => [c, i])),
    wordFieldName: LEXICON_ALL_TABLE_WORD_FIELD_MAP[dictName] ?? "key",
    descFieldName: "",
    orderFieldName: "",
  };
  const doc = processDictionaryWordRow(raw.row, dictName, raw.seq, meta, {
    includeHtmlProcessing: true,
  });
  const lnum = raw.row.lnum;
  return {
    wordIndex: raw.seq,
    wordLnum: doc.wordLnum ?? 0,
    origin: doc.origin,
    word: doc.word,
    description: doc.description,
    attributes: doc.attributes,
    phonetic: doc.phonetic,
    searchText: buildSearchText(doc.word, doc.description),
    sourceKey: raw.key,
    sourceData: {
      key: raw.key,
      table: layout.table,
      ...(typeof lnum === "number" ? { lnum } : {}),
    },
    processorVersion: DICTIONARY_PROCESSOR_VERSION,
  };
}
