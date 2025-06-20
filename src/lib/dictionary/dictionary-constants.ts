/**
 * Dictionary Constants for DevHub
 *
 * This module contains all the constants and mappings used for dictionary word processing
 * and conversion from SQLite to MongoDB format.
 */

/**
 * List of all supported dictionary names
 */
export const LEXICON_ALL_DICT: string[] = [
  // "abhyankar",
  "acc",
  "ae",
  // "amara",
  "ap90",
  // "aptehi",
  "armh",
  "ben",
  // "bharati",
  "bhs",
  // "bop",
  "bor",
  // "bur",
  "cae",
  // "ccs",
  "dhatu_pata",
  "eng2en",
  "eng2te",
  // "gra",
  "gst",
  "ieg",
  "inm",
  "krm",
  "lan",
  "mci",
  "md",
  "mw",
  "mw72",
  "mwe",
  // "pd",
  "pe",
  "pgn",
  "pui",
  // "pw",
  // "pwg",
  // "sch",
  "shs",
  "skd",
  // "skk",
  "snp",
  // "stc",
  // "upch",
  "vcp",
  "vei",
  "wil",
  "yat",
] as const;

export type DictionaryName = (typeof LEXICON_ALL_DICT)[number];

/**
 * Sanskrit dictionaries that require special Sanskrit processing
 */
export const LEXICON_SAN_DICT_LIST: DictionaryName[] = [
  "acc",
  "ap90",
  "armh",
  "ben",
  "bhs",
  "cae",
  "gst",
  "ieg",
  "inm",
  "krm",
  "lan",
  "mci",
  "md",
  "mw",
  "mw72",
  "pe",
  "pgn",
  "pui",
  "shs",
  "skd",
  "snp",
  "vcp",
  "vei",
  "wil",
  "yat",
];

/**
 * Sanskrit-to-Sanskrit dictionaries
 */
export const LEXICON_SAN_SAN_DICT_LIST: DictionaryName[] = ["dhatu_pata"];

/**
 * Dictionary name to database name mapping
 */
export const LEXICON_ALL_DICT_TO_DB_MAP: Record<DictionaryName, string> = {
  ...Object.fromEntries(
    LEXICON_ALL_DICT.map((name) => [name, name.toUpperCase()]),
  ),
  eng2te: "ENG2TEL",
  eng2en: "ENG2ENG",
} as Record<DictionaryName, string>;

/**
 * Dictionary name to table name mapping in SQLite databases
 */
export const LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP: Record<string, string> = {
  ...Object.fromEntries(LEXICON_ALL_DICT.map((name) => [name, name])),
  dhatu_pata: "dictEntries",
  eng2en: "entries",
};

/**
 * Table name to word field mapping
 */
export const LEXICON_ALL_TABLE_WORD_FIELD_MAP: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP).map((name) => [
      name,
      "key",
    ]),
  ),
  eng2te: "eng_word",
  dhatu_pata: "word",
  eng2en: "word",
};

/**
 * Table name to description field mapping
 */
export const LEXICON_ALL_TABLE_DESC_FIELD_MAP: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(LEXICON_ALL_DICT_TO_TABLE_NAMES_MAP).map((name) => [
      name,
      "data",
    ]),
  ),
  dhatu_pata: "desc",
  eng2te: "pos,pos_type,meaning",
  eng2en: "wordtype,definition",
};

/**
 * Sanscript language mappings to database language codes
 */
export const SANSCRIPT_LANGS_TO_DB: Record<string, string> = {
  devanagari: "SAN",
  iast: "IAST",
  itrans: "ITRANS",
  slp1: "SLP1",
  telugu: "TEL",
};

/**
 * Supported Sanscript languages for transliteration
 */
export const SANSCRIPT_LANGS = [
  "devanagari",
  "itrans",
  "iast",
  "slp1",
  "telugu",
] as const;

/**
 * Language detection patterns for different dictionary types
 */
export const DICTIONARY_LANGUAGE_MAPPING: Record<
  string,
  { wordLang: string; descriptionLang: string }
> = {
  acc: { wordLang: "SLP1", descriptionLang: "ENG" },
  eng2te: { wordLang: "ENG", descriptionLang: "TEL" },
  eng2en: { wordLang: "ENG", descriptionLang: "ENG" },
  pe: { wordLang: "SLP1", descriptionLang: "ENG" },
  pgn: { wordLang: "SLP1", descriptionLang: "ENG" },
  dhatu_pata: { wordLang: "SAN", descriptionLang: "SAN" },
  default: { wordLang: "SLP1", descriptionLang: "SLP1" },
};

/**
 * Sanskrit word language mappings for different dictionaries
 */
export const SANS_WORD_LANG: Record<string, string> = {
  ben: "iast",
  bhs: "iast",
  inm: "iast",
  lan: "iast",
  mci: "iast",
  mw72: "iast",
  pgn: "iast",
  pui: "iast",
  snp: "iast",
  vei: "iast",
  default: "slp1",
};

/**
 * Sanskrit word tag mappings for different dictionaries
 */
export const SANS_WORD_TAG: Record<string, string> = {
  ben: "i", // has both i and s
  bhs: "b",
  ieg: "i",
  inm: "i",
  lan: "b",
  mci: "i",
  mw72: "i", // has both i and s
  pgn: "i",
  pui: "i",
  snp: "i",
  vei: "b",
  default: "s",
};

/**
 * Transliteration scheme mappings
 */
export const TRANSLITERATION_SCHEMES = {
  DEVANAGARI: "devanagari",
  IAST: "iast",
  SLP1: "slp1",
  ITRANS: "itrans",
} as const;
