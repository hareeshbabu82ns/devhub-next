"use server";

import { db } from "@/lib/db";
import { DictionaryItem } from "./types";
import { DictionaryWord, Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { mapDbToDictionary } from "./utils";
import { LANGUAGE_SELECT_DEFAULT } from "@/lib/constants";
import {
  OptimizedSearchParams,
  SearchResult,
  createFullTextSearchPipelines,
  createRegexSearchWhere,
  createSortConfig,
  createSearchResult,
  validateSearchParams,
  withSearchMetrics,
} from "./search-utils";
import { processDictionaryWordRows } from "@/lib/dictionary/dictionary-processor";
import {
  DictionaryName,
  LEXICON_ALL_DICT_TO_DB_MAP,
} from "@/lib/dictionary/dictionary-constants";
import {
  reprocessDictionaryWordData,
  prepareProcessedWordUpdates,
  ReprocessWordData,
  ReprocessResult,
} from "@/lib/dictionary/reprocess-utils";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Response types for reprocess action
export type ReprocessWordResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Shared utility for updating processed words in database
 */
async function updateProcessedWords(results: ReprocessResult[]): Promise<void> {
  const updates = prepareProcessedWordUpdates(results);

  const updatePromises = updates.map(({ id, data }) => {
    return db.dictionaryWord.update({
      where: { id },
      data,
    });
  });

  await Promise.all(updatePromises);
}

export const deleteDictItem = async (
  id: DictionaryWord["id"],
): Promise<DictionaryItem | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const res = await db.$transaction(async (txn) => {
    const item = await txn.dictionaryWord.delete({ where: { id } });

    return item ? mapDbToDictionary(item, LANGUAGE_SELECT_DEFAULT) : item;
  });

  return res;
};

export const updateDictItem = async (
  id: DictionaryWord["id"],
  data: {
    item: Prisma.DictionaryWordUpdateInput;
    children?: Prisma.DictionaryWordUpdateInput[];
  },
): Promise<DictionaryItem | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const itemData = {
    ...data.item,
  };

  const res = await db.$transaction(async (txn) => {
    const item = await txn.dictionaryWord.update({
      where: { id },
      data: itemData,
    });
    return item ? mapDbToDictionary(item, LANGUAGE_SELECT_DEFAULT) : item;
  });

  return res;
};

export const createDictItem = async (data: {
  item: Prisma.DictionaryWordCreateInput;
  children?: Prisma.DictionaryWordCreateInput[];
}): Promise<DictionaryItem | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entityData = {
    ...data.item,
  };

  const res = await db.$transaction(async (txn) => {
    const itemRes = await txn.dictionaryWord.create({ data: entityData });
    return itemRes
      ? mapDbToDictionary(itemRes, LANGUAGE_SELECT_DEFAULT)
      : itemRes;
  });
  return res;
};

export const readDictItem = async (
  dictionaryId: string,
  language: string,
  meaning?: string,
) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const dictionary = await db.dictionaryWord.findUnique({
    where: { id: dictionaryId },
  });
  return dictionary
    ? mapDbToDictionary(dictionary, language, meaning)
    : dictionary;
};

interface SearchDictParams {
  dictFrom: string[];
  queryText: string;
  queryOperation: "FULL_TEXT_SEARCH" | "REGEX" | "BROWSE";
  language: string;
  limit: number;
  offset: number;
  sortBy?: "wordIndex" | "phonetic" | "relevance";
  sortOrder?: "asc" | "desc";
}

