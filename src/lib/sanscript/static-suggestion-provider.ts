/**
 * Static Suggestion Provider
 *
 * Provides suggestions from predefined word lists (mantras, deity names, common terms)
 * Useful for offline functionality and frequently used religious/devotional terms
 */

import {
  Suggestion,
  SuggestionProvider,
  normalizeForSuggestions,
} from "./suggestion-provider";

/**
 * Word list entry structure
 */
interface WordListEntry {
  word: string;
  frequency?: number;
  language?: string;
}

/**
 * Static suggestion provider using predefined word lists
 */
export class StaticSuggestionProvider implements SuggestionProvider {
  private wordLists: Map<string, WordListEntry[]>;

  constructor(wordLists?: Record<string, WordListEntry[]>) {
    this.wordLists = new Map();

    // Load default word lists if not provided
    if (wordLists) {
      Object.entries(wordLists).forEach(([key, list]) => {
        this.wordLists.set(key, list);
      });
    } else {
      this.loadDefaultWordLists();
    }
  }

  /**
   * Load default word lists (common Sanskrit/Telugu terms)
   */
  private loadDefaultWordLists(): void {
    // Common Sanskrit mantras and terms
    const commonSanskrit: WordListEntry[] = [
      { word: "ॐ", frequency: 1000, language: "devanagari" },
      { word: "ॐ नमः शिवाय", frequency: 950, language: "devanagari" },
      { word: "ॐ नमो नारायणाय", frequency: 900, language: "devanagari" },
      { word: "श्री गणेशाय नमः", frequency: 850, language: "devanagari" },
      { word: "जय श्री राम", frequency: 800, language: "devanagari" },
      { word: "हरे कृष्ण", frequency: 750, language: "devanagari" },
      { word: "शांति", frequency: 700, language: "devanagari" },
      { word: "नमस्ते", frequency: 650, language: "devanagari" },
      { word: "धन्यवाद", frequency: 600, language: "devanagari" },
      { word: "प्रणाम", frequency: 550, language: "devanagari" },
    ];

    // Deity names
    const deityNames: WordListEntry[] = [
      { word: "शिव", frequency: 900, language: "devanagari" },
      { word: "विष्णु", frequency: 880, language: "devanagari" },
      { word: "ब्रह्मा", frequency: 860, language: "devanagari" },
      { word: "गणेश", frequency: 840, language: "devanagari" },
      { word: "लक्ष्मी", frequency: 820, language: "devanagari" },
      { word: "सरस्वती", frequency: 800, language: "devanagari" },
      { word: "हनुमान", frequency: 780, language: "devanagari" },
      { word: "कृष्ण", frequency: 760, language: "devanagari" },
      { word: "राम", frequency: 740, language: "devanagari" },
      { word: "दुर्गा", frequency: 720, language: "devanagari" },
    ];

    // Mantra beginnings (common prefixes)
    const mantraBeginnings: WordListEntry[] = [
      { word: "ॐ", frequency: 1000, language: "devanagari" },
      { word: "ॐ नमः", frequency: 950, language: "devanagari" },
      { word: "ॐ नमो", frequency: 900, language: "devanagari" },
      { word: "श्री", frequency: 850, language: "devanagari" },
      { word: "जय", frequency: 800, language: "devanagari" },
      { word: "हरे", frequency: 750, language: "devanagari" },
      { word: "नमः", frequency: 700, language: "devanagari" },
      { word: "नमो", frequency: 650, language: "devanagari" },
    ];

    this.wordLists.set("common-sanskrit", commonSanskrit);
    this.wordLists.set("deity-names", deityNames);
    this.wordLists.set("mantra-beginnings", mantraBeginnings);
  }

  /**
   * Get suggestions based on input text
   */
  async getSuggestions(
    text: string,
    options?: {
      language?: string;
      limit?: number;
    },
  ): Promise<Suggestion[]> {
    const limit = options?.limit || 10;
    const normalizedQuery = normalizeForSuggestions(text);

    if (!normalizedQuery) {
      return [];
    }

    const suggestions: Suggestion[] = [];

    // Search all word lists
    for (const [listName, words] of this.wordLists.entries()) {
      for (const entry of words) {
        const normalizedWord = normalizeForSuggestions(entry.word);

        // Match prefix or contains
        if (
          normalizedWord.startsWith(normalizedQuery) ||
          normalizedWord.includes(normalizedQuery)
        ) {
          suggestions.push({
            key: text,
            value: entry.word,
            source: "static",
            metadata: {
              frequency: entry.frequency,
              language: entry.language,
            },
          });
        }
      }
    }

    // Sort by frequency descending
    suggestions.sort((a, b) => {
      const freqA = a.metadata?.frequency || 0;
      const freqB = b.metadata?.frequency || 0;
      return freqB - freqA;
    });

    // Return top N
    return suggestions.slice(0, limit);
  }

  /**
   * Add custom word list
   */
  addWordList(name: string, words: WordListEntry[]): void {
    this.wordLists.set(name, words);
  }

  /**
   * Get all word list names
   */
  getWordListNames(): string[] {
    return Array.from(this.wordLists.keys());
  }
}
