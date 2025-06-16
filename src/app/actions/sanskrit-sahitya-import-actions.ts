/**
 * Sanskrit Sahitya Import Server Actions for DevHub
 *
 * These server actions provide a safe interface for importing Sanskrit literature data
 * from the sanskritsahitya.com JSON format with proper authentication and error handling.
 */

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  parseSanskritSahityaData,
  validateSanskritSahityaData,
  type ParsedHierarchy,
} from "@/lib/scrape/sanskrit-sahitya-parser";
import { transliteratedText } from "../(app)/sanscript/_components/utils";

// Response types for server actions
export type SanskritSahityaImportResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Input validation schema
const ImportSanskritSahityaSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  options: z
    .object({
      deleteExisting: z.boolean().default(false),
      bookmarkAll: z.boolean().default(false),
      defaultLanguage: z.string().default("SAN"), // Sanskrit
      meaningLanguage: z.string().default("ENG"), // English
      entityType: z.string().default("KAVYAM"), // Default entity type
      parentId: z.string().optional(), // Parent entity ID
    })
    .optional(),
});

type ImportSanskritSahityaInput = z.infer<typeof ImportSanskritSahityaSchema>;

/**
 * Parses Sanskrit Sahitya data from a JSON file (without database operations)
 * Supports split files with numbered suffixes (e.g., ramayanam1.json, ramayanam2.json)
 */
export async function parseSanskritSahityaFile(
  filePath: string,
  options?: {
    defaultLanguage?: string;
    meaningLanguage?: string;
    bookmarkAll?: boolean;
    entityType?: string;
    parentId?: string;
  },
): Promise<SanskritSahityaImportResponse<ParsedHierarchy>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return { status: "error", error: "Unauthorized access" };
    }

    // Read and parse JSON file(s) - handle split files
    const combinedData = await readAndCombineSplitFiles(filePath);

    // // Clean up any null values that might cause validation issues
    // if (combinedData.data && Array.isArray(combinedData.data)) {
    //   let nullChCount = 0;
    //   combinedData.data = combinedData.data.map(
    //     (record: any, index: number) => {
    //       if (record.ch === null) {
    //         nullChCount++;
    //         console.log(`Cleaning null ch field at index ${index}`);
    //         const { ch, ...cleanRecord } = record;
    //         return cleanRecord;
    //       }
    //       return record;
    //     },
    //   );
    //   console.log(`Cleaned ${nullChCount} records with null ch fields`);
    // }

    // Validate JSON structure
    const sahityaData = validateSanskritSahityaData(combinedData);

    // Parse data into entity hierarchy
    const parsedHierarchy = parseSanskritSahityaData(sahityaData, options);

    return {
      status: "success",
      data: parsedHierarchy,
    };
  } catch (error) {
    console.error("Sanskrit Sahitya parsing failed:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        status: "error",
        error: "Invalid JSON file format",
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "Failed to parse Sanskrit Sahitya data",
    };
  }
}

/**
 * Imports Sanskrit Sahitya data from a JSON file into the database
 * Supports split files with numbered suffixes (e.g., ramayanam1.json, ramayanam2.json)
 */
export async function importSanskritSahityaData(
  input: ImportSanskritSahityaInput,
): Promise<
  SanskritSahityaImportResponse<{ entitiesCreated: number; bookTitle: string }>
> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return { status: "error", error: "Unauthorized access" };
    }

    // Validate input
    const validated = ImportSanskritSahityaSchema.parse(input);
    const { filePath, options } = validated;
    const {
      deleteExisting = false,
      bookmarkAll = false,
      defaultLanguage = "SAN",
      meaningLanguage = "ENG",
      entityType = "KAVYAM",
      parentId,
    } = options || {};

    // Parse the file(s) first - this will handle split files automatically
    const parseResult = await parseSanskritSahityaFile(filePath, {
      defaultLanguage,
      meaningLanguage,
      bookmarkAll,
      entityType,
      parentId,
    });

    if (parseResult.status === "error") {
      return parseResult;
    }

    const hierarchy = parseResult.data;

    // Delete existing entities if requested
    if (deleteExisting) {
      await db.entity.deleteMany({
        where: {
          attributes: {
            some: {
              key: "rootTitle",
              value: hierarchy.root.text[0].value,
            },
          },
        },
      });
    }

    // Create entities in database
    const createdEntities = await createEntitiesInDatabase(hierarchy);

    // Revalidate relevant paths
    revalidatePath("/entity");
    revalidatePath("/dashboard");

    return {
      status: "success",
      data: {
        entitiesCreated: createdEntities.length,
        bookTitle: hierarchy.metadata.rootTitle,
      },
    };
  } catch (error) {
    console.error("Sanskrit Sahitya import failed:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "Failed to import Sanskrit Sahitya data",
    };
  }
}

/**
 * Creates entities in the database from parsed hierarchy
 * Handles both hierarchical Books[Chapters[Verses[]]] and flat Chapters[Verses[]] structures
 */
async function createEntitiesInDatabase(hierarchy: ParsedHierarchy) {
  const createdEntities = [];

  // Create root entity
  const rootData: any = {
    type: hierarchy.root.type,
    text: transliteratedText(hierarchy.root.text, [
      "SAN",
      "IAST",
      "SLP1",
      "ITRANS",
      "TEL",
    ]),
    meaning: hierarchy.root.meaning,
    attributes: hierarchy.root.attributes,
    bookmarked: hierarchy.root.bookmarked,
    order: hierarchy.root.order,
    notes: hierarchy.root.notes,
  };

  // Add parent connection if parentId is provided
  if (hierarchy.root.parentId) {
    rootData.parents = [hierarchy.root.parentId];
  }

  const rootEntity = await db.entity.create({
    data: rootData,
  });
  createdEntities.push(rootEntity);

  // Update parent entity to include root as child if parentId exists
  if (hierarchy.root.parentId) {
    await db.entity.update({
      where: { id: hierarchy.root.parentId },
      data: {
        children: {
          push: rootEntity.id,
        },
      },
    });
  }

  // Create book entities and track their IDs (if books exist)
  const bookIdMap = new Map<string, string>();
  for (const book of hierarchy.books) {
    const bookNumberAttr = book.attributes.find(
      (attr) => attr.key === "bookNumber",
    );
    const bookNumber = bookNumberAttr?.value || "";

    const bookEntity = await db.entity.create({
      data: {
        type: book.type,
        text: transliteratedText(book.text, [
          "SAN",
          "IAST",
          "SLP1",
          "ITRANS",
          "TEL",
        ]),
        meaning: transliteratedText(book.meaning, [
          "SAN",
          "IAST",
          "SLP1",
          "ITRANS",
          "TEL",
        ]),
        attributes: book.attributes,
        bookmarked: book.bookmarked,
        order: book.order,
        notes: book.notes,
        parents: [rootEntity.id],
      },
    });

    bookIdMap.set(bookNumber, bookEntity.id);
    createdEntities.push(bookEntity);

    // Update root entity to include book as child
    await db.entity.update({
      where: { id: rootEntity.id },
      data: {
        children: {
          push: bookEntity.id,
        },
      },
    });
  }

  // Create chapter entities and track their IDs
  const chapterIdMap = new Map<string, string>();
  for (const chapter of hierarchy.chapters) {
    const chapterNumberAttr = chapter.attributes.find(
      (attr) => attr.key === "chapterNumber",
    );
    const chapterNumber = chapterNumberAttr?.value || "";

    let parentIds = [rootEntity.id];

    // Handle hierarchical structure based on parent relation
    if (
      chapter.parentRelation?.type === "book" &&
      chapter.parentRelation.bookNumber
    ) {
      const parentBookId = bookIdMap.get(chapter.parentRelation.bookNumber);
      if (parentBookId) {
        parentIds = [parentBookId];
      }
    } else if (
      chapter.parentRelation?.type === "chapter" &&
      chapter.parentRelation.chapterNumber
    ) {
      // Handle sub-chapters (find parent chapter)
      const parentChapterId = chapterIdMap.get(
        chapter.parentRelation.chapterNumber,
      );
      if (parentChapterId) {
        parentIds = [parentChapterId];
      }
    }

    const chapterEntity = await db.entity.create({
      data: {
        type: chapter.type,
        text: transliteratedText(chapter.text, [
          "SAN",
          "IAST",
          "SLP1",
          "ITRANS",
          "TEL",
        ]),
        meaning: transliteratedText(chapter.meaning, [
          "SAN",
          "IAST",
          "SLP1",
          "ITRANS",
          "TEL",
        ]),
        attributes: chapter.attributes,
        bookmarked: chapter.bookmarked,
        order: chapter.order,
        notes: chapter.notes,
        parents: parentIds,
      },
    });

    chapterIdMap.set(chapterNumber, chapterEntity.id);
    createdEntities.push(chapterEntity);

    // Update parent entities to include chapter as child
    for (const parentId of parentIds) {
      await db.entity.update({
        where: { id: parentId },
        data: {
          children: {
            push: chapterEntity.id,
          },
        },
      });
    }
  }

  // Create verse entities
  for (const verse of hierarchy.verses) {
    let parentIds = [rootEntity.id]; // Default to root

    // Determine parent based on parent relation
    if (
      verse.parentRelation?.type === "chapter" &&
      verse.parentRelation.chapterNumber
    ) {
      const chapterId = chapterIdMap.get(verse.parentRelation.chapterNumber);
      if (chapterId) {
        parentIds = [chapterId];
      }
    } else if (
      verse.parentRelation?.type === "book" &&
      verse.parentRelation.bookNumber
    ) {
      const bookId = bookIdMap.get(verse.parentRelation.bookNumber);
      if (bookId) {
        parentIds = [bookId];
      }
    }

    const verseEntity = await db.entity.create({
      data: {
        type: verse.type,
        text: transliteratedText(verse.text, [
          "SAN",
          "IAST",
          "SLP1",
          "ITRANS",
          "TEL",
        ]),
        meaning: transliteratedText(verse.meaning, [
          "SAN",
          "IAST",
          "SLP1",
          "ITRANS",
          "TEL",
        ]),
        attributes: verse.attributes,
        bookmarked: verse.bookmarked,
        order: verse.order,
        notes: verse.notes,
        parents: parentIds,
      },
    });

    createdEntities.push(verseEntity);

    // Update parent entities to include verse as child
    for (const parentId of parentIds) {
      await db.entity.update({
        where: { id: parentId },
        data: {
          children: {
            push: verseEntity.id,
          },
        },
      });
    }
  }

  return createdEntities;
}

