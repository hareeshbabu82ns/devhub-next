/**
 * Dictionary Word Utilities for DevHub
 *
 * This module provides utilities for generating phonetic strings from dictionary word and description arrays
 * for full-text search optimization. It includes transliteration support for Sanskrit and Telugu scripts
 * and filters out common stop words, numbers, and special characters.
 */

import { LanguageValueType } from "@/app/generated/prisma";
import sanscript from "@indic-transliteration/sanscript";

/**
 * Generate a condensed phonetic string from word and description arrays
 * for full text search optimization. Filters out duplicates, common articles,
 * grammatical strings, and special characters.
 */
export function generatePhoneticString(
  wordArray: LanguageValueType[] = [],
  descriptionArray: LanguageValueType[] = [],
  maxLength: number = 1000,
): string {
  const allWords: string[] = [];

  // Extract word values from all languages
  for (const wordItem of wordArray) {
    if (wordItem?.value) {
      const wordValue = wordItem.value.trim();
      if (wordValue) {
        // Get transliterated versions for non-English words
        const transliteratedWords = getTransliteratedWords(wordItem);
        for (const transWord of transliteratedWords) {
          const words = extractMeaningfulWords(transWord, maxLength);
          allWords.push(...words);
        }
      }
    }
  }

  // Extract description values with more aggressive filtering
  for (const descItem of descriptionArray) {
    if (descItem?.value) {
      const descValue = descItem.value.trim();
      if (descValue) {
        // Get transliterated versions for non-English descriptions
        const transliteratedWords = getTransliteratedWords(descItem);
        for (const transWord of transliteratedWords) {
          const words = extractMeaningfulWords(transWord, maxLength);
          allWords.push(...words);
        }
      }
    }
  }

  // Remove duplicates while preserving order and applying additional filters
  const seen = new Set<string>();
  const uniqueWords: string[] = [];

  for (const word of allWords) {
    // Convert to lowercase for deduplication
    const wordLower = word.toLowerCase();

    // Skip if already seen
    if (seen.has(wordLower)) {
      continue;
    }

    // Skip very short words
    if (wordLower.length < 2) {
      continue;
    }

    // Skip words that are mostly punctuation or special characters
    // a-zA-Z0-9: Basic Latin alphanumeric
    // \u0100-\u017F: Latin Extended-A (ā, ī, ū, ṛ, ṝ, ḷ, ḹ, etc.)
    // \u1E00-\u1EFF: Latin Extended Additional (ṭ, ḍ, ṇ, ś, ṣ, ṃ, ḥ, etc.)
    // \u0900-\u097F: Devanagari Unicode range (for Sanskrit)
    // \u0C00-\u0C7F: Telugu Unicode range
    const validChars = word.replace(
      /[a-zA-Z0-9\u0100-\u017F\u1E00-\u1EFF\u0900-\u097F\u0C00-\u0C7F]/g,
      "",
    );
    if (validChars.length > word.length * 0.5) {
      continue;
    }

    seen.add(wordLower);
    uniqueWords.push(word);
  }

  // Join words and normalize final whitespace
  let phoneticString = uniqueWords.join(" ");

  // Final cleanup: remove any remaining multiple spaces
  phoneticString = phoneticString.split(/\s+/).join(" ");

  return phoneticString;
}

/**
 * Get transliterated versions of a word/description item.
 * For non-English languages, returns ITRANS and SLP1 transliterations.
 * For English, returns the original value.
 */
export function getTransliteratedWords(item: LanguageValueType): string[] {
  if (!item?.value) {
    return [];
  }

  const lang = item.language?.toUpperCase() || "";
  const value = item.value.trim();

  if (!value) {
    return [];
  }

  // For English, return original value
  if (lang === "ENG") {
    return [value];
  }

  // Language mapping for transliteration
  const langMap: Record<string, string> = {
    SAN: "devanagari",
    TEL: "telugu",
    IAST: "iast",
    ITRANS: "itrans_dravidian",
    SLP1: "slp1",
  };

  // If language is not in our map, treat as original
  if (!(lang in langMap)) {
    return [value];
  }

  const transliteratedWords: string[] = [];

  try {
    // Add ITRANS transliteration if not already ITRANS
    if (lang !== "ITRANS") {
      const itransValue = sanscript.t(value, langMap[lang], "itrans_dravidian");
      if (itransValue && itransValue !== value) {
        transliteratedWords.push(itransValue);
      }
    }

    // Add SLP1 transliteration if not already SLP1
    if (lang !== "SLP1") {
      const slp1Value = sanscript.t(value, langMap[lang], "slp1");
      if (slp1Value && slp1Value !== value) {
        transliteratedWords.push(slp1Value);
      }
    }

    // If no transliterations were added, just return original value
    if (transliteratedWords.length === 0) {
      transliteratedWords.push(value);
    }
  } catch (error) {
    // If transliteration fails, just return original value
    console.error(`Transliteration error for '${value}' from ${lang}:`, error);
    return [value];
  }

  return transliteratedWords;
}

/**
 * Common articles, prepositions, and grammatical words to filter out
 */
