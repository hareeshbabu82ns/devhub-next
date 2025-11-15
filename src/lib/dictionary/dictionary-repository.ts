/**
 * Dictionary Repository Layer
 * 
 * Purpose: Abstract data access from business logic
 * Pattern: Repository pattern with Prisma implementation
 * Testing: Supports dependency injection for mock implementations
 * 
 * Tasks: T001-T002
 */

import { PrismaClient, DictionaryWord, Prisma } from "@/app/generated/prisma";

/**
 * Query parameters for repository operations
 * Maps to database query needs without business logic
 */
export interface RepositoryQuery {
  // Search criteria
  queryText?: string;
  origins?: string[];
  language?: string;
  
  // Filters
  wordLengthMin?: number;
  wordLengthMax?: number;
  hasAudio?: boolean;
  hasAttributes?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  
  // Pagination
  limit: number;
  offset: number;
  
  // Sorting
  sortBy?: "wordIndex" | "phonetic" | "relevance";
  sortOrder?: "asc" | "desc";
}

/**
 * Database result with metadata
 */
export interface DatabaseResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Repository interface for dictionary data access
 * Implementations: PrismaDictionaryRepository (production), MockDictionaryRepository (testing)
 */
export interface IDictionaryRepository {
  /**
   * Find words matching query with pagination
   * Uses MongoDB full-text search when queryText provided
   */
  findWords(query: RepositoryQuery): Promise<DatabaseResult<DictionaryWord>>;
  
  /**
   * Count words matching filters without pagination
   * Efficient for large datasets (uses MongoDB count)
   */
  countWords(query: RepositoryQuery): Promise<number>;
  
  /**
   * Execute MongoDB aggregation pipeline for full-text search
   * Optimized for mobile performance (<800ms target)
   */
  aggregateSearch(query: RepositoryQuery): Promise<DatabaseResult<DictionaryWord>>;
  
  /**
   * Find single word by ID
   * Used for detail views and updates
   */
  findById(id: string): Promise<DictionaryWord | null>;
}

/**
 * Prisma-specific implementation of dictionary repository
 * Uses custom Prisma client from @/app/generated/prisma
 */
export class DictionaryRepository implements IDictionaryRepository {
  private db: PrismaClient;
  
  /**
   * Constructor accepts optional PrismaClient for testing
   * Default: uses singleton from @/lib/db
   */
  constructor(prismaClient?: PrismaClient) {
    // Import is deferred to avoid circular dependencies
    if (prismaClient) {
      this.db = prismaClient;
    } else {
      // Lazy load to avoid initialization issues
      const { db } = require("@/lib/db");
      this.db = db;
    }
  }
  
  /**
   * T003: Implement findWords method
   * Extracts Prisma query logic from searchDictionary action
   * Optimized for mobile (max 20 results recommended)
   */
  async findWords(query: RepositoryQuery): Promise<DatabaseResult<DictionaryWord>> {
    const {
      queryText,
      origins = [],
      limit,
      offset,
      sortBy = "wordIndex",
      sortOrder = "asc",
      wordLengthMin,
      wordLengthMax,
      hasAudio,
      hasAttributes,
      dateRange,
    } = query;
    
    // Build where clause
    const where: Prisma.DictionaryWordFindManyArgs["where"] = {};
    
    // Origin filter
    if (origins.length > 0) {
      where.origin = { in: origins };
    }
    
    // Text search filter (regex mode)
    if (queryText && queryText.length > 0) {
      where.word = {
        some: {
          value: {
            contains: queryText,
            mode: "insensitive",
          },
        },
      };
    }
    
    // Word length filter
    if (wordLengthMin !== undefined || wordLengthMax !== undefined) {
      where.phonetic = {};
      if (wordLengthMin !== undefined) {
        // Use phonetic length as proxy for word length
        where.phonetic = { ...where.phonetic, not: { lt: "a".repeat(wordLengthMin) } };
      }
      if (wordLengthMax !== undefined) {
        where.phonetic = { ...where.phonetic, not: { gt: "a".repeat(wordLengthMax) } };
      }
    }
    
    // Audio filter (check if audio field exists in sourceData)
    if (hasAudio !== undefined) {
      // MongoDB JSON query for audio field
      if (hasAudio) {
        where.sourceData = { path: ["audio"], not: Prisma.AnyNull };
      }
    }
    
    // Attributes filter
    if (hasAttributes !== undefined) {
      if (hasAttributes) {
        where.attributes = { isEmpty: false };
      } else {
        where.attributes = { isEmpty: true };
      }
    }
    
    // Date range filter
    if (dateRange?.start || dateRange?.end) {
      where.createdAt = {};
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start;
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end;
      }
    }
    
    // Build sort config
    const sortConfig: Prisma.SortOrder = sortOrder === "desc" ? "desc" : "asc";
    let orderBy: Prisma.DictionaryWordOrderByWithRelationInput;
    
