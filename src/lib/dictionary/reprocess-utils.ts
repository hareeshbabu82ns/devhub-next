/**
 * Shared utilities for reprocessing dictionary words
 */

import { processDictionaryWordRows } from "./dictionary-processor";
import { DictionaryName } from "./dictionary-constants";

/**
 * Shared utility for reprocessing dictionary words
 */
export interface ReprocessWordData {
  id: string;
  sourceData: any;
}

export interface ReprocessResult {
  processedWord: any;
  originalWord: ReprocessWordData;
}

export function reprocessDictionaryWordData(
  words: ReprocessWordData[],
  dictionary: DictionaryName,
): ReprocessResult[] {
  if (words.length === 0) {
    return [];
  }

  // Prepare rows from sourceData.data for processing
  const rowsForProcessing = words.map((word) => {
    const sourceData = word.sourceData as any;
    return sourceData?.data || {};
  });

  // Prepare table metadata from the first word's sourceData
  const firstWord = words[0];
  const firstSourceData = firstWord.sourceData as any;

  const tableMetadata = {
    tableName: `dict_${dictionary}`,
    columns: firstSourceData?.data ? Object.keys(firstSourceData.data) : [],
    columnPositions: firstSourceData?.data
      ? Object.keys(firstSourceData.data).reduce(
          (acc: Record<string, number>, key: string, index: number) => {
            acc[key] = index;
            return acc;
          },
          {},
        )
      : {},
    wordFieldName: firstSourceData?.wordField || "word",
    descFieldName: firstSourceData?.descriptionField || "description",
    orderFieldName: "wordIndex",
  };

  // Process the words
  const processedWords = processDictionaryWordRows(
    rowsForProcessing,
    dictionary,
    tableMetadata,
    {
      includeHtmlProcessing: true,
    },
  );

  // Return results paired with original words
  return processedWords.map((processedWord, index) => ({
    processedWord,
    originalWord: words[index],
  }));
}

/**
 * Database update interface for processed words
 */
export interface ProcessedWordUpdateData {
  word: any;
  description: any;
  phonetic: string;
  attributes: any;
  updatedAt: Date;
}

/**
 * Prepare update data for processed words
 */
export function prepareProcessedWordUpdates(
  results: ReprocessResult[],
): Array<{ id: string; data: ProcessedWordUpdateData }> {
  return results.map(({ processedWord, originalWord }) => ({
    id: originalWord.id,
    data: {
      word: processedWord.word,
      description: processedWord.description,
      phonetic: processedWord.phonetic,
      attributes: processedWord.attributes,
      updatedAt: new Date(),
    },
  }));
}
