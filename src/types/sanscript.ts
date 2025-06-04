import { LANGUAGES_TYPE } from "@/lib/constants";

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
