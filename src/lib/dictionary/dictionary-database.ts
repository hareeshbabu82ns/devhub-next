/**
 * Dictionary Database Operations for DevHub
 *
 * This module handles the database operations for dictionary words,
 * separating the data processing from database interactions to enable
 * better testing and modularity.
 */

import { PrismaClient } from "@/app/generated/prisma";
import { ProcessedDictionaryWord } from "./dictionary-processor";

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: {
  processed: number;
  total: number;
  percentage: number;
  dictionary: string;
}) => void;

/**
 * Database operations interface for dictionary words
 */
export interface DictionaryWordDatabase {
  /**
   * Insert multiple dictionary words in bulk
   */
  insertMany(words: ProcessedDictionaryWord[]): Promise<void>;

  /**
   * Delete all words for a specific dictionary origin
   */
  deleteByOrigin(origin: string): Promise<void>;

  /**
   * Get count of words for a specific dictionary origin
   */
  countByOrigin(origin: string): Promise<number>;

  /**
   * Check if database is available/connected
   */
  isConnected(): Promise<boolean>;
}

/**
 * Bulk processing options
 */
export interface BulkProcessingOptions {
  chunkSize?: number;
  progressCallback?: ProgressCallback;
  deleteExisting?: boolean;
}

/**
 * Process and save dictionary words to database in bulk with progress tracking
 */
export async function saveDictionaryWordsBulk(
  words: ProcessedDictionaryWord[],
  database: DictionaryWordDatabase,
  dictionaryName: string,
  options: BulkProcessingOptions = {},
): Promise<void> {
  const {
    chunkSize = 5000,
    progressCallback,
    deleteExisting = false,
  } = options;

  const totalWords = words.length;
  let processedWords = 0;

  // Delete existing words if requested
  if (deleteExisting && words.length > 0) {
    const origin = words[0].origin;
    await database.deleteByOrigin(origin);
  }

  // Process words in chunks
  for (let i = 0; i < totalWords; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);

    try {
      await database.insertMany(chunk);
      processedWords += chunk.length;

      // Report progress
      if (progressCallback) {
        progressCallback({
          processed: processedWords,
          total: totalWords,
          percentage: Math.round((processedWords / totalWords) * 100),
          dictionary: dictionaryName,
        });
      }
    } catch (error) {
      console.error(
        `Failed to insert chunk ${i / chunkSize + 1} for dictionary ${dictionaryName}:`,
        error,
      );
      throw error;
    }
  }
}

/**
 * MongoDB implementation of DictionaryWordDatabase
 * This would be used in production with actual MongoDB connection
 */
export class MongoDictionaryWordDatabase implements DictionaryWordDatabase {
  constructor(private collection: any) {} // MongoDB collection

  async insertMany(words: ProcessedDictionaryWord[]): Promise<void> {
    await this.collection.insertMany(words);
  }

  async deleteByOrigin(origin: string): Promise<void> {
    await this.collection.deleteMany({ origin });
  }

  async countByOrigin(origin: string): Promise<number> {
    return await this.collection.countDocuments({ origin });
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.collection.findOne({}, { limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * In-memory implementation of DictionaryWordDatabase for testing
 */
export class InMemoryDictionaryWordDatabase implements DictionaryWordDatabase {
  private words: ProcessedDictionaryWord[] = [];

  async insertMany(words: ProcessedDictionaryWord[]): Promise<void> {
    this.words.push(...words);
  }

  async deleteByOrigin(origin: string): Promise<void> {
    this.words = this.words.filter((word) => word.origin !== origin);
  }

  async countByOrigin(origin: string): Promise<number> {
    return this.words.filter((word) => word.origin === origin).length;
  }

  async isConnected(): Promise<boolean> {
    return true;
  }

  // Additional methods for testing
  getAllWords(): ProcessedDictionaryWord[] {
    return [...this.words];
  }

  getWordsByOrigin(origin: string): ProcessedDictionaryWord[] {
    return this.words.filter((word) => word.origin === origin);
  }

  clear(): void {
    this.words = [];
  }
}

/**
 * Prisma implementation of DictionaryWordDatabase
 * This would be used with the existing Prisma setup
 */
export class PrismaDictionaryWordDatabase implements DictionaryWordDatabase {
  constructor(private prisma: PrismaClient) {} // PrismaClient

  async insertMany(words: ProcessedDictionaryWord[]): Promise<void> {
    // Convert to Prisma format
    const prismaWords = words.map((word) => ({
      wordIndex: word.wordIndex,
      origin: word.origin,
      word: word.word,
      description: word.description,
      attributes: word.attributes,
      phonetic: word.phonetic,
      sourceData: word.sourceData,
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
      ...(word.wordLnum && { wordLnum: word.wordLnum }),
    }));

    await this.prisma.dictionaryWord.createMany({
      data: prismaWords,
    });
  }

  async deleteByOrigin(origin: string): Promise<void> {
    await this.prisma.dictionaryWord.deleteMany({
      where: { origin },
    });
  }

  async countByOrigin(origin: string): Promise<number> {
    return await this.prisma.dictionaryWord.count({
      where: { origin },
    });
  }

  async isConnected(): Promise<boolean> {
    try {
      // Attempt a simple query to check connection
      await this.prisma.$runCommandRaw({
        ping: 1,
      });
      return true;
    } catch {
      return false;
    }
  }
}
