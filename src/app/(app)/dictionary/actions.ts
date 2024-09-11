"use server";

import { db } from "@/lib/db";
import { DictionaryItem } from "./types";
import { Prisma } from "@prisma/client";

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
  limit,
  offset,
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
    });

    const results = res.map((r) => {
      const item: DictionaryItem = {
        id: r.id,
        origin: r.origin,
        phonetic: r.phonetic,
        attributes: r.attributes,
        word: "",
        description: "",
        wordData: r.word,
        descriptionData: r.description,
      };
      item.word = (
        r.word.find((w) => w.language === language) || r.word[0]
      ).value;
      item.description = (
        r.description.find((w) => w.language === language) || r.description[0]
      ).value;
      return item;
    });
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

    const results: DictionaryItem[] = (res as any).map((r: any) => {
      const item: DictionaryItem = {
        id: r._id,
        origin: r.origin,
        phonetic: r.phonetic,
        attributes: r.attributes,
        word: "",
        description: "",
        wordData: r.word,
        descriptionData: r.description,
      };
      item.word = (
        r.word.find((w: any) => w.lang === language) || r.word[0]
      ).value;
      item.description = (
        r.description.find((w: any) => w.lang === language) || r.description[0]
      ).value;
      return item;
    });
    // console.log("searchDictionary", { total: countRes });
    return { results, total: ((countRes[0] as any)?.count as number) || 0 };
  }
};