export const searchDictionary = async ({
  dictFrom,
  queryText,
  queryOperation,
  language,
  limit = 10,
  offset = 0,
  sortBy = "wordIndex",
  sortOrder = "asc",
}: SearchDictParams): Promise<SearchResult<DictionaryItem>> => {
  // Auto-browse: If search term is empty or just whitespace, use BROWSE operation
  const trimmedQueryText = queryText.trim();
  const effectiveOperation =
    trimmedQueryText.length === 0 ? "BROWSE" : queryOperation;

  // Validate search parameters
  const validation = validateSearchParams({
    dictFrom,
    queryText: trimmedQueryText,
    queryOperation: effectiveOperation,
    language,
    limit,
    offset,
    sortBy,
    sortOrder,
  });

  if (!validation.isValid) {
    throw new Error(
      `Invalid search parameters: ${validation.errors.join(", ")}`,
    );
  }

  if (dictFrom.length === 0 && trimmedQueryText.length === 0) {
    return createSearchResult([], 0, limit, offset);
  }

  return withSearchMetrics(`${effectiveOperation}_${sortBy}`, async () => {
    if (effectiveOperation === "FULL_TEXT_SEARCH") {
      // Use MongoDB aggregation pipeline for full-text search on phonetic and word fields
      const { countPipeline, searchPipeline } = createFullTextSearchPipelines({
        dictFrom,
        queryText: trimmedQueryText,
        sortBy,
        sortOrder,
        limit,
        offset,
      });

      try {
        const [countRes, searchRes] = await Promise.all([
          db.dictionaryWord.aggregateRaw({
            pipeline: countPipeline,
          }),
          db.dictionaryWord.aggregateRaw({
            pipeline: searchPipeline,
          }),
        ]);

        const results: DictionaryItem[] = (searchRes as any).map((i: any) =>
          mapDbToDictionary(i, language),
        );

        const total = ((countRes[0] as any)?.count as number) || 0;
        return createSearchResult(results, total, limit, offset);
      } catch (error) {
        console.error("Full-text search error:", error);
        return createSearchResult([], 0, limit, offset);
      }
    } else if (effectiveOperation === "REGEX") {
      // Use optimized Prisma queries for regex search on word.value field
      const where = createRegexSearchWhere({
        dictFrom,
        queryText: trimmedQueryText,
      });
      const orderBy = createSortConfig({ sortBy, sortOrder });

      try {
        // Use parallel execution for count and search
        const [count, searchResults] = await Promise.all([
          db.dictionaryWord.count({ where }),
          db.dictionaryWord.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy,
            select: {
              id: true,
              origin: true,
              wordIndex: true,
              word: true,
              description: true,
              phonetic: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
        ]);

        const results: DictionaryItem[] = searchResults.map((i: any) =>
          mapDbToDictionary(i, language),
        );

        return createSearchResult(results, count, limit, offset);
      } catch (error) {
        console.error("Regex search error:", error);
        return createSearchResult([], 0, limit, offset);
      }
    } else {
      // Handle browse mode or regex with empty query text
      const where: Prisma.DictionaryWordFindManyArgs["where"] = {};

      if (dictFrom.length > 0) {
        where.origin = { in: dictFrom };
      }

      // For BROWSE operation or empty query text, just filter by dictFrom
      const orderBy = createSortConfig({ sortBy, sortOrder });

      try {
        const [count, searchResults] = await Promise.all([
          db.dictionaryWord.count({ where }),
          db.dictionaryWord.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy,
            select: {
              id: true,
              origin: true,
              wordIndex: true,
              word: true,
              description: true,
              phonetic: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
        ]);

        const results: DictionaryItem[] = searchResults.map((i: any) =>
          mapDbToDictionary(i, language),
        );

        return createSearchResult(results, count, limit, offset);
      } catch (error) {
        console.error("Dictionary browse error:", error);
        return createSearchResult([], 0, limit, offset);
      }
    }
  });
};

/**
 * Reprocess a single dictionary word using processDictionaryWordRows
 */
export async function reprocessSingleDictionaryWord(
  wordId: string,
): Promise<ReprocessWordResponse<{ updated: boolean }>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Authentication required" };
    }

    console.log(`Starting reprocessing for word ID: ${wordId}`);

    // Fetch the dictionary word from database
    const dictionaryWord = await db.dictionaryWord.findUnique({
      where: { id: wordId },
      select: {
        id: true,
        origin: true,
        sourceData: true,
      },
    });

    if (!dictionaryWord) {
      return { status: "error", error: "Dictionary word not found" };
    }

    // Extract origin and determine dictionary name
    const origin = dictionaryWord.origin;

    // Find the dictionary name that maps to this origin
    const dictionaryEntry = Object.entries(LEXICON_ALL_DICT_TO_DB_MAP).find(
      ([_, dbOrigin]) => dbOrigin === origin,
    );

    if (!dictionaryEntry) {
      return { status: "error", error: `Unknown dictionary origin: ${origin}` };
    }

    const dictionary = dictionaryEntry[0] as DictionaryName;

    console.log(
      `Processing word from dictionary: ${dictionary} (origin: ${origin})`,
    );

    // Prepare row data for processing
    const wordData: ReprocessWordData = {
      id: wordId,
      sourceData: dictionaryWord.sourceData,
    };

    // Process the single word
    const results = await reprocessDictionaryWordData([wordData], dictionary);

    if (results.length === 0) {
      return { status: "error", error: "Failed to process word" };
    }

    // Update the word in database
    await updateProcessedWords(results);

    // Revalidate dictionary pages
    revalidatePath("/dictionary");
    revalidatePath(`/dictionary/${wordId}`);
    revalidatePath(`/dictionary/${wordId}/edit`);

    console.log(`Word reprocessing completed for ID: ${wordId}`);

    return {
      status: "success",
      data: { updated: true },
    };
  } catch (error) {
    console.error("Failed to reprocess dictionary word:", error);

    return { status: "error", error: "Failed to reprocess dictionary word" };
  }
}
