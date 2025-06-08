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
