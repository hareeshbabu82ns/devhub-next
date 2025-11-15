/**
 * Service Layer Types
 * 
 * Task: T124
 * Purpose: Type definitions for service layer (framework-agnostic)
 */

import { DictionaryWord } from "@/app/generated/prisma";

/**
 * Service response wrapper with discriminated union for type safety
 * Enables exhaustive type checking in client components
 */
export type ServiceResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string; details?: string };

/**
 * User-facing filter configuration
 * Serializable to URL parameters and JSON
 */
export interface UserFilter {
  origins: string[];
  language: string | null;
  wordLengthMin: number | null;
  wordLengthMax: number | null;
  hasAudio: boolean | null;
  hasAttributes: boolean | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

/**
 * Search result with relevance scoring and highlighting
 * Extends DictionaryWord with computed fields
 */
export interface SearchResultItem extends DictionaryWord {
  relevanceScore: number; // 0-100 range
  matchType: "exact" | "prefix" | "fuzzy" | "phonetic";
  highlightedWord?: string; // Word with <mark> tags
  highlightedDescription?: string; // Description with <mark> tags
  searchMetadata?: {
    queryLanguage: string;
    matchedLanguage: string;
    scoreBreakdown: {
      textScore: number;
      prefixBonus: number;
      exactBonus: number;
    };
  };
}

/**
 * Paginated search result
 */
export interface SearchResult {
  results: SearchResultItem[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Search options for service layer
 */
export interface SearchOptions {
  queryText: string;
  filters: UserFilter;
  sortBy: "relevance" | "alphabetical" | "wordLength";
  sortDirection: "asc" | "desc";
  pagination: {
    limit: number;
    offset: number;
  };
}

/**
 * Filter validation result
 */
export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}
