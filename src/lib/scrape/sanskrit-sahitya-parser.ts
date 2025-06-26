/**
 * Sanskrit Sahitya Data Parser
 *
 * const VerseDataSchema = z.object({
  c: z.string().optional(), // chapter number
  t: z.string().optional(), // introductory/explanatory text
  n: z.union([z.string(), z.number()]).optional(), // verse number
  i: z.number().optional(), // index in the book
  v: z.string().optional(), // verse text
  sp: z.string().optional(), // speaker of the verse
  mn: z.string().optional(), // meaning
  es: z.string().optional(), // English translation
  anv: z.string().optional(), // anuvada (word-by-word meaning)
  md: z.string().optional(), // additional meaning
  vd: z.string().optional(), // additional meaning - verse description
  ch: z.union([ChandasSchema, z.null()]).optional(), // chandas information - can be null
  xx: z.array(z.array(z.array(WordAnalysisSchema))).optional(), // word analysis
}).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()])); // Allow any additional fields for custom meaningsfor parsing Sanskrit Sahitya JSON data into Entity structures
 * without database dependencies. This module handles the business logic of
 * converting the sanskritsahitya.com JSON format into our Entity hierarchy.
 */

import { z } from "zod";
import type {
  LanguageValueType,
  AttributeValueType,
} from "@/app/generated/prisma";

// Validation schemas for the JSON structure

const BookSchema = z.object({
  number: z.string(),
  name: z.string().optional(),
});

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

const WORD_KEYS_TITLES = {
  w: {
    long: "Word",
    short: "Word",
    description: "The word in the verse",
    codeToDescr: undefined,
  },
  l: {
    long: "Root",
    short: "Root",
    description: "The root form of the word",
    codeToDescr: undefined,
  },
  pos: {
    long: "Part of Speech",
    short: "POS",
    description: "The grammatical category of the word",
    codeToDescr: {
      n: {
        long: "Noun",
        short: "Noun",
      },
      v: {
        long: "Verb",
        short: "Verb",
      },
      adj: {
        long: "Adjective",
        short: "Adj",
      },
      ad: {
        long: "Adverb",
        short: "Adv",
      },
      pr: {
        long: "Pronoun",
        short: "Pron",
      },
      con: {
        long: "Conjunction",
        short: "Conj",
      },
      int: {
        long: "Interjection",
        short: "Interj",
      },
      prep: {
        long: "Preposition",
        short: "Prep",
      },
    },
  },
  c: {
    long: "Case",
    short: "Case",
    description: "The grammatical case of the word",
    codeToDescr: undefined,
  },
  n: {
    long: "SG/DU/PL",
    short: "Num",
    description: "The grammatical number of the word",
    codeToDescr: undefined,
  },
};
const WordAnalysisSchema = z
  .object({
    w: z.string(), // word
    l: z.string(), // lemma
    pos: z.string(), // part of speech
    c: z.number(), // case
    n: z.number(), // number
    g: z.number(), // gender
  })
  .catchall(z.union([z.string(), z.number()]).optional()); // Allow any additional string or number fields

const VerseDataSchema = z
  .object({
    c: z.string().optional(), // chapter number - optional when no chapters present
    t: z.string().optional(), // introductory/explanatory text
    n: z.union([z.string(), z.number()]).optional(), // verse number
    i: z.number().optional(), // index in the book
    v: z.string().optional(), // verse text
    sp: z.string().optional(), // speaker of the verse
    mn: z.string().optional(), // meaning
    es: z.string().optional(), // English translation
    anv: z.string().optional(), // anuvada (word-by-word meaning)
    md: z.string().optional(), // additional meaning
    vd: z.string().optional(), // additional meaning - verse description
    ch: z.union([ChandasSchema, z.null()]).optional(), // chandas information - can be null
    xx: z.array(z.array(z.array(WordAnalysisSchema))).optional(), // word analysis
  })
  .catchall(z.string().optional()); // Allow any additional string fields for custom meanings

