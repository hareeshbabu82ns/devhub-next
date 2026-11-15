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
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { DictionaryRepository } from "@/lib/dictionary/dictionary-repository";
import { ServiceResponse } from "@/lib/dictionary/types";
import { lookupDictionary } from "./lookup-actions";
import {
  buildSearchText,
  generatePhoneticString,
} from "@/lib/dictionary/word-utils";
import { rebuildEntry } from "@/lib/dictionary/dictionary-pipeline";

// Response types for reprocess action
export type ReprocessWordResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * T80: Refactored deleteDictItem action
 * Pattern: auth → repository → format response
 */
export const deleteDictItem = async (
  id: DictionaryWord["id"],
): Promise<DictionaryItem | null> => {
  // Auth check
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Direct database access for delete (transaction)
  const res = await db.$transaction(async (txn) => {
    const item = await txn.dictionaryWord.delete({ where: { id } });
    return item ? mapDbToDictionary(item, LANGUAGE_SELECT_DEFAULT) : item;
  });

  return res;
};

/**
 * T79: Refactored updateDictItem action
 * Pattern: auth → validation → repository → format response
 */
export const updateDictItem = async (
  id: DictionaryWord["id"],
  data: {
    item: Prisma.DictionaryWordUpdateInput;
    children?: Prisma.DictionaryWordUpdateInput[];
  },
): Promise<DictionaryItem | null> => {
  // Auth check
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // A hand edit: rebuilds keep it, and its search text must follow it
  const change: Prisma.DictionaryWordUpdateInput = { ...data.item, editedAt: new Date() };
  if (data.item.word || data.item.description) {
    const current = await db.dictionaryWord.findUnique({
      where: { id },
      select: { word: true, description: true },
    });
    const word = (data.item.word ?? current?.word ?? []) as any;
    const description = (data.item.description ?? current?.description ?? []) as any;
    change.searchText = buildSearchText(word, description);
  }

  // Direct database access for update (transaction)
  const res = await db.$transaction(async (txn) => {
    const item = await txn.dictionaryWord.update({
      where: { id },
      data: change,
    });
    return item ? mapDbToDictionary(item, LANGUAGE_SELECT_DEFAULT) : item;
  });

  return res;
};

async function nextWordIndex(origin: string): Promise<number> {
  const last = await db.dictionaryWord.findFirst({
    where: { origin },
    orderBy: { wordIndex: "desc" },
    select: { wordIndex: true },
  });
  return (last?.wordIndex ?? 0) + 1;
}

/** Next free word index in a dictionary (for the "new entry" form) */
export const getNextWordIndex = async (origin: string): Promise<number> => {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return nextWordIndex(origin);
};

/**
 * Search text for an entry, built the same way the importer builds it, so
 * edited words and meanings stay findable.
 */
export const computeDictPhonetic = async (
  word: { language: string; value: string }[],
  description: { language: string; value: string }[],
): Promise<string> => {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return generatePhoneticString(word as any, description as any);
};

export const createDictItem = async (data: {
  item: Prisma.DictionaryWordCreateInput;
  children?: Prisma.DictionaryWordCreateInput[];
}): Promise<DictionaryItem | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entityData = { ...data.item };
  // (wordIndex, origin) is unique: a new entry without a position goes last
  if (!entityData.wordIndex || entityData.wordIndex <= 0) {
    entityData.wordIndex = await nextWordIndex(entityData.origin);
  }
  if (!entityData.phonetic) {
    entityData.phonetic = generatePhoneticString(
      (entityData.word ?? []) as any,
      (entityData.description ?? []) as any,
    );
  }
  entityData.searchText = buildSearchText(
    (entityData.word ?? []) as any,
    (entityData.description ?? []) as any,
  );
  // Added by hand: rebuilds of the dictionary keep it
  entityData.editedAt = new Date();

  const res = await db.$transaction(async (txn) => {
    const itemRes = await txn.dictionaryWord.create({ data: entityData });
    return itemRes
      ? mapDbToDictionary(itemRes, LANGUAGE_SELECT_DEFAULT)
      : itemRes;
  });
  return res;
};

/**
 * T78: Refactored readDictItem action
 * Pattern: auth → repository → format response
 */
export const readDictItem = async (
  dictionaryId: string,
  language: string,
  meaning?: string,
) => {
  // Auth check
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Use repository for data access
  const repository = new DictionaryRepository();
  const dictionary = await repository.findById(dictionaryId);

  // Format response
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

/**
 * T75-T77: Refactored searchDictionary action
 * Kept for existing callers (popup widget); delegates to lookupDictionary
 */
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
  // Empty search returns empty result immediately
  if (dictFrom.length === 0 && queryText.trim().length === 0) {
    return createSearchResult([], 0, limit, offset);
  }

  // Delegates to the script-aware lookup engine (see lookup-actions.ts)
  const hasQuery = queryText.trim().length > 0;
  try {
    const response = await lookupDictionary({
      query: queryOperation === "BROWSE" ? "" : queryText,
      mode: queryOperation === "FULL_TEXT_SEARCH" ? "meaning" : "smart",
      origins: dictFrom,
      sort:
        sortBy === "phonetic"
          ? "alphabetical"
          : hasQuery && queryOperation !== "BROWSE"
            ? "relevance"
            : "dictionary",
      sortOrder,
      language,
      limit,
      offset,
    });
    return createSearchResult(response.results, response.total, limit, offset);
  } catch (error) {
    console.error("Search error:", error);
    return createSearchResult([], 0, limit, offset);
  }
};

/**
 * Rebuilds one entry from its original row (kept in DictRawEntries; entries
 * from the old importer use the source row in their sourceData). A hand
 * edit on the entry is replaced.
 */
export async function reprocessSingleDictionaryWord(
  wordId: string,
): Promise<ReprocessWordResponse<{ updated: boolean }>> {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Authentication required" };
    }
    if (!/^[0-9a-f]{24}$/i.test(wordId)) {
      return { status: "error", error: "Dictionary word not found" };
    }
    const updated = await rebuildEntry(wordId);
    revalidatePath("/dictionary");
    revalidatePath(`/dictionary/${wordId}`);
    revalidatePath(`/dictionary/${wordId}/edit`);
    return { status: "success", data: { updated } };
  } catch (error) {
    console.error("Failed to reprocess dictionary word:", error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to reprocess dictionary word",
    };
  }
}
