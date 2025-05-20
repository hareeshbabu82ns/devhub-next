// Enum for transliteration schemes
export enum TransliterationScheme {
  DEVANAGARI = "DEVANAGARI",
  IAST = "IAST",
  TELUGU = "TELUGU",
  KANNADA = "KANNADA",
  MALAYALAM = "MALAYALAM",
  SLP1 = "SLP1",
  ITRANS = "ITRANS",
  HK = "HK",
  TAMIL = "TAMIL",
}

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
};