const CustomFieldSchema = z.object({
  name: z.string(), // display name for the field
  lang: z.enum(["en", "sa"]), // language: en - english, sa - sanskrit
  markdown: z.boolean().optional(), // boolean indicator for markdown support
  order: z.number().optional(), // numeric ordering for display
});

export const SanskritSahityaDataSchema = z.object({
  title: z.string(),
  custom: z.record(z.string(), CustomFieldSchema).optional(), // object with field mappings
  terms: z
    .object({
      chapterSg: z.string().optional(),
      chapterPl: z.string().optional(),
      bookSg: z.string().optional(),
      bookPl: z.string().optional(),
    })
    .optional(),
  books: z.array(BookSchema).optional(),
  chapters: z.array(ChapterSchema).optional(),
  data: z.array(VerseDataSchema),
});

export type SanskritSahityaData = z.infer<typeof SanskritSahityaDataSchema>;
export type CustomFieldConfig = z.infer<typeof CustomFieldSchema>;
export type BookData = z.infer<typeof BookSchema>;
export type ChapterData = z.infer<typeof ChapterSchema>;
export type VerseData = z.infer<typeof VerseDataSchema>;

export interface ParseOptions {
  defaultLanguage?: string;
  meaningLanguage?: string;
  bookmarkAll?: boolean;
  entityType?: string;
  parentId?: string;
  maxRecords?: number;
}

export interface ParsedEntity {
  type: string;
  text: LanguageValueType[];
  meaning: LanguageValueType[];
  attributes: AttributeValueType[];
  bookmarked: boolean;
  order: number;
  notes: string;
  parentId?: string;
  parentRelation?: {
    type: "root" | "book" | "chapter";
    bookNumber?: string;
    chapterNumber?: string;
  };
}

export interface ParsedHierarchy {
  root: ParsedEntity;
  books: ParsedEntity[];
  chapters: ParsedEntity[];
  verses: ParsedEntity[];
  metadata: {
    totalEntities: number;
    rootTitle: string;
    bookCount: number;
    chapterCount: number;
    verseCount: number;
    hasHierarchicalBooks: boolean;
  };
}

export const BOOK_SG_ENTITY_TYPE_MAP: Record<string, string> = {
  काण्डम्: "KAANDAM",
  खण्डः: "KAANDAM",
  पर्व: "PARVAM",
  default: "KAANDAM",
};
export const BOOK_SG_CHAPTER_SG_ENTITY_TYPE_MAP: Record<string, string> = {
  काण्डम्: "SARGA",
  खण्डः: "SARGA",
  पर्व: "ADHYAAYAM",
  default: "ADHYAAYAM",
};
export const CHAPTER_SG_ENTITY_TYPE_MAP: Record<string, string> = {
  अध्यायः: "ADHYAAYAM",
  भागः: "ADHYAAYAM",
  सर्गः: "SARGA",
  default: "ADHYAAYAM",
};

/**
 * Validates Sanskrit Sahitya JSON data structure
 */
export function validateSanskritSahityaData(
  jsonData: unknown,
): SanskritSahityaData {
  return SanskritSahityaDataSchema.parse(jsonData);
}

function cleanSanskritText(text: string): string {
  return text
    .replace(/<br\s*\/?>/g, "  \n")
    .replace(/।/g, "।  \n")
    .replace(/॥/g, "॥  \n\n")
    .trim();
}

/**
 * Parses Sanskrit Sahitya data into entity hierarchy
 * Handles both hierarchical Books[Chapters[Verses[]]] and flat Chapters[Verses[]] structures
 */
