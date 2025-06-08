/**
 * Utility functions for optimized dictionary search operations
 */

import { Prisma } from "@/app/generated/prisma";

export type SearchOperation = "FULL_TEXT_SEARCH" | "REGEX" | "BROWSE";
export type SortField = "wordIndex" | "phonetic" | "relevance";
export type SortOrder = "asc" | "desc";

export interface OptimizedSearchParams {
  dictFrom: string[];
  queryText: string;
  queryOperation: SearchOperation;
  language: string;
  limit: number;
  offset: number;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export interface SearchPipelineResult {
  countPipeline: any[];
  searchPipeline: any[];
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Generate optimized MongoDB aggregation pipelines for full-text search
 */
export function createFullTextSearchPipelines({
  dictFrom,
  queryText,
  sortBy,
  sortOrder,
  limit,
  offset,
}: Omit<
  OptimizedSearchParams,
  "queryOperation" | "language"
>): SearchPipelineResult {
  // Base match stage for full-text search
  const matchStage: any = {
    $text: {
      $search: queryText,
      $caseSensitive: false,
      $diacriticSensitive: false,
    },
  };

  // Add origin filter if specified
  if (dictFrom.length > 0) {
    matchStage.origin = { $in: dictFrom };
  }

  // Build sort stage based on sortBy parameter
  let sortStage: any;
  if (sortBy === "relevance") {
    // Sort by text search score for relevance, then by wordIndex
    sortStage = {
      $sort: {
        score: { $meta: "textScore" },
        wordIndex: 1,
      },
    };
  } else {
    const sortField =
      sortBy === "wordIndex"
        ? "wordIndex"
        : sortBy === "phonetic"
          ? "phonetic"
          : "wordIndex";

    sortStage = {
      $sort: {
        [sortField]: sortOrder === "desc" ? -1 : 1,
      },
    };
  }

  // Optimized count pipeline
  const countPipeline = [{ $match: matchStage }, { $count: "count" }];

  // Optimized search pipeline with projection to reduce data transfer
  const searchPipeline = [
    { $match: matchStage },
    ...(sortBy === "relevance"
      ? [{ $addFields: { score: { $meta: "textScore" } } }]
      : []),
    sortStage,
    { $skip: offset },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        origin: 1,
        wordIndex: 1,
        word: 1,
        description: 1,
        phonetic: 1,
        // Include score for relevance sorting
        ...(sortBy === "relevance" ? { score: 1 } : {}),
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  return { countPipeline, searchPipeline };
}

/**
 * Generate optimized Prisma where clause for regex search
 */
export function createRegexSearchWhere({
  dictFrom,
  queryText,
}: Pick<
  OptimizedSearchParams,
  "dictFrom" | "queryText"
>): Prisma.DictionaryWordFindManyArgs["where"] {
  const where: Prisma.DictionaryWordFindManyArgs["where"] = {};

  // Build optimized where clause to use indexes efficiently
  if (dictFrom.length > 0) {
    where.origin = { in: dictFrom };
  }

  if (queryText.length > 0) {
    // Use word field for regex search (more efficient than phonetic for this case)
    where.word = {
      some: {
        value: {
          contains: queryText,
          mode: "insensitive",
        },
      },
    };
  }

  return where;
}

/**
 * Generate optimized Prisma orderBy clause
 */
export function createSortConfig({
  sortBy,
  sortOrder,
}: Pick<
  OptimizedSearchParams,
  "sortBy" | "sortOrder"
>): Prisma.DictionaryWordOrderByWithRelationInput {
  const baseSort: Prisma.SortOrder =
    sortOrder === "desc" ? Prisma.SortOrder.desc : Prisma.SortOrder.asc;

  switch (sortBy) {
    case "wordIndex":
      return { wordIndex: baseSort };
    case "phonetic":
      return { phonetic: baseSort };
    case "relevance":
      // For non-full-text searches, fall back to wordIndex
      return { wordIndex: Prisma.SortOrder.asc };
    default:
      return { wordIndex: Prisma.SortOrder.asc };
  }
}

/**
 * Create standardized search result with pagination metadata
 */
export function createSearchResult<T>(
  results: T[],
  total: number,
  limit: number,
  offset: number,
): SearchResult<T> {
  const hasMore = offset + results.length < total;
  const nextOffset = hasMore ? offset + limit : undefined;

  return {
    results,
    total,
    hasMore,
    nextOffset,
  };
}

/**
 * Validate search parameters
 */
export function validateSearchParams(params: Partial<OptimizedSearchParams>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.language) {
    errors.push("Language parameter is required");
  }

  if (params.limit && (params.limit < 1 || params.limit > 100)) {
    errors.push("Limit must be between 1 and 100");
  }

  if (params.offset && params.offset < 0) {
    errors.push("Offset must be non-negative");
  }

  if (
    params.queryOperation === "FULL_TEXT_SEARCH" &&
    (!params.queryText || params.queryText.length < 2)
  ) {
    errors.push("Full-text search requires at least 2 characters");
  }

  if (
    params.queryOperation === "REGEX" &&
    (!params.queryText || params.queryText.length < 1)
  ) {
    errors.push("Regex search requires at least 1 character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Performance monitoring wrapper for search operations
 */
export async function withSearchMetrics<T>(
  operation: string,
  searchFn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await searchFn();
    const duration = Date.now() - startTime;

    // Log performance metrics (you can replace this with your preferred logging solution)
    console.log(`Dictionary search - ${operation}: ${duration}ms`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `Dictionary search - ${operation} failed after ${duration}ms:`,
      error,
    );
    throw error;
  }
}
