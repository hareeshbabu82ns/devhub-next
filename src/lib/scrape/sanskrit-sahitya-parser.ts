/**
 * Sanskrit Sahitya Data Parser
 *
 * Pure functions for parsing Sanskrit Sahitya JSON data into Entity structures
 * without database dependencies. This module handles the business logic of
 * converting the sanskritsahitya.com JSON format into our Entity hierarchy.
 */

import { z } from "zod";
import type {
  LanguageValueType,
  AttributeValueType,
} from "@/app/generated/prisma";

// Validation schemas for the JSON structure

const ChapterSchema = z.object({
  number: z.string(),
  name: z.string().optional(),
});

const ChandasSchema = z.object({
  n: z.string(), // name of chandas
  s: z.array(
    z.array(z.array(z.union([z.string(), z.literal("l"), z.literal("g")]))),
  ), // syllable splits
});

const WordAnalysisSchema = z.object({
  w: z.string(), // word
  l: z.string(), // lemma
  pos: z.string(), // part of speech
  c: z.number(), // case
  n: z.number(), // number
  g: z.number(), // gender
});

const VerseDataSchema = z.object({
  c: z.string(), // chapter number
  t: z.string().optional(), // introductory/explanatory text
  n: z.union([z.string(), z.number()]).optional(), // verse number
  i: z.number().optional(), // index in the book
  v: z.string().optional(), // verse text
  mn: z.string().optional(), // meaning
  es: z.string().optional(), // English translation
  anv: z.string().optional(), // anuvada (word-by-word meaning)
  md: z.string().optional(), // additional meaning
  ch: ChandasSchema.optional(), // chandas information
  xx: z.array(z.array(z.array(WordAnalysisSchema))).optional(), // word analysis
});

export const SanskritSahityaDataSchema = z.object({
  title: z.string(),
  terms: z
    .object({
      chapterSg: z.string().optional(),
      chapterPl: z.string().optional(),
    })
    .optional(),
  chapters: z.array(ChapterSchema).optional(),
  data: z.array(VerseDataSchema),
});

export type SanskritSahityaData = z.infer<typeof SanskritSahityaDataSchema>;
export type ChapterData = z.infer<typeof ChapterSchema>;
export type VerseData = z.infer<typeof VerseDataSchema>;

export interface ParseOptions {
  defaultLanguage?: string;
  meaningLanguage?: string;
  bookmarkAll?: boolean;
}

export interface ParsedEntity {
  type: string;
  text: LanguageValueType[];
  meaning: LanguageValueType[];
  attributes: AttributeValueType[];
  bookmarked: boolean;
  order: number;
  notes: string;
  parentRelation?: {
    type: "book" | "chapter";
    chapterNumber?: string;
  };
}

export interface ParsedHierarchy {
  book: ParsedEntity;
  chapters: ParsedEntity[];
  verses: ParsedEntity[];
  metadata: {
    totalEntities: number;
    bookTitle: string;
    chapterCount: number;
    verseCount: number;
  };
}

/**
 * Validates Sanskrit Sahitya JSON data structure
 */
export function validateSanskritSahityaData(
  jsonData: unknown,
): SanskritSahityaData {
  return SanskritSahityaDataSchema.parse(jsonData);
}

/**
 * Parses Sanskrit Sahitya data into entity hierarchy
 */
export function parseSanskritSahityaData(
  data: SanskritSahityaData,
  options: ParseOptions = {},
): ParsedHierarchy {
  const {
    defaultLanguage = "SAN",
    meaningLanguage = "ENG",
    bookmarkAll = false,
  } = options;

  const book = createBookEntity(data, defaultLanguage, bookmarkAll);
  const chapters = createChapterEntities(data, defaultLanguage, bookmarkAll);
  const verses = createVerseEntities(
    data,
    chapters,
    defaultLanguage,
    meaningLanguage,
    bookmarkAll,
  );

  return {
    book,
    chapters,
    verses,
    metadata: {
      totalEntities: 1 + chapters.length + verses.length,
      bookTitle: data.title,
      chapterCount: chapters.length,
      verseCount: verses.length,
    },
  };
}

/**
 * Creates the root book entity structure
 */
function createBookEntity(
  data: SanskritSahityaData,
  language: string = "SAN",
  bookmarked: boolean,
  bookType: string = "KAVYAM", // Default book type
): ParsedEntity {
  const textData: LanguageValueType[] = [{ language, value: data.title }];

  const attributes: AttributeValueType[] = [
    { key: "sourceType", value: "sanskritsahitya" },
    { key: "bookTitle", value: data.title },
  ];

  if (data.terms?.chapterSg) {
    attributes.push({ key: "chapterSingular", value: data.terms.chapterSg });
  }
  if (data.terms?.chapterPl) {
    attributes.push({ key: "chapterPlural", value: data.terms.chapterPl });
  }

  return {
    type: bookType,
    text: textData,
    meaning: [],
    attributes,
    bookmarked,
    order: 0,
    notes: `Sanskrit literature work: ${data.title}`,
  };
}

/**
 * Creates chapter entities based on the chapters array
 */
