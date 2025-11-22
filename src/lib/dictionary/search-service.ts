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
   * T117, T205: Perform search with pagination and sorting
   * Orchestrates repository calls and relevance scoring
   * T205: Added searchMode support for key-based searches
   */
  async performSearch(
    options: SearchOptions,
  ): Promise<ServiceResponse<SearchResult>> {
    try {
      const { queryText, filters, sortBy, sortDirection, pagination } = options;

      // T205: Extract searchMode from filters (default: FULLTEXT)
      const searchMode = filters.searchMode || "FULLTEXT";

      // T205: Apply script normalization BEFORE passing to repository
      // Normalize query term with NFC + conditional toLowerCase for Latin scripts
      const isLatin = /^[a-zA-Z\u0100-\u017F\u0180-\u024F]+$/.test(queryText);
      const normalizedQueryText = queryText.normalize("NFC");
      const searchQuery =
        searchMode !== "FULLTEXT" && isLatin
          ? normalizedQueryText.toLowerCase()
          : normalizedQueryText;

      // Normalize query text for multi-script matching (full-text mode)
      const normalizedQueries =
        searchMode === "FULLTEXT"
          ? this.normalizeScripts(queryText)
          : [searchQuery];

      // Convert UserFilter to RepositoryQuery
      const repositoryQuery: RepositoryQuery = {
        queryText: searchQuery.trim(),
        origins: filters.origins,
        language: filters.language ?? undefined,
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
        searchMode, // T205: Pass searchMode to repository
      };

      // T205: Repository handles branching based on searchMode
      // No routing needed here - findWords() method handles FULLTEXT vs KEY modes internally
      const dbResult = await this.repository.findWords(repositoryQuery);

      // Calculate relevance scores for each result
      // T206: Pass searchMode to calculateRelevance for key-based scoring
      const scoredResults: SearchResultItem[] = dbResult.data.map((word) =>
        this.calculateRelevance(
          word,
          searchQuery,
          normalizedQueries,
          searchMode,
        ),
      );

      // Sort by relevance if requested
      if (sortBy === "relevance") {
        scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
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
   * T118, T206: Calculate relevance score for a single result
   * Scoring algorithm: textScore (40%) + prefix match (30%) + exact match (30%)
   * T206: Added key-based scoring for KEY_EXACT and KEY_PREFIX modes
   * Returns: 0-100 score range
   */
  calculateRelevance(
    word: DictionaryWord,
    queryText: string,
    normalizedQueries: string[],
    searchMode: "FULLTEXT" | "KEY_EXACT" | "KEY_PREFIX" = "FULLTEXT",
  ): SearchResultItem {
    const query = queryText.toLowerCase().trim();
    let textScore = 0;
    let prefixBonus = 0;
    let exactBonus = 0;

    // Extract searchable text from word
    const wordTexts = word.word.map((w) => w.value.toLowerCase());
    const phonetic = word.phonetic.toLowerCase();
    const descriptions = word.description.map((d) => d.value.toLowerCase());

    // T206: Key-based scoring for KEY_EXACT and KEY_PREFIX modes
    if (searchMode === "KEY_EXACT" || searchMode === "KEY_PREFIX") {
      let baseScore = 0;
      let matchCount = 0;

      for (const text of wordTexts) {
        if (searchMode === "KEY_EXACT") {
          // Exact match: 100 score
          if (text === query) {
            baseScore = Math.max(baseScore, 100);
            matchCount++;
          }
        } else if (searchMode === "KEY_PREFIX") {
          // Prefix match: 80 + (15 × queryLength / wordLength)
          if (text.startsWith(query)) {
            if (query.length === text.length) {
              // Edge case: exact match via prefix → upgrade to 100
              baseScore = Math.max(baseScore, 100);
            } else if (query.length < text.length) {
              // Prefix formula: linear interpolation 80-95
              const prefixScore = 80 + 15 * (query.length / text.length);
              baseScore = Math.max(baseScore, prefixScore);
            }
            // Query longer than word: score = 0 (impossible prefix, no match)
            matchCount++;
          }
        }
      }

      // T206: Multiple matches in word array: +5 points per additional match (cap at +15)
      const multiMatchBonus =
        matchCount > 1 ? Math.min((matchCount - 1) * 5, 15) : 0;

      const relevanceScore = Math.min(baseScore + multiMatchBonus, 100);

      return {
        ...word,
        relevanceScore,
        matchType: baseScore === 100 ? "exact" : "prefix",
        searchMetadata: {
          queryLanguage: this.detectScript(queryText),
          matchedLanguage: word.word[0]?.language || "unknown",
          scoreBreakdown: {
            textScore: baseScore,
            prefixBonus: 0,
            exactBonus: multiMatchBonus,
          },
        },
      };
    }

    // FULLTEXT mode: original scoring algorithm
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

    // Valid sanscript scheme names
    const validSchemes = ["devanagari", "iast", "itrans", "telugu"];

    // Auto-detect source scheme using heuristic
    const sourceScheme = this.detectScript(query);

    // If source scheme is not valid for sanscript, skip transliteration
    if (!validSchemes.includes(sourceScheme)) {
      return [query];
    }

    const variations: string[] = [query]; // Include original

    try {
      for (const targetScheme of validSchemes) {
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
   * Returns valid sanscript scheme name or "unknown" for unsupported scripts
   */
  private detectScript(text: string): string {
    // Detect Unicode script ranges
    if (/[\u0900-\u097F]/.test(text)) return "devanagari";
    if (/[\u0C00-\u0C7F]/.test(text)) return "telugu";
    // IAST uses Latin characters with diacritical marks
    if (/[āīūṛṝḷḹēōṃḥṅñṭḍṇśṣ]/.test(text)) return "iast";
    // If plain ASCII/Latin without IAST marks, assume ITRANS
    if (/^[a-zA-Z0-9\s\-\/]+$/.test(text)) return "itrans";
    // Unknown script - don't attempt transliteration
    return "unknown";
  }
}
