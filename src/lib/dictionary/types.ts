/**
 * Service Layer Types
 *
 * Task: T124, T201
 * Purpose: Type definitions for service layer (framework-agnostic)
 */

import { DictionaryWord } from "@/app/generated/prisma";

/**
 * Search mode enumeration for different search strategies
 * Task: T201
 */
export enum SearchMode {
  /** Full-text search across all fields (word, phonetic, description) */
  FULLTEXT = "FULLTEXT",
  /** Exact match on word field only (case-insensitive with normalization) */
  KEY_EXACT = "KEY_EXACT",
  /** Prefix match on word field only (case-insensitive with normalization) */
  KEY_PREFIX = "KEY_PREFIX",
}

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
 * Task: T202 - Added searchMode field
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
  /** Search mode: FULLTEXT (default), KEY_EXACT, or KEY_PREFIX */
  searchMode: SearchMode;
  /** Sort by: wordIndex (default), alphabetical (phonetic), or relevance */
  sortBy: "wordIndex" | "alphabetical" | "relevance";
  /** Sort direction: asc (default) or desc */
  sortDirection: "asc" | "desc";
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
  sortBy: "relevance" | "alphabetical" | "wordLength" | "wordIndex";
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
