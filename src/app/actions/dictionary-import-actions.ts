/**
 * Dictionary Import Server Actions for DevHub
 *
 * These server actions provide a safe interface for importing dictionary data
 * from the web interface with proper authentication and error handling.
 */

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  importDictionaryFromSqlite,
  importMultipleDictionaries,
  ImportOptions,
} from "@/lib/dictionary/dictionary-import-orchestrator";
import { createSqliteDatabase } from "@/lib/dictionary/sqlite-database";
import { PrismaDictionaryWordDatabase } from "@/lib/dictionary/dictionary-database";
import {
  DictionaryName,
  LEXICON_ALL_DICT,
  LEXICON_ALL_DICT_TO_DB_MAP,
} from "@/lib/dictionary/dictionary-constants";
import {
  reprocessDictionaryWordData,
  prepareProcessedWordUpdates,
  ReprocessWordData,
} from "@/lib/dictionary/reprocess-utils";
import { resolve } from "path";
import { auth } from "@/lib/auth";
import config from "@/config";
import { processDictionaryWordRows } from "@/lib/dictionary/dictionary-processor";

// Response types for server actions
export type DictionaryImportResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Validation schemas
const ImportSingleDictionarySchema = z.object({
  dictionary: z.enum(LEXICON_ALL_DICT as [DictionaryName, ...DictionaryName[]]),
  options: z
    .object({
      limitRows: z.number().int().positive().optional(),
      chunkSize: z.number().int().positive().default(1000),
      validateData: z.boolean().default(false),
      deleteExisting: z.boolean().default(false),
      includeHtmlProcessing: z.boolean().default(true),
    })
    .optional(),
});

const ImportMultipleDictionariesSchema = z.object({
  dictionaries: z
    .array(z.enum(LEXICON_ALL_DICT as [DictionaryName, ...DictionaryName[]]))
    .min(1, "At least one dictionary must be specified"),
  options: z
    .object({
      limitRows: z.number().int().positive().optional(),
      chunkSize: z.number().int().positive().default(1000),
      validateData: z.boolean().default(false),
      deleteExisting: z.boolean().default(false),
      includeHtmlProcessing: z.boolean().default(true),
    })
    .optional(),
});

const GetDictionaryStatusSchema = z.object({
  dictionary: z.enum(LEXICON_ALL_DICT as [DictionaryName, ...DictionaryName[]]),
});

// Types
export interface DictionaryImportResult {
  dictionary: DictionaryName;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
  duration: number;
}

export interface DictionaryStatus {
  dictionary: DictionaryName;
  isAvailable: boolean;
  wordCount: number;
  lastImported?: Date;
  sqliteFileExists: boolean;
}

// Configuration
const SQLITE_DIR = resolve(config.dataFolder, "dict");

/**
 * Import a single dictionary from SQLite to database
 */
export async function importSingleDictionary(
  input: z.infer<typeof ImportSingleDictionarySchema>,
): Promise<DictionaryImportResponse<DictionaryImportResult>> {
  try {
    // Check authentication
    const user = await auth();
    if (!user) {
      // || user.user.role !== "ADMIN") {
      return { status: "error", error: "Unauthorized. Admin access required." };
    }

    // Validate input
    const validated = ImportSingleDictionarySchema.parse(input);
    const { dictionary, options = {} as ImportOptions } = validated;

    // Check if SQLite file exists
    const sqlitePath = resolve(SQLITE_DIR, `${dictionary}.sqlite`);

    // Initialize database connections
    const targetDb = new PrismaDictionaryWordDatabase(db);

    try {
      // Check database connection
      const isConnected = await targetDb.isConnected();
      if (!isConnected) {
        return { status: "error", error: "Database connection failed" };
      }

      // Open SQLite database
      const sqliteDb = await createSqliteDatabase(sqlitePath);

      try {
        // Import dictionary
        const result = await importDictionaryFromSqlite(
          sqliteDb,
          targetDb,
          dictionary,
          {
            limitRows: options.limitRows,
            chunkSize: options.chunkSize,
            validateData: options.validateData,
            deleteExisting: options.deleteExisting,
            includeHtmlProcessing: options.includeHtmlProcessing,
          } as ImportOptions,
        );

        // Revalidate dictionary pages
        revalidatePath("/dictionary");
        revalidatePath(`/dictionary/${dictionary}`);

        return { status: "success", data: result };
      } finally {
        await sqliteDb.close();
      }
    } finally {
      // await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Dictionary import failed:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    if (error instanceof Error) {
      return { status: "error", error: error.message };
    }

    return { status: "error", error: "Failed to import dictionary" };
  }
}

