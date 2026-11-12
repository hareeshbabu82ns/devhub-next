/**
 * Transliteration schemes understood by the sanscript-utils service
 * (its `SanscriptScheme` GraphQL enum). The service also lists ENGLISH, but
 * rejects it for transliteration, so it is left out here.
 */
export enum TransliterationScheme {
  DEVANAGARI = "DEVANAGARI",
  IAST = "IAST",
  ITRANS = "ITRANS",
  SLP1 = "SLP1",
  TELUGU = "TELUGU",
  TAMIL = "TAMIL",
  KANNADA = "KANNADA",
}

export const TRANSLITERATION_SCHEMES = Object.values(TransliterationScheme);

export const TRANSLITERATION_SCHEME_LABELS: Record<
  TransliterationScheme,
  string
> = {
  DEVANAGARI: "Devanagari",
  IAST: "IAST",
  ITRANS: "ITRANS",
  SLP1: "SLP1",
  TELUGU: "Telugu",
  TAMIL: "Tamil",
  KANNADA: "Kannada",
};

export const LANGUAGE_TRANS_SCHEME_MAP: Record<string, TransliterationScheme> =
  {
    SAN: TransliterationScheme.DEVANAGARI,
    IAST: TransliterationScheme.IAST,
    TEL: TransliterationScheme.TELUGU,
    SLP1: TransliterationScheme.SLP1,
    ITRANS: TransliterationScheme.ITRANS,
    TAM: TransliterationScheme.TAMIL,
    ENG: TransliterationScheme.IAST,
  };

/** Dictionaries held by the sanscript-utils service (`Dictionary` enum) */
export const SANSCRIPT_DICTIONARIES = [
  "DHATU_PATA",
  "ENG2TEL",
  "WIL",
  "YAT",
  "GST",
  "BEN",
  "MW72",
  "LAN",
  "AP90",
  "CAE",
  "MD",
  "MW",
  "SHS",
  "AP",
  "PD",
  "MWE",
  "BOR",
  "AE",
  "ARMH",
  "VCP",
  "SKD",
  "INM",
  "VEI",
  "PUI",
  "BHS",
  "ACC",
  "KRM",
  "IEG",
  "SNP",
  "PE",
  "PGN",
  "MCI",
  "OTHERS",
] as const;

export type SanscriptDictionary = (typeof SANSCRIPT_DICTIONARIES)[number];

// Common types used throughout the API
export type LanguageTag = {
  word: string;
  tags: string[];
};

export type SentenceParseNode = {
  pada: string;
  root: string;
  tags: string[];
};

export type SentenceParseGraph = {
  node: SentenceParseNode;
  predecessor?: SentenceParseNode;
  relation?: string; //sambandha
};

export type SentenceParseAnalysis = {
  graph: SentenceParseGraph[];
};

export type SentenceParseResult = {
  analysis: SentenceParseAnalysis[];
  /** Graphviz source of the sandhi split lattice */
  splitDot?: string;
  /** Rendered image of `splitDot` */
  splitDotURL?: string;
  /** Graphviz source of each parse, in the order of `analysis` */
  parseDots?: string[];
  /** Rendered image of each parse, in the order of `analysis` */
  parseDotURLs?: string[];
};

export type PhoneticWord = {
  /** Phonetic (English-like) spelling the word is indexed under */
  key: string;
  word: string;
};

export type PhoneticWordResults = {
  total: number;
  results: PhoneticWord[];
};

export type SanscriptDictionaryItem = {
  id: string;
  wordIndex?: number | null;
  key: string;
  description?: string | null;
  origin: SanscriptDictionary;
};

export type SanscriptDictionaryResults = {
  total: number;
  results: SanscriptDictionaryItem[];
};