export function parseSanskritSahityaData(
  data: SanskritSahityaData,
  options: ParseOptions = {},
): ParsedHierarchy {
  const {
    defaultLanguage = "SAN",
    meaningLanguage = "ENG",
    bookmarkAll = false,
    entityType = "KAVYAM",
    parentId,
    maxRecords,
  } = options;

  const hasBooks = data.books && data.books.length > 0;
  const hasHierarchicalBooks = hasBooks;

  // Create root entity (main work)
  const root = createRootEntity(
    data,
    defaultLanguage,
    bookmarkAll,
    entityType,
    parentId,
  );

  // Create book entities if books array exists
  const books = hasBooks
    ? createBookEntities(data, defaultLanguage, bookmarkAll)
    : [];

  // Create chapter entities
  const chapters = createChapterEntities(
    data,
    books,
    defaultLanguage,
    bookmarkAll,
    hasHierarchicalBooks,
  );

  // Create verse entities
  const verses = createVerseEntities(
    data,
    books,
    chapters,
    defaultLanguage,
    meaningLanguage,
    bookmarkAll,
    hasHierarchicalBooks,
    maxRecords,
  );

  return {
    root,
    books,
    chapters,
    verses,
    metadata: {
      totalEntities: 1 + books.length + chapters.length + verses.length,
      rootTitle: data.title,
      bookCount: books.length,
      chapterCount: chapters.length,
      verseCount: verses.length,
      hasHierarchicalBooks: hasHierarchicalBooks || false,
    },
  };
}

/**
 * Creates the root entity structure (main work/collection)
 */
function createRootEntity(
  data: SanskritSahityaData,
  language: string = "SAN",
  bookmarked: boolean,
  rootType: string = "KAVYAM",
  parentId?: string,
): ParsedEntity {
  const textData: LanguageValueType[] = [{ language, value: data.title }];

  const attributes: AttributeValueType[] = [
    { key: "sourceType", value: "sanskritsahitya" },
    { key: "rootTitle", value: data.title },
  ];

  if (data.terms?.chapterSg) {
    attributes.push({ key: "chapterSingular", value: data.terms.chapterSg });
  }
  if (data.terms?.chapterPl) {
    attributes.push({ key: "chapterPlural", value: data.terms.chapterPl });
  }
  if (data.terms?.bookSg) {
    attributes.push({ key: "bookSingular", value: data.terms.bookSg });
  }
  if (data.terms?.bookPl) {
    attributes.push({ key: "bookPlural", value: data.terms.bookPl });
  }

  // Store custom field configuration for later reference
  if (data.custom) {
    attributes.push({
      key: "customFieldsConfig",
      value: JSON.stringify(data.custom),
    });
  }

  return {
    type: rootType,
    text: textData,
    meaning: [],
    attributes,
    bookmarked,
    order: 0,
    notes: `Sanskrit literature work: ${data.title}`,
    parentId,
    parentRelation: parentId ? { type: "root" } : undefined,
  };
}

/**
 * Creates book entities from the books array
 */
function createBookEntities(
  data: SanskritSahityaData,
  language: string,
  bookmarked: boolean,
): ParsedEntity[] {
  if (!data.books || data.books.length === 0) {
    return [];
  }

  const bookEntities: ParsedEntity[] = [];
  // Use bookSg from terms if available, otherwise default to appropriate type
  const bookType = BOOK_SG_ENTITY_TYPE_MAP[data.terms?.bookSg || "default"];
  let index = 1;

  for (const book of data.books) {
    const textData: LanguageValueType[] = [
      { language, value: book.name || `Book ${book.number}` },
    ];

    const attributes: AttributeValueType[] = [
      { key: "bookNumber", value: book.number },
      { key: "sourceType", value: "sanskritsahitya" },
    ];

    const bookEntity: ParsedEntity = {
      type: bookType,
      text: textData,
      meaning: [],
      attributes,
      bookmarked,
      order: index++,
      // order: parseFloat(book.number) || index,
      notes: `Book from ${data.title}`,
      parentRelation: { type: "root" },
    };

    bookEntities.push(bookEntity);
  }

  return bookEntities;
}

/**
 * Creates chapter entities based on the chapters array
 * Handles hierarchical structure when books exist
 */