/**
 * Validates if a file path exists and is accessible
 */
export async function validateSanskritSahityaFile(
  filePath: string,
): Promise<
  SanskritSahityaImportResponse<{ isValid: boolean; title?: string }>
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { status: "error", error: "Unauthorized access" };
    }

    const fullPath = resolve(filePath);
    const fileContent = await readFile(fullPath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // Basic validation
    const sahityaData = validateSanskritSahityaData(jsonData);

    return {
      status: "success",
      data: {
        isValid: true,
        title: sahityaData.title,
      },
    };
  } catch (error) {
    console.error("File validation failed:", error);

    if (error instanceof SyntaxError) {
      return {
        status: "error",
        error: "Invalid JSON file format",
      };
    }

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Invalid file structure: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }

    return {
      status: "error",
      error: error instanceof Error ? error.message : "File validation failed",
    };
  }
}

// Input validation schema for reading JSON files
const ReadJsonFileSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});

/**
 * Reads a raw JSON file for preview (without parsing)
 */
/**
 * Reads Sanskrit Sahitya JSON file for preview purposes
 * Supports split files with numbered suffixes (e.g., ramayanam1.json, ramayanam2.json)
 */
export async function readSanskritSahityaJsonFile(
  filePath: string,
): Promise<SanskritSahityaImportResponse<any>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return { status: "error", error: "Unauthorized access" };
    }

    // Validate input
    const validated = ReadJsonFileSchema.parse({ filePath });

    // Ensure the file path is within the allowed directory
    if (!validated.filePath.startsWith("data/sanskritsahitya-com-data/")) {
      return { status: "error", error: "Invalid file path" };
    }

    // Read and combine split files if applicable
    const combinedData = await readAndCombineSplitFiles(validated.filePath);

    // // Clean up any null values that might cause validation issues
    // if (combinedData.data && Array.isArray(combinedData.data)) {
    //   let nullChCount = 0;
    //   combinedData.data = combinedData.data.map(
    //     (record: any, index: number) => {
    //       if (record.ch === null) {
    //         nullChCount++;
    //         console.log(`Cleaning null ch field at index ${index} in preview`);
    //         const { ch, ...cleanRecord } = record;
    //         return cleanRecord;
    //       }
    //       return record;
    //     },
    //   );
    //   console.log(
    //     `Cleaned ${nullChCount} records with null ch fields in preview`,
    //   );
    // }

    return {
      status: "success",
      data: combinedData,
    };
  } catch (error) {
    console.error("JSON file reading failed:", error);

    if (error instanceof z.ZodError) {
      return {
        status: "error",
        error: `Validation error: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        status: "error",
        error: "Invalid JSON file format",
      };
    }

    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "Failed to read JSON file",
    };
  }
}

/**
 * Helper function to read and combine split files
 * Handles files with numbered suffixes like ramayanam1.json, ramayanam2.json, etc.
 * Only the first file contains header info (books, chapters, terms)
 * Subsequent files contain only title and data arrays
 */
async function readAndCombineSplitFiles(filePath: string): Promise<any> {
  const fullPath = resolve(filePath);

  // Read the first file
  const firstFileContent = await readFile(fullPath, "utf-8");
  const firstFileData = JSON.parse(firstFileContent);

  // Check if this is a split file by looking for numbered suffix
  const pathParts = filePath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  const fileBaseName = fileName.replace(/\d+\.json$/, "");
  const fileNumber = fileName.match(/(\d+)\.json$/)?.[1];

  // If no number found, return single file data
  if (!fileNumber) {
    return firstFileData;
  }

  // Initialize combined data with first file (which has header info)
  const combinedData = { ...firstFileData };
  let currentFileNumber = parseInt(fileNumber) + 1;

  // Read subsequent files and combine their data arrays
  while (true) {
    try {
      const nextFilePath = filePath.replace(
        /\d+\.json$/,
        `${currentFileNumber}.json`,
      );
      const nextFullPath = resolve(nextFilePath);

      const nextFileContent = await readFile(nextFullPath, "utf-8");
      const nextFileData = JSON.parse(nextFileContent);

      // Validate that the next file has the same title
      if (nextFileData.title && nextFileData.title !== combinedData.title) {
        console.warn(
          `Title mismatch in split file ${nextFilePath}: expected ${combinedData.title}, got ${nextFileData.title}`,
        );
      }

      // Combine data arrays
      if (nextFileData.data && Array.isArray(nextFileData.data)) {
        if (!combinedData.data) {
          combinedData.data = [];
        }
        combinedData.data.push(...nextFileData.data);
        console.log(
          `Combined ${nextFileData.data.length} entries from ${nextFilePath}`,
        );
      }

      currentFileNumber++;
    } catch (error) {
      // No more files to read, break the loop
      if (error instanceof Error && error.message.includes("ENOENT")) {
        break;
      }
      // Re-throw other errors
      throw error;
    }
  }

  console.log(
    `Total combined entries: ${combinedData.data?.length || 0} from ${
      currentFileNumber - parseInt(fileNumber)
    } files`,
  );
  return combinedData;
}
