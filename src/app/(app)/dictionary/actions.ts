"use server";

import { db } from "@/lib/db";
import { DictionaryItem } from "./types";
import { DictionaryWord, Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { mapDbToDictionary } from "./utils";
import { LANGUAGE_SELECT_DEFAULT } from "@/lib/constants";

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
  queryOperation: "FULL_TEXT_SEARCH" | "REGEX";
  language: string;
  limit: number;
  offset: number;
  sortBy?: "wordIndex" | "phonetic" | "createdAt" | "updatedAt" | "relevance";
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
}: SearchDictParams) => {
  // console.log("searchDictionary", {
  //   dictFrom,
  //   queryText,
  //   queryOperation,
  //   language,
  //   limit,
  //   offset,
  //   sortBy,
  //   sortOrder,
  // });

  if (dictFrom.length === 0 && queryText.length === 0) {
    return { results: [], total: 0 };
  }

  // Optimize sorting to use appropriate indexes
  const getSortConfig = (): Prisma.DictionaryWordOrderByWithRelationInput => {
    const baseSort: Prisma.SortOrder =
      sortOrder === "desc" ? Prisma.SortOrder.desc : Prisma.SortOrder.asc;

    switch (sortBy) {
      case "wordIndex":
        return { wordIndex: baseSort };
      case "phonetic":
        return { phonetic: baseSort };
      case "createdAt":
        return { createdAt: baseSort };
      case "updatedAt":
        return { updatedAt: baseSort };
      case "relevance":
        // For relevance sorting with regex, fallback to wordIndex
        return { wordIndex: Prisma.SortOrder.asc };
      default:
        return { wordIndex: Prisma.SortOrder.asc };
    }
  };

  if (queryOperation !== "FULL_TEXT_SEARCH") {
    const where: Prisma.DictionaryWordFindManyArgs["where"] = {};

    // Build optimized where clause to use indexes efficiently
    if (dictFrom.length > 0) {
      where.origin = { in: dictFrom };
    }

    if (queryText.length > 0 && queryOperation === "REGEX") {
      where.OR = [
        {
          word: {
            some: { value: { contains: queryText, mode: "insensitive" } },
          },
        },
        {
          description: {
            some: { value: { contains: queryText, mode: "insensitive" } },
          },
        },
        {
          phonetic: { contains: queryText, mode: "insensitive" },
        },
      ];
    }

    const orderBy = getSortConfig();

    // Use optimized count query
    const count = await db.dictionaryWord.count({ where });

    // Use optimized find query with proper ordering to leverage indexes
    const res = await db.dictionaryWord.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy,
    });

    const results: DictionaryItem[] = res.map((i: any) =>
      mapDbToDictionary(i, language),
    );

    return { results, total: count };
  } else if (queryOperation === "FULL_TEXT_SEARCH") {
    // Build optimized MongoDB aggregation pipeline for full-text search
    const matchStage: any = { $text: { $search: queryText } };

    if (dictFrom.length > 0) {
      matchStage.origin = { $in: dictFrom };
    }

    // Build sort stage based on sortBy parameter
    let sortStage: any;
    if (sortBy === "relevance") {
      // Sort by text search score for relevance
      sortStage = { $sort: { score: { $meta: "textScore" }, wordIndex: 1 } };
    } else {
      const sortField =
        sortBy === "wordIndex"
          ? "wordIndex"
          : sortBy === "phonetic"
            ? "phonetic"
            : sortBy === "createdAt"
              ? "createdAt"
              : sortBy === "updatedAt"
                ? "updatedAt"
                : "wordIndex";

      sortStage = { $sort: { [sortField]: sortOrder === "desc" ? -1 : 1 } };
    }

    // Optimized count aggregation
    const countPipeline = [{ $match: matchStage }, { $count: "count" }];

    const countRes = await db.dictionaryWord.aggregateRaw({
      pipeline: countPipeline,
    });

    // Optimized search aggregation with pagination and sorting
    const searchPipeline = [
      { $match: matchStage },
      ...(sortBy === "relevance"
        ? [{ $addFields: { score: { $meta: "textScore" } } }]
        : []),
      sortStage,
      { $skip: offset },
      { $limit: limit },
    ];

    const res = await db.dictionaryWord.aggregateRaw({
      pipeline: searchPipeline,
    });

    const results: DictionaryItem[] = (res as any).map((i: any) =>
      mapDbToDictionary(i, language),
    );

    return {
      results,
      total: ((countRes[0] as any)?.count as number) || 0,
    };
  }

  // Fallback empty result
  return { results: [], total: 0 };
};