function createChapterEntities(
  data: SanskritSahityaData,
  bookEntities: ParsedEntity[],
  language: string,
  bookmarked: boolean,
  hasHierarchicalBooks: boolean = false,
): ParsedEntity[] {
  if (!data.chapters || data.chapters.length === 0) {
    return [];
  }

  const chapterEntities: ParsedEntity[] = [];
  // Use chapterSg from terms if available
  const defaultChapterType = data.terms?.chapterSg
    ? CHAPTER_SG_ENTITY_TYPE_MAP[data.terms.chapterSg || "default"]
    : data.terms?.bookSg
      ? BOOK_SG_CHAPTER_SG_ENTITY_TYPE_MAP[data.terms.bookSg || "default"]
      : "ADHYAAYAM";

  for (const chapter of data.chapters) {
    const textData: LanguageValueType[] = [
      { language, value: chapter.name || `Chapter ${chapter.number}` },
    ];

    const attributes: AttributeValueType[] = [
      { key: "chapterNumber", value: chapter.number },
      { key: "sourceType", value: "sanskritsahitya" },
    ];

    // Determine parent relationship and entity type
    let parentRelation: ParsedEntity["parentRelation"];
    const entityType: string = defaultChapterType;

    // In hierarchical structure, chapters belong to books
    // Handle notation like "3.1" where "3" is book number and "1" is chapter number
    // Flat structure: chapters belong to root
    // Determine if this is a sub-chapter (contains dot notation like "3.1")
    const isSubChapter = chapter.number.includes(".");

    if (hasHierarchicalBooks) {
      if (isSubChapter) {
        const [bookNum, chapterNum] = chapter.number.split(".");
        const parentBook = bookEntities.find((book) =>
          book.attributes.some(
            (attr: AttributeValueType) =>
              attr.key === "bookNumber" && attr.value === bookNum,
          ),
        );

        if (parentBook) {
          parentRelation = { type: "book", bookNumber: bookNum };
          attributes.push({ key: "bookNumber", value: bookNum });
          attributes.push({ key: "localChapterNumber", value: chapterNum });
        } else {
          // Fallback to root if book not found
          parentRelation = { type: "root" };
        }
      } else {
        // Simple chapter number, check if it corresponds to a book
        const correspondingBook = bookEntities.find((book) =>
          book.attributes.some(
            (attr: AttributeValueType) =>
              attr.key === "bookNumber" && attr.value === chapter.number,
          ),
        );

        if (correspondingBook) {
          // This chapter belongs to a book
          parentRelation = { type: "book", bookNumber: chapter.number };
          attributes.push({ key: "bookNumber", value: chapter.number });
        } else {
          parentRelation = { type: "root" };
        }
      }
    } else {
      // entityType = isSubChapter ? "ADHYAAYAM" : "KAANDAM";

      let parentChapterNumber: string | undefined;

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
          parentChapterNumber = mainChapterNum;
        } else {
          parentRelation = { type: "root" };
        }
      } else {
        parentRelation = { type: "root" };
      }
    }

    const chapterNumber = isSubChapter
      ? chapter.number.split(".").pop()
      : chapter.number;

    const chapterEntity: ParsedEntity = {
      type: entityType,
      text: textData,
      meaning: [],
      attributes,
      bookmarked,
      order: parseInt(chapterNumber || "0", 10),
      notes: `Chapter from ${data.title}`,
      parentRelation,
    };

    chapterEntities.push(chapterEntity);
  }

  return chapterEntities;
}

/**
 * Creates verse entities from the data array
 * Handles hierarchical structure when books exist
 */