    switch (sortBy) {
      case "phonetic":
        orderBy = { phonetic: sortConfig };
        break;
      case "relevance":
        // For non-full-text, fall back to wordIndex
        orderBy = { wordIndex: "asc" };
        break;
      default:
        orderBy = { wordIndex: sortConfig };
    }
    
    // Execute query with pagination
    const [data, total] = await Promise.all([
      this.db.dictionaryWord.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.db.dictionaryWord.count({ where }),
    ]);
    
    const hasMore = offset + data.length < total;
    
    return {
      data,
      total,
      hasMore,
    };
  }
  
  /**
   * T004: Implement countWords method
   * Efficient counting for large datasets with filter support
   */
  async countWords(query: RepositoryQuery): Promise<number> {
    const {
      queryText,
      origins = [],
      wordLengthMin,
      wordLengthMax,
      hasAudio,
      hasAttributes,
      dateRange,
    } = query;
    
    // Build where clause (same as findWords)
    const where: Prisma.DictionaryWordFindManyArgs["where"] = {};
    
    if (origins.length > 0) {
      where.origin = { in: origins };
    }
    
    if (queryText && queryText.length > 0) {
      where.word = {
        some: {
          value: {
            contains: queryText,
            mode: "insensitive",
          },
        },
      };
    }
    
    if (wordLengthMin !== undefined || wordLengthMax !== undefined) {
      where.phonetic = {};
      if (wordLengthMin !== undefined) {
        where.phonetic = { ...where.phonetic, not: { lt: "a".repeat(wordLengthMin) } };
      }
      if (wordLengthMax !== undefined) {
        where.phonetic = { ...where.phonetic, not: { gt: "a".repeat(wordLengthMax) } };
      }
    }
    
    if (hasAudio !== undefined && hasAudio) {
      where.sourceData = { path: ["audio"], not: Prisma.AnyNull };
    }
    
    if (hasAttributes !== undefined) {
      if (hasAttributes) {
        where.attributes = { isEmpty: false };
      } else {
        where.attributes = { isEmpty: true };
      }
    }
    
    if (dateRange?.start || dateRange?.end) {
      where.createdAt = {};
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start;
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end;
      }
    }
    
    return this.db.dictionaryWord.count({ where });
  }
  
  /**
   * T005: Implement aggregateSearch method
   * MongoDB full-text search pipelines optimized for mobile (<800ms target)
   */
  async aggregateSearch(query: RepositoryQuery): Promise<DatabaseResult<DictionaryWord>> {
    const {
      queryText,
      origins = [],
      limit,
      offset,
      sortBy = "wordIndex",
      sortOrder = "asc",
    } = query;
    
    if (!queryText || queryText.length < 2) {
      // Fall back to regular findWords for empty or short queries
      return this.findWords(query);
    }
    
    // Build MongoDB aggregation pipeline for full-text search
    const matchStage: any = {
      $text: {
        $search: queryText,
        $caseSensitive: false,
        $diacriticSensitive: false,
      },
    };
    
    if (origins.length > 0) {
      matchStage.origin = { $in: origins };
    }
    
    // Build sort stage
    let sortStage: any;
    if (sortBy === "relevance") {
      sortStage = {
        $sort: {
          score: { $meta: "textScore" },
          wordIndex: 1,
        },
      };
    } else {
      const sortField = sortBy === "phonetic" ? "phonetic" : "wordIndex";
      sortStage = {
        $sort: {
          [sortField]: sortOrder === "desc" ? -1 : 1,
        },
      };
    }
    
    // Count pipeline
    const countResult = await this.db.dictionaryWord.aggregateRaw({
      pipeline: [
        { $match: matchStage },
        { $count: "count" },
      ],
    });
    
    const total = Array.isArray(countResult) && countResult.length > 0 
      ? (countResult[0] as any).count 
      : 0;
    
    // Search pipeline
    const searchResult = await this.db.dictionaryWord.aggregateRaw({
      pipeline: [
        { $match: matchStage },
        ...(sortBy === "relevance" ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
        sortStage,
        { $skip: offset },
        { $limit: limit },
      ],
    });
    
    // Transform raw MongoDB results to DictionaryWord objects
    const data = Array.isArray(searchResult) 
      ? (searchResult as any[]).map((doc) => ({
          id: doc._id.$oid || doc._id,
          origin: doc.origin,
          wordIndex: doc.wordIndex,
          wordLnum: doc.wordLnum || 0,
          word: doc.word || [],
          description: doc.description || [],
          attributes: doc.attributes || [],
          phonetic: doc.phonetic || "",
          sourceData: doc.sourceData || null,
          createdAt: doc.createdAt ? new Date(doc.createdAt.$date || doc.createdAt) : new Date(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt.$date || doc.updatedAt) : new Date(),
        }))
      : [];
    
    const hasMore = offset + data.length < total;
    
    return {
      data,
      total,
      hasMore,
    };
  }
  
  /**
   * T006: Implement findById method
   * Single word lookup for detail views and updates
   */
  async findById(id: string): Promise<DictionaryWord | null> {
    return this.db.dictionaryWord.findUnique({
      where: { id },
    });
  }
}
