/**
 * Dictionary Word Processor for DevHub
 *
 * This module handles the conversion of SQLite row data to MongoDB-compatible
 * DictionaryWord documents. It's designed to be testable without requiring
 * database connections.
 */

import { LanguageValueType, AttributeValueType } from "@/app/generated/prisma";
import { generatePhoneticString } from "./word-utils";
import {
  DictionaryName,
  LEXICON_ALL_DICT_TO_DB_MAP,
  LEXICON_ALL_TABLE_WORD_FIELD_MAP,
  LEXICON_ALL_TABLE_DESC_FIELD_MAP,
  LEXICON_SAN_DICT_LIST,
  DICTIONARY_LANGUAGE_MAPPING,
  SANSCRIPT_LANGS,
  SANSCRIPT_LANGS_TO_DB,
} from "./dictionary-constants";
import sanscript from "@indic-transliteration/sanscript";
import { convertLexiconHtmlToMarkdown, TagHandler } from "./lexicon-utils";

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

const customDictionaryWordHandlers = {
  h1: {
    open: "",
    close: "",
  },
  h: {
    open: "",
    close: "",
  },
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
