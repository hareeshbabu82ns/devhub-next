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

/** Where word forms are looked up (`Lexicon` enum) */
export const SANSCRIPT_LEXICONS = ["COMBINED", "INRIA", "SANSKRIT_DATA"] as const;

export type SanscriptLexicon = (typeof SANSCRIPT_LEXICONS)[number];

export const SANSCRIPT_LEXICON_LABELS: Record<SanscriptLexicon, string> = {
  COMBINED: "Combined",
  INRIA: "INRIA",
  SANSKRIT_DATA: "Sanskrit Data",
};

// Common types used throughout the API
export type LanguageTag = {
  /** The word as it was looked up */
  form?: string;
  /** The stem or root the form comes from */
  word: string;
  tags: string[];
};

/** A two-part sandhi decomposition of a single word */
export type SplitPair = {
  left: string;
  right: string;
  /** Both parts are words the lexicon knows */
  valid: boolean;
};

export type SentenceParseNode = {
  /** 0-based position of the word in the split */
  index?: number;
  pada: string;
  root?: string | null;
  tags: string[];
};

export type SentenceParseGraph = {
  node: SentenceParseNode;
  predecessor?: SentenceParseNode | null;
  relation?: string | null; //sambandha
};

export type SentenceParseAnalysis = {
  graph: SentenceParseGraph[];
  /** Lower is better */
  cost?: number;
  /** Graphviz source of this analysis */
  dot?: string;
  /** Rendered image of `dot` */
  dotURL?: string;
  /** The analysis as tab-separated CoNLL rows, one per word */
  conll?: string;
};

export type SentenceParseStatus = "OK" | "NO_PARSE" | "TIMEOUT";

export type SentenceParseResult = {
  /** The words of this sandhi split */
  split?: string[];
  status?: SentenceParseStatus;
  /** Analyses of this split, lowest cost first */
  analysis: SentenceParseAnalysis[];
  /**
   * Every relation that is possible between the words of the split: one row
   * per word, root, relation and governing word. Present even without a parse.
   */
  possibleRelations?: SentenceParseGraph[];
  /** Graphviz source of every possible relation between the words */
  splitDot?: string;
  /** Rendered image of `splitDot` */
  splitDotURL?: string;
};

/** An entry of the dhatupatha */
export type Dhatu = {
  dhatu: string;
  /** The root as taught, with its markers (anubandhas) */
  mulaDhatu: string;
  /** Meaning */
  artha: string;
  gana: string;
  /** Whether the root takes an object, as the dhatupatha words it */
  karmakatva: string;
  sakarmaka: boolean;
  dvikarmaka: boolean;
  /** Whether the root takes the augment i (seṭ / aniṭ / veṭ) */
  ittva: string;
  /** parasmaipadī / ātmanepadī / ubhayapadī */
  pada: string;
  /** Third person singular present */
  rupa: string;
};

export type Pratyahara = {
  name: string;
  varnas: string[];
};

export type MeterLine = {
  text: string;
  syllables: number;
  /** One letter per syllable: G for guru (heavy), L for laghu (light) */
  pattern: string;
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
