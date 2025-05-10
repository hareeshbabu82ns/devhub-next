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
}

export const searchDictionary = async ({
  dictFrom,
  queryText,
  queryOperation,
  language,
  limit = 10,
  offset = 0,
}: SearchDictParams) => {
  // console.log("searchDictionary", {
  //   dictFrom,
  //   queryText,
  //   queryOperation,
  //   language,
  //   limit,
  //   offset,
  // });
  if (dictFrom.length === 0 && queryText.length === 0) {
    return { results: [], total: 0 };
  }

  if (queryOperation !== "FULL_TEXT_SEARCH") {
    const where: Prisma.DictionaryWordFindManyArgs["where"] = {};
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
      ];
    }
    const count = await db.dictionaryWord.count({
      where,
    });
    const res = await db.dictionaryWord.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { wordIndex: "asc" },
    });

    const results: DictionaryItem[] = (res as any).map((i: any) =>
      mapDbToDictionary(i, language),
    );
    return { results, total: count };
  } else if (queryOperation === "FULL_TEXT_SEARCH") {
    const filter: any = { $text: { $search: queryText } };
    if (dictFrom.length > 0) {
      filter.origin = { $in: dictFrom };
    }
    const countRes = await db.dictionaryWord.aggregateRaw({
      pipeline: [{ $match: filter }, { $count: "count" }],
    });
    const res = await db.dictionaryWord.findRaw({
      filter,
      options: { limit, skip: offset },
    });

    const results: DictionaryItem[] = (res as any).map((i: any) =>
      mapDbToDictionary(i, language),
    );
    return { results, total: ((countRes[0] as any)?.count as number) || 0 };
  }
};
