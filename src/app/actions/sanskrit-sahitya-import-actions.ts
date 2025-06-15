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

    // Read and parse JSON file
    const fullPath = resolve(filePath);
    const fileContent = await readFile(fullPath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // Validate JSON structure
    const sahityaData = validateSanskritSahityaData(jsonData);

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

    // Parse the file first
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
              key: "bookTitle",
              value: hierarchy.book.text[0].value,
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
        bookTitle: hierarchy.metadata.bookTitle,
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
 */
async function createEntitiesInDatabase(hierarchy: ParsedHierarchy) {
  const createdEntities = [];

  // Create book entity
  const bookData: any = {
    type: hierarchy.book.type,
    text: transliteratedText(hierarchy.book.text, [
      "SAN",
      "IAST",
      "SLP1",
      "ITRANS",
      "TEL",
    ]),
    meaning: hierarchy.book.meaning,
    attributes: hierarchy.book.attributes,
    bookmarked: hierarchy.book.bookmarked,
    order: hierarchy.book.order,
    notes: hierarchy.book.notes,
  };

  // Add parent connection if parentId is provided
  if (hierarchy.book.parentId) {
    bookData.parents = [hierarchy.book.parentId];
  }

  const bookEntity = await db.entity.create({
    data: bookData,
  });
  createdEntities.push(bookEntity);

  // Update parent entity to include book as child if parentId exists
  if (hierarchy.book.parentId) {
    await db.entity.update({
      where: { id: hierarchy.book.parentId },
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

    let parentIds = [bookEntity.id];

    // Handle sub-chapters (find parent chapter)
    if (
      chapter.parentRelation?.type === "chapter" &&
      chapter.parentRelation.chapterNumber
    ) {
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
    const chapterNumberAttr = verse.attributes.find(
      (attr) => attr.key === "chapterNumber",
    );
    const chapterNumber = chapterNumberAttr?.value || "";

    let parentIds = [bookEntity.id];
    if (verse.parentRelation?.type === "chapter" && chapterNumber) {
      const chapterId = chapterIdMap.get(chapterNumber);
      if (chapterId) {
        parentIds = [chapterId];
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

    // Read and parse JSON file
    const fullPath = resolve(validated.filePath);
    const fileContent = await readFile(fullPath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    return {
      status: "success",
      data: jsonData,
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