/**
 * Import multiple dictionaries with progress tracking
 */
export async function importMultipleDictionariesAction(
  input: z.infer<typeof ImportMultipleDictionariesSchema>,
): Promise<DictionaryImportResponse<DictionaryImportResult[]>> {
  try {
    // Check authentication
    const user = await auth();
    if (!user) {
      // || user.user.role !== "ADMIN") {
      return { status: "error", error: "Unauthorized. Admin access required." };
    }

    // Validate input
    const validated = ImportMultipleDictionariesSchema.parse(input);
    const { dictionaries, options = {} } = validated;

    // Build dictionary paths
    const dictionaryPaths = Object.fromEntries(
      dictionaries.map((dict) => [dict, resolve(SQLITE_DIR, `${dict}.sqlite`)]),
    ) as Record<DictionaryName, string>;

    // Initialize database
    const targetDb = new PrismaDictionaryWordDatabase(db);

    try {
      // Check database connection
      const isConnected = await targetDb.isConnected();
      if (!isConnected) {
        return { status: "error", error: "Database connection failed" };
      }

      // Import dictionaries
      const results = await importMultipleDictionaries(
        dictionaryPaths,
        targetDb,
        createSqliteDatabase,
        options,
      );

      // Revalidate dictionary pages
      revalidatePath("/dictionary");
      dictionaries.forEach((dict) => {
        revalidatePath(`/dictionary/${dict}`);
      });

      return { status: "success", data: results };
    } finally {
      // await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Multiple dictionary import failed:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    if (error instanceof Error) {
      return { status: "error", error: error.message };
    }

    return { status: "error", error: "Failed to import dictionaries" };
  }
}

/**
 * Get the status of a dictionary (word count, availability, etc.)
 */