function createChapterEntities(
  data: SanskritSahityaData,
  language: string,
  bookmarked: boolean,
): ParsedEntity[] {
  if (!data.chapters || data.chapters.length === 0) {
    return [];
  }

  const chapterEntities: ParsedEntity[] = [];

  for (const chapter of data.chapters) {
    const textData: LanguageValueType[] = [
      { language, value: chapter.name || `Chapter ${chapter.number}` },
    ];

    const attributes: AttributeValueType[] = [
      { key: "chapterNumber", value: chapter.number },
      { key: "sourceType", value: "sanskritsahitya" },
    ];

    // Determine if this is a sub-chapter (contains dot notation like "3.1")
    const isSubChapter = chapter.number.includes(".");
    const entityType = isSubChapter ? "ADHYAAYAM" : "KAANDAM";

    let parentRelation: ParsedEntity["parentRelation"] = { type: "book" };

    // If it's a sub-chapter, find the parent chapter
    if (isSubChapter) {
      const [mainChapterNum] = chapter.number.split(".");
      const parentChapter = chapterEntities.find((ch) =>
        ch.attributes.some(
          (attr: AttributeValueType) =>
            attr.key === "chapterNumber" && attr.value === mainChapterNum,
        ),
      );
      if (parentChapter) {
        parentRelation = { type: "chapter", chapterNumber: mainChapterNum };
      }
    }

    const chapterEntity: ParsedEntity = {
      type: entityType,
      text: textData,
      meaning: [],
      attributes,
      bookmarked,
      order: parseFloat(chapter.number) || 0,
      notes: `Chapter from ${data.title}`,
      parentRelation,
    };

    chapterEntities.push(chapterEntity);
  }

  return chapterEntities;
}

/**
 * Creates verse entities from the data array
 */
function createVerseEntities(
  data: SanskritSahityaData,
  chapterEntities: ParsedEntity[],
  textLanguage: string,
  meaningLanguage: string,
  bookmarked: boolean,
): ParsedEntity[] {
  const verseEntities: ParsedEntity[] = [];

  for (const verse of data.data) {
    // Find the chapter entity for this verse
    const chapterEntity = chapterEntities.find((ch) =>
      ch.attributes.some(
        (attr: AttributeValueType) =>
          attr.key === "chapterNumber" && attr.value === verse.c,
      ),
    );

    const parentRelation: ParsedEntity["parentRelation"] = chapterEntity
      ? { type: "chapter", chapterNumber: verse.c }
      : { type: "book" };

    // Prepare text data
    const textData: LanguageValueType[] = [];
    if (verse.v) {
      textData.push({ language: textLanguage, value: verse.v });
    } else if (verse.t) {
      textData.push({ language: textLanguage, value: verse.t });
    }

    // Prepare meaning data
    const meaningData: LanguageValueType[] = [];
    if (verse.mn) {
      meaningData.push({ language: meaningLanguage, value: verse.mn });
    }
    if (verse.es) {
      meaningData.push({ language: meaningLanguage, value: verse.es });
    }
    if (verse.anv) {
      meaningData.push({
        language: meaningLanguage,
        value: `Word-by-word: ${verse.anv}`,
      });
    }
    if (verse.md) {
      meaningData.push({
        language: meaningLanguage,
        value: `Additional: ${verse.md}`,
      });
    }

    // Prepare attributes
    const attributes: AttributeValueType[] = [
      { key: "sourceType", value: "sanskritsahitya" },
      { key: "chapterNumber", value: verse.c },
    ];

    if (verse.n !== undefined) {
      attributes.push({ key: "verseNumber", value: verse.n.toString() });
    }
    if (verse.i !== undefined) {
      attributes.push({ key: "bookIndex", value: verse.i.toString() });
    }
    if (verse.ch?.n) {
      attributes.push({ key: "chandas", value: verse.ch.n });
    }

    // Determine entity type based on content
    let entityType: string = "SLOKAM"; // Default for verses
    if (verse.t && !verse.v) {
      entityType = "OTHERS"; // For explanatory text
    }

    // Create notes with additional information
    let notes = `From ${data.title}`;
    if (verse.ch?.n) {
      notes += ` | Chandas: ${verse.ch.n}`;
    }
    if (verse.xx && verse.xx.length > 0) {
      notes += ` | Contains word analysis`;
    }

    const verseEntity: ParsedEntity = {
      type: entityType,
      text: textData,
      meaning: meaningData,
      attributes,
      bookmarked,
      order: verse.i || 0,
      notes,
      parentRelation,
    };

    verseEntities.push(verseEntity);
  }

  return verseEntities;
}

/**
 * Helper function to extract chapter numbers from parsed entities
 */
export function getChapterNumbers(chapters: ParsedEntity[]): string[] {
  return chapters
    .map((chapter) => {
      const chapterNumberAttr = chapter.attributes.find(
        (attr) => attr.key === "chapterNumber",
      );
      return chapterNumberAttr?.value || "";
    })
    .filter(Boolean);
}

/**
 * Helper function to get entities by chapter
 */
export function getEntitiesByChapter(
  verses: ParsedEntity[],
  chapterNumber: string,
): ParsedEntity[] {
  return verses.filter((verse) =>
    verse.attributes.some(
      (attr) => attr.key === "chapterNumber" && attr.value === chapterNumber,
    ),
  );
}

/**
 * Helper function to get entity statistics
 */
export function getEntityStatistics(hierarchy: ParsedHierarchy) {
  const { book, chapters, verses } = hierarchy;

  const chapterTypes = chapters.reduce(
    (acc, chapter) => {
      acc[chapter.type] = (acc[chapter.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const verseTypes = verses.reduce(
    (acc, verse) => {
      acc[verse.type] = (acc[verse.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const versesWithMeaning = verses.filter(
    (verse) => verse.meaning.length > 0,
  ).length;
  const versesWithChandas = verses.filter((verse) =>
    verse.attributes.some((attr) => attr.key === "chandas"),
  ).length;

  return {
    totalEntities: hierarchy.metadata.totalEntities,
    bookTitle: book.text[0]?.value || "",
    chapterTypes,
    verseTypes,
    versesWithMeaning,
    versesWithChandas,
    averageVerseLength:
      verses.reduce(
        (sum, verse) => sum + (verse.text[0]?.value.length || 0),
        0,
      ) / verses.length || 0,
  };
}
