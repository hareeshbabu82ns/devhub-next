/**
 * SearchService - Business Logic Layer
 * 
 * Tasks: T009, T117-T119
 * Purpose: Orchestrate search operations without framework dependencies
 * Pattern: Service layer with dependency injection
 * Testing: Pure functions, 90%+ testable without React
 */

import { DictionaryWord } from "@/app/generated/prisma";
import {
  IDictionaryRepository,
  RepositoryQuery,
} from "./dictionary-repository";
import {
  SearchOptions,
  SearchResult,
  SearchResultItem,
  ServiceResponse,
} from "./types";
import sanscript from "@indic-transliteration/sanscript";

/**
 * SearchService orchestrates dictionary search operations
 * Pure business logic - no database or React dependencies
 */
export class SearchService {
  private repository: IDictionaryRepository;

  /**
   * Constructor with dependency injection for testability
   */
  constructor(repository: IDictionaryRepository) {
    this.repository = repository;
  }

  /**
   * T117: Perform search with pagination and sorting
   * Orchestrates repository calls and relevance scoring
   */
  async performSearch(
    options: SearchOptions
  ): Promise<ServiceResponse<SearchResult>> {
    try {
      const { queryText, filters, sortBy, sortDirection, pagination } = options;

      // Normalize query text for multi-script matching
      const normalizedQueries = this.normalizeScripts(queryText);

      // Convert UserFilter to RepositoryQuery
      const repositoryQuery: RepositoryQuery = {
        queryText: queryText.trim(),
        origins: filters.origins,
        wordLengthMin: filters.wordLengthMin ?? undefined,
        wordLengthMax: filters.wordLengthMax ?? undefined,
        hasAudio: filters.hasAudio ?? undefined,
        hasAttributes: filters.hasAttributes ?? undefined,
        dateRange:
          filters.dateRange.start || filters.dateRange.end
            ? {
                start: filters.dateRange.start ?? undefined,
                end: filters.dateRange.end ?? undefined,
              }
            : undefined,
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy:
          sortBy === "alphabetical"
            ? "phonetic"
            : sortBy === "relevance"
              ? "relevance"
              : "wordIndex",
        sortOrder: sortDirection,
      };

      // Use aggregateSearch for full-text, findWords for regex
      const useFullText = queryText.trim().length >= 2;
      const dbResult = useFullText
        ? await this.repository.aggregateSearch(repositoryQuery)
        : await this.repository.findWords(repositoryQuery);

      // Calculate relevance scores for each result
      const scoredResults: SearchResultItem[] = dbResult.data.map((word) =>
        this.calculateRelevance(word, queryText, normalizedQueries)
      );

      // Sort by relevance if requested
      if (sortBy === "relevance") {
        scoredResults.sort(
          (a, b) => b.relevanceScore - a.relevanceScore
        );
      }

      const result: SearchResult = {
        results: scoredResults,
        total: dbResult.total,
        hasMore: dbResult.hasMore,
        nextOffset: dbResult.hasMore
          ? pagination.offset + pagination.limit
          : undefined,
      };

      return { status: "success", data: result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "error",
        error: "Search failed",
        details: errorMessage,
      };
    }
  }

  /**
   * T118: Calculate relevance score for a single result
   * Scoring algorithm: textScore (40%) + prefix match (30%) + exact match (30%)
   * Returns: 0-100 score range
   */
  calculateRelevance(
    word: DictionaryWord,
    queryText: string,
    normalizedQueries: string[]
  ): SearchResultItem {
    const query = queryText.toLowerCase().trim();
    let textScore = 0;
    let prefixBonus = 0;
    let exactBonus = 0;

    // Extract searchable text from word
    const wordTexts = word.word.map((w) => w.value.toLowerCase());
    const phonetic = word.phonetic.toLowerCase();
    const descriptions = word.description.map((d) => d.value.toLowerCase());

    // Calculate text score (basic string matching)
    const allTexts = [...wordTexts, phonetic, ...descriptions];
    for (const text of allTexts) {
      if (text.includes(query)) {
        textScore += 10; // Base match score
        
        // Check normalized variations
        for (const normalizedQuery of normalizedQueries) {
          if (text.includes(normalizedQuery.toLowerCase())) {
            textScore += 5; // Bonus for script-normalized match
          }
        }
      }
    }

    // Prefix match bonus (important for autocomplete)
    for (const text of wordTexts) {
      if (text.startsWith(query)) {
        prefixBonus = 30;
        break;
      }
      if (phonetic.startsWith(query)) {
        prefixBonus = Math.max(prefixBonus, 25);
      }
    }

    // Exact match bonus (highest relevance)
    for (const text of wordTexts) {
      if (text === query) {
        exactBonus = 30;
        break;
      }
      if (phonetic === query) {
        exactBonus = Math.max(exactBonus, 25);
      }
    }

    // Normalize text score to 0-40 range
    textScore = Math.min(textScore, 40);

    // Calculate final relevance score (0-100)
    const relevanceScore = textScore + prefixBonus + exactBonus;

    // Determine match type
    let matchType: "exact" | "prefix" | "fuzzy" | "phonetic" = "fuzzy";
    if (exactBonus > 0) {
      matchType = "exact";
    } else if (prefixBonus > 0) {
      matchType = "prefix";
    } else if (phonetic.includes(query)) {
      matchType = "phonetic";
    }

    return {
      ...word,
      relevanceScore: Math.min(relevanceScore, 100),
      matchType,
      searchMetadata: {
        queryLanguage: this.detectScript(queryText),
        matchedLanguage: word.word[0]?.language || "unknown",
        scoreBreakdown: {
          textScore,
          prefixBonus,
          exactBonus,
        },
      },
    };
  }

  /**
   * T119: Normalize query text using sanscript for multi-script matching
   * Converts query to multiple script variations (Devanagari, IAST, ITRANS)
   * Returns: Array of normalized queries
   */
  normalizeScripts(query: string): string[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const schemes = ["devanagari", "iast", "itrans", "telugu"];
    const sourceScheme = sanscript.detect(query) || "itrans";
    const variations: string[] = [query]; // Include original

    try {
      for (const targetScheme of schemes) {
        if (targetScheme !== sourceScheme) {
          const transliterated = sanscript.t(query, sourceScheme, targetScheme);
          if (transliterated && transliterated !== query) {
            variations.push(transliterated);
          }
        }
      }
    } catch (error) {
      // Ignore transliteration errors, return original query
      console.error("Transliteration error:", error);
    }

    // Deduplicate variations
    return [...new Set(variations)];
  }

  /**
   * Helper: Detect script of input text
   */
  private detectScript(text: string): string {
    const detected = sanscript.detect(text);
    return detected || "latin";
  }
}