export async function getDictionaryStatus(
  input: z.infer<typeof GetDictionaryStatusSchema>,
): Promise<DictionaryImportResponse<DictionaryStatus>> {
  try {
    // Check authentication
    const user = await auth();
    if (!user) {
      return { status: "error", error: "Authentication required" };
    }

    // Validate input
    const validated = GetDictionaryStatusSchema.parse(input);
    const { dictionary } = validated;

    // Check SQLite file existence
    const sqlitePath = resolve(SQLITE_DIR, `${dictionary}.sqlite`);
    const { existsSync } = await import("fs");
    const sqliteFileExists = existsSync(sqlitePath);

    // Get database info
    // const prisma = new PrismaClient();

    const origin =
      LEXICON_ALL_DICT_TO_DB_MAP[dictionary] || dictionary.toUpperCase();

    try {
      // Get word count from database
      const wordCount = await db.dictionaryWord.count({
        where: {
          origin,
        },
      });

      // Get latest import timestamp
      const latestWord = await db.dictionaryWord.findFirst({
        where: {
          origin,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      });

      const status: DictionaryStatus = {
        dictionary,
        isAvailable: wordCount > 0,
        wordCount,
        lastImported: latestWord?.createdAt,
        sqliteFileExists,
      };

      return { status: "success", data: status };
    } finally {
      // await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Failed to get dictionary status:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    return { status: "error", error: "Failed to get dictionary status" };
  }
}

/**
 * Get status for all dictionaries
 */
export async function getAllDictionaryStatuses(): Promise<
  DictionaryImportResponse<DictionaryStatus[]>
> {
  try {
    // Check authentication
    const user = await auth();
    if (!user) {
      return { status: "error", error: "Authentication required" };
    }

    const statuses: DictionaryStatus[] = [];

    for (const dictionary of LEXICON_ALL_DICT) {
      const result = await getDictionaryStatus({ dictionary });
      if (result.status === "success") {
        statuses.push(result.data);
      } else {
        // Create a basic status for failed queries
        statuses.push({
          dictionary,
          isAvailable: false,
          wordCount: 0,
          sqliteFileExists: false,
        });
      }
    }

    return { status: "success", data: statuses };
  } catch (error) {
    console.error("Failed to get all dictionary statuses:", error);
    return { status: "error", error: "Failed to get dictionary statuses" };
  }
}

/**
 * Delete all words for a specific dictionary
 */
export async function deleteDictionaryWords(
  input: z.infer<typeof GetDictionaryStatusSchema>,
): Promise<DictionaryImportResponse<{ deletedCount: number }>> {
  try {
    // Check authentication
    const user = await auth();
    if (!user) {
      // || user.user.role !== "ADMIN") {
      return { status: "error", error: "Unauthorized. Admin access required." };
    }

    // Validate input
    const validated = GetDictionaryStatusSchema.parse(input);
    const { dictionary } = validated;

    const origin =
      LEXICON_ALL_DICT_TO_DB_MAP[dictionary] || dictionary.toUpperCase();

    try {
      const result = await db.dictionaryWord.deleteMany({
        where: {
          origin,
        },
      });

      // Revalidate dictionary pages
      revalidatePath("/dictionary");
      revalidatePath(`/dictionary/${dictionary}`);

      return { status: "success", data: { deletedCount: result.count } };
    } finally {
      // await prisma.$disconnect();
    }
  } catch (error) {
    console.error("Failed to delete dictionary words:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    return { status: "error", error: "Failed to delete dictionary words" };
  }
}

/**
 * Reprocess existing dictionary words using processDictionaryWordRows in chunks
 */
export async function reprocessDictionaryWords(
  input: z.infer<typeof GetDictionaryStatusSchema>,
): Promise<
  DictionaryImportResponse<{ processedCount: number; updatedCount: number }>
> {
  try {
    // Check authentication
    const user = await auth();
    if (!user) {
      return { status: "error", error: "Authentication required" };
    }

    // Validate input
    const validated = GetDictionaryStatusSchema.parse(input);
    const { dictionary } = validated;

    const origin =
      LEXICON_ALL_DICT_TO_DB_MAP[dictionary] || dictionary.toUpperCase();
    const CHUNK_SIZE = 1000;

    console.log(
      `Starting reprocessing for dictionary: ${dictionary} (origin: ${origin})`,
    );

    try {
      let totalProcessed = 0;
      let totalUpdated = 0;
      let skip = 0;

      while (true) {
        // Fetch a chunk of dictionary words from Prisma
        const dictionaryWords = await db.dictionaryWord.findMany({
          where: { origin },
          orderBy: { wordIndex: "asc" },
          take: CHUNK_SIZE,
          skip,
          select: {
            id: true,
            sourceData: true,
          },
        });

        if (dictionaryWords.length === 0) {
          break; // No more records
        }

        console.log(
          `Processing chunk: ${skip + 1} to ${skip + dictionaryWords.length}`,
        );

        // Prepare word data for shared reprocessing function
        const wordsToReprocess: ReprocessWordData[] = dictionaryWords.map(
          (word) => ({
            id: word.id,
            sourceData: word.sourceData,
          }),
        );

        // Use shared reprocessing logic
        const results = await reprocessDictionaryWordData(
          wordsToReprocess,
          dictionary,
        );

        // Prepare updates using shared utility
        const updates = prepareProcessedWordUpdates(results);

        // Update the words in chunks
        const updatePromises = updates.map(({ id, data }) => {
          return db.dictionaryWord.update({
            where: { id },
            data,
          });
        });

        await Promise.all(updatePromises);

        totalProcessed += dictionaryWords.length;
        totalUpdated += results.length;
        skip += CHUNK_SIZE;

        console.log(`Chunk completed. Total processed: ${totalProcessed}`);
      }

      // Revalidate dictionary pages
      revalidatePath("/dictionary");
      revalidatePath(`/dictionary/${dictionary}`);

      console.log(
        `Reprocessing completed for ${dictionary}: ${totalProcessed} words processed, ${totalUpdated} updated`,
      );

      return {
        status: "success",
        data: {
          processedCount: totalProcessed,
          updatedCount: totalUpdated,
        },
      };
    } finally {
      // Cleanup if needed
    }
  } catch (error) {
    console.error("Failed to reprocess dictionary words:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    return { status: "error", error: "Failed to reprocess dictionary words" };
  }
}
