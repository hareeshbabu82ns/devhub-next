import { AttributeValueInput, LanguageValueInput } from "@/lib/types";

export type DictionaryItem = {
  id: string;
  origin: string;
  wordIndex: number;
  word: string;
  description: string;
  wordData: LanguageValueInput[];
  descriptionData: LanguageValueInput[];
  attributes: AttributeValueInput[];
  phonetic: string;
  sourceData?: Record<string, any>;
};

export type DictionarySearchResult = {
  results: Partial<DictionaryItem>[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
};

export type DictionaryItemResults = {
  total: number;
  results: Partial<DictionaryItem>[];
};

export type DictionaryItemByIDQueryResult = {
  item: Partial<DictionaryItem>;
};

export type DictionaryItemQueryResults = {
  items: DictionaryItemResults;
};

export type SearchOperation = "FULL_TEXT_SEARCH" | "REGEX" | "BROWSE";
export type SortField = "wordIndex" | "phonetic" | "relevance";
export type SortOrder = "asc" | "desc";

export interface DictionarySearchParams {
  dictFrom: string[];
  queryText: string;
  queryOperation: SearchOperation;
  language: string;
  limit: number;
  offset: number;
  sortBy: SortField;
  sortOrder: SortOrder;
}

/**
 * Enhanced search result with relevance scoring and highlighting
 * Used for Phase 3+ dictionary enhancements
 */
export interface SearchResult {
  id: string;
  origin: string;
  wordIndex: number;
  word: string;
  description: string;
  wordData: LanguageValueInput[];
  descriptionData: LanguageValueInput[];
  attributes: AttributeValueInput[];
  phonetic: string;
  sourceData?: Record<string, any>;
  
  // Enhancement fields
  relevanceScore: number; // 0-100 range
  highlightedWord?: string; // Word with HTML highlighting
  highlightedDescription?: string; // Description with HTML highlighting
  matchType: 'exact' | 'prefix' | 'contains' | 'none'; // Type of match
  textSnippet?: string; // Contextual snippet around match
}

/**
 * User filter options for advanced filtering
 * Used in Phase 5 (User Story 2)
 */
export interface UserFilter {
  // Dictionary origin filter (OR logic for multiple values)
  origin?: string[];
  
  // Language filter
  language?: string;
  
  // Word length range filter
  wordLengthMin?: number;
  wordLengthMax?: number;
  
  // Audio availability filter
  hasAudio?: boolean;
  
  // Attributes filter
  hasAttributes?: boolean;
  
  // Date range filter
  dateFrom?: Date | string;
  dateTo?: Date | string;
  
  // Advanced text filters
  scriptType?: 'devanagari' | 'telugu' | 'latin' | 'mixed';
  
  // Phonetic search filter
  phoneticSearch?: boolean;
}
