/**
 * Dictionary Suggestion Provider
 *
 * Provides suggestions by querying the DictionaryWord model
 * Uses caching to avoid repeated database queries
 */

import {
  Suggestion,
  SuggestionProvider,
  SuggestionCache,
  normalizeForSuggestions,
} from "./suggestion-provider";
import { db } from "@/lib/db";
import Sanscript from "@indic-transliteration/sanscript";

/**
 * Dictionary-based suggestion provider
 */
export class DictionarySuggestionProvider implements SuggestionProvider {
  private cache: SuggestionCache;

  constructor(cacheSize: number = 100, cacheTTL: number = 5 * 60 * 1000) {
    this.cache = new SuggestionCache(cacheSize, cacheTTL);
  }

  /**
   * Get suggestions from dictionary database
   */
  async getSuggestions(
    text: string,
    options?: {
      language?: string;
      limit?: number;
      fromScheme?: string;
    },
  ): Promise<Suggestion[]> {
    const limit = options?.limit || 10;
    const normalizedQuery = normalizeForSuggestions(text, options?.fromScheme);

    if (!normalizedQuery) {
      return [];
    }

    // Check cache first
    const cacheKey = `${normalizedQuery}:${options?.language || "all"}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Multi-script search: normalize input to different schemes
      const searchTerms = this.generateSearchTerms(
        text,
        options?.fromScheme || "itrans",
      );

      // Query database with multiple script variants
      const results = await db.dictionaryWord.findMany({
        where: {
          OR: searchTerms.map((term) => ({
            phonetic: {
              contains: term,
              mode: "insensitive" as const,
            },
          })),
        },
        take: limit,
        orderBy: {
          wordIndex: "asc",
        },
      });

      // Convert to suggestions
      const suggestions: Suggestion[] = results.map((result) => {
        // Get first word value (prefer Sanskrit/Devanagari)
        const wordValue =
          result.word.find((w) => w.language === "sa")?.value ||
          result.word.find((w) => w.language === "devanagari")?.value ||
          result.word[0]?.value ||
          result.phonetic;

        return {
          key: text,
          value: wordValue,
          source: "dictionary",
          metadata: {
            language:
              result.word.find((w) => w.language === "sa")?.language ||
              result.word[0]?.language,
            origin: result.origin,
          },
        };
      });

      // Cache results
      this.cache.set(cacheKey, suggestions);

      return suggestions;
    } catch (error) {
      console.error("Error fetching dictionary suggestions:", error);
      return [];
    }
  }

  /**
   * Generate search terms in multiple scripts for better matching
   */
  private generateSearchTerms(text: string, fromScheme: string): string[] {
    const terms = new Set<string>();

    // Add original term
    terms.add(normalizeForSuggestions(text, fromScheme));

    // Try common transliteration schemes
    const schemes = ["devanagari", "iast", "itrans", "slp1"];

    for (const toScheme of schemes) {
      try {
        const transliterated = Sanscript.t(text, fromScheme, toScheme);
        terms.add(normalizeForSuggestions(transliterated, toScheme));
      } catch (error) {
        // Skip if transliteration fails
        continue;
      }
    }

    return Array.from(terms);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