export const STOP_WORDS = new Set([
  // English
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "must",
  "shall",
  "this",
  "that",
  "these",
  "those",
  "he",
  "she",
  "it",
  "they",
  "we",
  "you",
  "i",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "also",
  "only",
  "just",
  "very",
  "more",
  "most",
  "such",
  "some",
  "any",
  "each",
  "every",
  "all",
  "both",
  "either",
  "neither",
  "same",
  "different",
  "other",
  "another",
  "one",
  "two",
  "first",
  "last",
  "next",
  "previous",
  "many",
  "much",
  "few",
  "little",
  "less",
  "least",
  "than",
  "then",
  "now",
  "here",
  "there",
  "where",
  "when",
  "why",
  "how",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "if",
  "unless",
  "until",
  "while",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "out",
  "over",
  "under",
  "again",
  "further",
  "once",
  "see",
  "used",
  "name",
  "epithet",
  "term",
  "word",
  "meaning",
  "called",
  "known",

  // Punctuation and formatting words
  "said",
  "says",
  "called",
  "named",
  "known",
  "also",
  "see",
  "cf",
  "etc",
  "viz",
  "lit",
  "literally",
  "figuratively",
  "metaphorically",
  "esp",
  "especially",
  "particularly",
  "generally",
  "usually",
  "commonly",
  "often",
  "sometimes",
  "always",
  "never",
  "rarely",
  "frequently",

  // Telugu grammatical terms (common in dictionaries)
  "అను",
  "అందు",
  "అందువల్ల",
  "అంటే",
  "అయితే",
  "ఇది",
  "కాదు",
  "ఇలా",
  "మాత్రమే",
  "కాని",
  "అయిన",
  "అయినప్పటికీ",

  // Sanskrit grammatical terms (common in dictionaries)
  "च",
  "वा",
  "तु",
  "हि",
  "एव",
  "अपि",
  "तथा",
  "यथा",
  "इति",
  "किन्तु",
  "परन्तु",
  "अथवा",
  "यदि",
  "चेत्",
  "तर्हि",
  "तदा",
  "सः",
  "सा",
  "तत्",
  "ते",
  "ताः",
  "तानि",
  "एषः",
  "एषा",
  "एतत्",
  "एते",
  "एताः",
  "एतानि",

  // Common words that appear in transliterations
  "చ",
  "వా",
  "తు",
  "హి",
  "ఏవ",
  "అపి",
  "తథా",
  "యథా",
  "ఇతి",
  "కిన్తు",
  "పరన్తు",
  "అథవా",
  "యది",
  "చేత్",
  "తర్హి",
  "తదా",
  "సః",
  "సా",
  "తత్",
  "తే",
  "తాః",
  "తాని",
  "ఏషః",
  "ఏషా",
  "ఏతత్",
  "ఏతే",
  "ఏతాః",
  "ఏతాని",
  "vā",
  "tu",
  "tathā",
  "yathā",
  "athavā",
  "tadā",
  "saḥ",
  "sā",
  "tāḥ",
  "tāni",
  "eṣaḥ",
  "eṣā",
  "etāḥ",
  "etāni",
  "ca",
  "vA",
  "tu",
  "eva",
  "taTA",
  "yaTA",
  "aTavA",
  "cet",
  "tadA",
  "saH",
  "sA",
  "te",
  "tAH",
  "tAni",
  "ezaH",
  "ezA",
  "etat",
  "ete",
  "etAH",
  "etAni",
  "cha",
  "vA",
  "tu",
  "hi",
  "Eva",
  "api",
  "tathA",
  "yathA",
  "iti",
  "kintu",
  "parantu",
  "athavA",
  "yadi",
  "chEt",
  "tarhi",
  "tadA",
  "saH",
  "sA",
  "tat",
  "tE",
  "tAH",
  "tAni",
  "EShaH",
  "EShA",
  "Etat",
  "EtE",
  "EtAH",
  "EtAni",
]);

/**
 * Pattern to match special characters and HTML tags
 */
export const SPECIAL_CHARS_PATTERN =
  /[<>{}[\]().,;:!?"\'\-_=+*/\\|`~@#$%^&""'']+/g;

/**
 * Pattern to match numbers and single characters
 */
export const NUMBER_PATTERN = /^\d+$/;

/**
 * Clean and normalize text for phonetic indexing
 */
export function cleanText(text: string): string {
  if (!text) {
    return "";
  }

  // Remove HTML tags
  let cleanedText = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  cleanedText = cleanedText
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Remove special characters but keep spaces and basic punctuation
  cleanedText = cleanedText.replace(SPECIAL_CHARS_PATTERN, " ");

  // Normalize whitespace and trim
  cleanedText = cleanedText.split(/\s+/).join(" ").trim();

  return cleanedText.toLowerCase();
}

/**
 * Extract meaningful words from text, filtering out stop words
 */
export function extractMeaningfulWords(
  text: string,
  maxLength: number = 1000,
): string[] {
  if (!text) {
    return [];
  }

  // Limit text length to avoid bloat
  let limitedText = text;
  if (text.length > maxLength) {
    limitedText = text.substring(0, maxLength);
  }

  const cleanedText = cleanText(limitedText);
  const words = cleanedText.split(/\s+/);

  const meaningfulWords: string[] = [];
  for (const word of words) {
    // Skip if word is too short (less than 3 characters)
    if (word.length < 3) {
      continue;
    }

    // Skip if word is a number
    if (NUMBER_PATTERN.test(word)) {
      continue;
    }

    // Skip if word is in stop words list
    if (STOP_WORDS.has(word)) {
      continue;
    }

    // Skip if word is too long (likely corrupted or not meaningful)
    if (word.length > 50) {
      continue;
    }

    meaningfulWords.push(word);
  }

  return meaningfulWords;
}
