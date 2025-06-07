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