function createVerseEntities(
  data: SanskritSahityaData,
  bookEntities: ParsedEntity[],
  chapterEntities: ParsedEntity[],
  textLanguage: string,
  meaningLanguage: string,
  bookmarked: boolean,
  hasHierarchicalBooks: boolean = false,
  maxRecords?: number,
): ParsedEntity[] {
  const verseEntities: ParsedEntity[] = [];

  // Track verse order per chapter - starts from 0 for each new chapter
  const chapterVerseCounters = new Map<string, number>();
  let globalVerseOrder = 0; // Used when no chapters exist

  // Limit data for testing if maxRecords is specified
  const processData = maxRecords ? data.data.slice(0, maxRecords) : data.data;

  if (maxRecords) {
    console.log(
      `🔬 Testing mode: Processing ${processData.length} out of ${data.data.length} verses`,
    );
  }

  for (const verse of processData) {
    let parentRelation: ParsedEntity["parentRelation"];

    if (hasHierarchicalBooks) {
      // In hierarchical structure: determine if verse belongs to book or chapter
      if (verse.c) {
        // Verse has chapter information
        const isSubChapter = verse.c.includes(".");

        if (isSubChapter) {
          // Handle "3.1" format - belongs to book 3, chapter 1
          const [bookNum, chapterNum] = verse.c.split(".");
          const chapterEntity = chapterEntities.find((ch) =>
            ch.attributes.some(
              (attr: AttributeValueType) =>
                attr.key === "chapterNumber" && attr.value === verse.c,
            ),
          );

          if (chapterEntity) {
            parentRelation = {
              type: "chapter",
              bookNumber: bookNum,
              chapterNumber: verse.c,
            };
          } else {
            // Fallback to book if chapter not found
            const bookEntity = bookEntities.find((book) =>
              book.attributes.some(
                (attr: AttributeValueType) =>
                  attr.key === "bookNumber" && attr.value === bookNum,
              ),
            );
            parentRelation = bookEntity
              ? { type: "book", bookNumber: bookNum }
              : { type: "root" };
          }
        } else {
          // Simple chapter number - check if it's a direct chapter or corresponds to a book
          const chapterEntity = chapterEntities.find((ch) =>
            ch.attributes.some(
              (attr: AttributeValueType) =>
                attr.key === "chapterNumber" && attr.value === verse.c,
            ),
          );

          if (chapterEntity) {
            // Check if this chapter belongs to a book
            const bookNumber = chapterEntity.attributes.find(
              (attr) => attr.key === "bookNumber",
            )?.value;

            parentRelation = {
              type: "chapter",
              bookNumber,
              chapterNumber: verse.c,
            };
          } else {
            // Check if verse.c corresponds to a book number
            const bookEntity = bookEntities.find((book) =>
              book.attributes.some(
                (attr: AttributeValueType) =>
                  attr.key === "bookNumber" && attr.value === verse.c,
              ),
            );
            parentRelation = bookEntity
              ? { type: "book", bookNumber: verse.c }
              : { type: "root" };
          }
        }
      } else {
        // No chapter info, belongs to root
        parentRelation = { type: "root" };
      }
    } else {
      // Flat structure: verse belongs to chapter or root
      const chapterEntity = verse.c
        ? chapterEntities.find((ch) =>
            ch.attributes.some(
              (attr: AttributeValueType) =>
                attr.key === "chapterNumber" && attr.value === verse.c,
            ),
          )
        : undefined;

      parentRelation =
        chapterEntity && verse.c
          ? { type: "chapter", chapterNumber: verse.c }
          : { type: "root" };
    }

    // Prepare text data
    const textData: LanguageValueType[] = [];
    const textParsed = verse.v || verse.t || "";
    textData.push({
      language: textLanguage,
      value: cleanSanskritText(textParsed),
    });

    // Prepare meaning data using custom field configuration
    const meaningData: LanguageValueType[] = [];

    // Process custom fields if available
    if (data.custom) {
      const customMeaningData: Record<string, string> = {};

      // Create a map of custom field configs sorted by order
      const customFields = Object.entries(data.custom).sort(
        ([, a], [, b]) => (a.order || 0) - (b.order || 0),
      );

      for (const [fieldKey, fieldConfig] of customFields) {
        const fieldValue = verse[fieldKey as keyof VerseData];
        if (fieldValue && typeof fieldValue === "string") {
          const displayName = fieldConfig.name;
          const languageCode =
            fieldConfig.lang === "en"
              ? "ENG"
              : fieldConfig.lang === "sa"
                ? "SAN"
                : meaningLanguage;

          let processedValue = cleanSanskritText(fieldValue);

          // Add display name prefix if configured
          if (displayName !== fieldKey) {
            processedValue = `**${displayName}**:  \n\n${processedValue}`;
          }

          customMeaningData[languageCode] = customMeaningData[languageCode]
            ? `${customMeaningData[languageCode]}\n\n---\n${processedValue}`
            : processedValue;
        }
      }
      // Convert custom meaning data to LanguageValueType format
      for (const [lang, value] of Object.entries(customMeaningData)) {
        meaningData.push({ language: lang, value });
      }
    } else {
      // Fallback to default field processing when no custom config is available
      if (verse.mn) {
        meaningData.push({
          language: meaningLanguage,
          value: cleanSanskritText(verse.mn),
        });
      }
      if (verse.es) {
        meaningData.push({
          language: meaningLanguage,
          value: cleanSanskritText(verse.es),
        });
      }
      if (verse.anv) {
        meaningData.push({
          language: meaningLanguage,
          value: `Word-by-word:  \n\n${cleanSanskritText(verse.anv)}`,
        });
      }
      if (verse.md) {
        meaningData.push({
          language: meaningLanguage,
          value: `Additional:  \n\n${cleanSanskritText(verse.md)}`,
        });
      }
      if (verse.vd) {
        meaningData.push({
          language: meaningLanguage,
          value: `Description:  \n\n${cleanSanskritText(verse.vd)}`,
        });
      }
    }

    // Prepare attributes
    const attributes: AttributeValueType[] = [
      { key: "sourceType", value: "sanskritsahitya" },
    ];

    // Only add chapter number if it exists
    if (verse.c) {
      attributes.push({ key: "chapterNumber", value: verse.c });
    }

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
    const entityType: string = "SLOKAM"; // Default for verses
    // if (verse.t && !verse.v) {
    //   entityType = "OTHERS"; // For explanatory text
    // }

    // Create notes with additional information
    let notes = `From ${data.title}`;
    if (verse.xx && verse.xx.length > 0) {
      // notes += ` | Contains word analysis`;
      //"w": "धर्मक्षेत्रे", "l": "धर्म", "pos": "mn", "c": 0, "n": 0, "g": 1
      // prepare markdown table for word analysis

      // const wordAnalysis = verse.xx
      //   .map((wordGroup) =>
      //     wordGroup
      //       .map((words) =>
      //         words
      //           .map(
      //             (word) =>
      //               `| ${word.w} | ${word.l} | ${word.pos} | ${word.c} | ${word.n} | ${word.g} |\n`,
      //           )
      //           .join(""),
      //       )
      //       .join(""),
      //   )
      //   .join("");
      // notes += `\n\n### Word Analysis:\n\n| Word | Lemma | POS | Case | Number | Gender |\n|------|-------|-----|------|--------|--------|\n${wordAnalysis}`;

      // Process word analysis data if available
      if (verse.xx && verse.xx.length > 0) {
        // Track which keys have actual data
        const keysWithData = new Set<string>();

        // Scan all words to find keys with data
        verse.xx.forEach((wordGroup) => {
          wordGroup.forEach((words) => {
            words.forEach((word) => {
              Object.entries(word).forEach(([key, value]) => {
                if (
                  // key in WORD_KEYS_TITLES &&
                  value !== undefined &&
                  value !== null &&
                  value !== ""
                ) {
                  keysWithData.add(key);
                }
              });
            });
          });
        });

        // Convert to array of keys that exist in WORD_KEYS_TITLES
        const columnsToInclude = Array.from(keysWithData);

        if (columnsToInclude.length > 0) {
          // Build header and separator rows
          const headerRow = columnsToInclude
            .map(
              (key) =>
                WORD_KEYS_TITLES[key as keyof typeof WORD_KEYS_TITLES]?.short ||
                key,
            )
            .join(" | ");

          const separatorRow = columnsToInclude.map(() => "---").join(" | ");

          // Build table rows
          const wordAnalysis = verse.xx
            .map((wordGroup) =>
              wordGroup
                .map((words) =>
                  words
                    .map((word) => {
                      const cells = columnsToInclude.map((key) => {
                        const value = word[key as keyof typeof word];
                        const codeToDescr =
                          WORD_KEYS_TITLES[key as keyof typeof WORD_KEYS_TITLES]
                            ?.codeToDescr;
                        if (codeToDescr) {
                          const mappedValue =
                            (
                              codeToDescr[
                                value as keyof typeof codeToDescr
                              ] as any
                            )?.short || value;
                          return mappedValue !== undefined &&
                            mappedValue !== null
                            ? String(mappedValue)
                            : "";
                        } else {
                          return value !== undefined && value !== null
                            ? String(value)
                            : "";
                        }
                      });
                      return `| ${cells.join(" | ")} |`;
                    })
                    .join("\n"),
                )
                .join("\n"),
            )
            .join("\n");

          notes += `\n\n### Word Analysis:\n\n| ${headerRow} |\n| ${separatorRow} |\n${wordAnalysis}`;
        }
      }
    }
    if (verse.ch?.n) {
      notes += `  \n\nChandas: ${verse.ch.n}`;
      // s: [[["दृ", "g"], ["ष्ट्वा", "g"], ["तु", "l"], ["पा", "g"], ["ण्ड", "l"], ["वा", "g"], ["नी", "g"], ["कं", "g"]], [["व्यू", "g"], ["ढं", "g"], ["दु", "g"], ["र्यो", "g"], ["ध", "l"], ["न", "g"], ["स्त", "l"], ["दा", "g"]], [["आ", "g"], ["चा", "g"], ["र्य", "l"], ["मु", "l"], ["प", "l"], ["सं", "g"], ["ग", "g"], ["म्य", "l"]], [["रा", "g"], ["जा", "g"], ["व", "l"], ["च", "l"], ["न", "l"], ["म", "g"], ["ब्र", "l"], ["वीत्", "g"]]]
      // prepare markdown table for chandas syllables
      if (verse.ch.s && verse.ch.s.length > 0) {
        let tableColumns = 0;
        const syllableAnalysis = verse.ch.s
          .map((syllableGroup) => {
            const syllableNotesLine = syllableGroup
              .map(([text, note]) =>
                note === "g" ? `__${text}__` : `_${text}_`,
              )
              .join("|");
            tableColumns = Math.max(tableColumns, syllableGroup.length);
            return `| ${syllableNotesLine} |`;
          })
          .join("\n");
        const mdTableHeader = Array(tableColumns)
          .fill("")
          .map((_, i) => `${i + 1} `)
          .join("|");
        const mdTableSeparator = Array(tableColumns)
          .fill("")
          .map(() => "---")
          .join("|");
        notes += `\n\n### Chandas Syllables:  \n\n|${mdTableHeader}|\n|${mdTableSeparator}|\n${syllableAnalysis}`;
      }
    }

    // Calculate verse order based on chapter grouping
    let currentVerseOrder: number;

    if (verse.c) {
      // Verse has chapter information - use chapter-specific counter
      const chapterKey = verse.c;
      if (!chapterVerseCounters.has(chapterKey)) {
        chapterVerseCounters.set(chapterKey, 0);
      }
      currentVerseOrder = chapterVerseCounters.get(chapterKey)!;
      chapterVerseCounters.set(chapterKey, currentVerseOrder + 1);
    } else {
      // No chapter information - use global counter
      currentVerseOrder = globalVerseOrder++;
    }

    const verseEntity: ParsedEntity = {
      type: entityType,
      text: textData,
      meaning: meaningData,
      attributes,
      bookmarked,
      order: currentVerseOrder,
      // order: verse.i || 0,
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
  const { root, books, chapters, verses } = hierarchy;

  const bookTypes = books.reduce(
    (acc, book) => {
      acc[book.type] = (acc[book.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

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
    rootTitle: root.text[0]?.value || "",
    hasHierarchicalBooks: hierarchy.metadata.hasHierarchicalBooks,
    bookTypes,
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
