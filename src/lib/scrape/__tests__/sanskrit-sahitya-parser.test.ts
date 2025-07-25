/**
 * Unit tests for Sanskrit Sahitya Parser
 * Tests the pure business logic without database dependencies
 */

import {
  parseSanskritSahityaData,
  validateSanskritSahityaData,
  getChapterNumbers,
  getEntitiesByChapter,
  getEntityStatistics,
  type SanskritSahityaData,
  type ParsedHierarchy,
  type ParseOptions,
  BOOK_SG_ENTITY_TYPE_MAP,
} from "@/lib/scrape/sanskrit-sahitya-parser";

describe("Sanskrit Sahitya Parser", () => {
  const mockSahityaData: SanskritSahityaData = {
    title: "नाट्यशास्त्रम्",
    terms: {
      chapterSg: "अध्यायः",
      chapterPl: "अध्यायाः",
    },
    chapters: [
      { number: "1", name: "प्रथमोऽध्याय:" },
      { number: "2", name: "द्वितीयोऽध्याय:" },
      { number: "3.1", name: "तृतीयोऽध्याय: भाग १" },
    ],
    data: [
      {
        c: "1",
        t: "श्रीरस्तु\nभरतमुनिप्रणीतं नाट्यशास्त्रम्",
      },
      {
        c: "1",
        t: "अथ प्रथमोऽध्यायः",
      },
      {
        c: "1",
        n: "1",
        i: 0,
        v: "प्रणम्य शिरसा देवौ पितामहमहेश्वरौ । नाट्यशास्त्रं प्रवक्ष्यामि ब्रह्मणा यदुदाहृतम् ॥",
        ch: {
          n: "अनुष्टुप्",
          s: [
            [
              ["प्र", "l"],
              ["ण", "g"],
              ["म्य", "l"],
              ["शि", "l"],
              ["र", "l"],
              ["सा", "g"],
              ["दे", "g"],
              ["वौ", "g"],
            ],
          ],
        },
      },
      {
        c: "2",
        n: "1",
        i: 131,
        v: "भरतस्य वचः श्रुत्वा पप्रच्छुर्मुनयस्ततः । भगवन्श्रोतुमिच्छामो यजनं रङ्गसंश्रयम् ॥",
        es: "Having heard Bharata's words, the sages then asked: O Lord, we wish to hear about the worship connected with the stage.",
        anv: "भरतस्य Bharata's, वचः words, श्रुत्वा having heard, पप्रच्छुः asked, मुनयः sages, ततः then",
      },
      {
        c: "3.1",
        n: "17",
        v: "विष्णुना सदृशो वीर्ये सोमवत्प्रियदर्शनः । कालाग्निसदृशः क्रोधे क्षमया पृथिवीसमः ॥",
        i: 17,
        es: "Sri Rama is like Visnu in prowess, the Moon in pleasing appearance, the all-consuming fire in anger, the earth in patience.",
        md: "In prowess, he is like as Vişnu, and boasts of the personal attractions of the Moon.",
      },
    ],
  };

  describe("validateSanskritSahityaData", () => {
    test("should validate correct Sanskrit Sahitya data structure", () => {
      const result = validateSanskritSahityaData(mockSahityaData);
      expect(result).toEqual(mockSahityaData);
    });

    test("should throw error for missing title", () => {
      const invalidData = { ...mockSahityaData };
      delete (invalidData as any).title;

      expect(() => validateSanskritSahityaData(invalidData)).toThrow();
    });

    test("should throw error for missing data array", () => {
      const invalidData = { ...mockSahityaData };
      delete (invalidData as any).data;

      expect(() => validateSanskritSahityaData(invalidData)).toThrow();
    });

    test("should accept data without chapters", () => {
      const dataWithoutChapters = {
        title: "Test Title",
        data: [
          {
            c: "1",
            v: "Test verse",
          },
        ],
      };

      const result = validateSanskritSahityaData(dataWithoutChapters);
      expect(result.title).toBe("Test Title");
      expect(result.chapters).toBeUndefined();
    });

    test("should accept data without terms", () => {
      const dataWithoutTerms = {
        title: "Test Title",
        data: [
          {
            c: "1",
            v: "Test verse",
          },
        ],
      };

      const result = validateSanskritSahityaData(dataWithoutTerms);
      expect(result.title).toBe("Test Title");
      expect(result.terms).toBeUndefined();
    });
  });

  describe("parseSanskritSahityaData", () => {
    test("should parse complete Sanskrit Sahitya data with default options", () => {
      const result = parseSanskritSahityaData(mockSahityaData);

      expect(result.root).toBeDefined();
      expect(result.books).toHaveLength(0); // No books in flat structure
      expect(result.chapters).toHaveLength(3);
      expect(result.verses).toHaveLength(5);
      expect(result.metadata.totalEntities).toBe(9); // 1 root + 0 books + 3 chapters + 5 verses
      expect(result.metadata.rootTitle).toBe("नाट्यशास्त्रम्");
      expect(result.metadata.hasHierarchicalBooks).toBe(false);
    });

    test("should parse with custom options", () => {
      const options: ParseOptions = {
        defaultLanguage: "HIN",
        meaningLanguage: "ENG",
        bookmarkAll: true,
      };

      const result = parseSanskritSahityaData(mockSahityaData, options);

      expect(result.root.text[0].language).toBe("HIN");
      expect(result.root.bookmarked).toBe(true);
      expect(result.chapters[0].bookmarked).toBe(true);
      expect(result.verses[0].bookmarked).toBe(true);
    });

    test("should create proper root entity", () => {
      const result = parseSanskritSahityaData(mockSahityaData);
      const root = result.root;

      expect(root.type).toBe("KAVYAM");
      expect(root.text[0]).toEqual({
        language: "SAN",
        value: "नाट्यशास्त्रम्",
      });
      expect(root.attributes).toContainEqual({
        key: "sourceType",
        value: "sanskritsahitya",
      });
      expect(root.attributes).toContainEqual({
        key: "rootTitle",
        value: "नाट्यशास्त्रम्",
      });
      expect(root.attributes).toContainEqual({
        key: "chapterSingular",
        value: "अध्यायः",
      });
      expect(root.attributes).toContainEqual({
        key: "chapterPlural",
        value: "अध्यायाः",
      });
    });

    test("should create proper chapter entities", () => {
      const result = parseSanskritSahityaData(mockSahityaData);
      const chapters = result.chapters;

      expect(chapters).toHaveLength(3);

      // Regular chapters
      expect(chapters[0].type).toBe("ADHYAAYAM");
      expect(chapters[1].type).toBe("ADHYAAYAM");

      // Sub-chapter
      expect(chapters[2].type).toBe("ADHYAAYAM");
      expect(chapters[2].parentRelation?.type).toBe("root"); // Should fallback to root if parent not found

      chapters.forEach((chapter, index) => {
        expect(chapter.attributes).toContainEqual({
          key: "sourceType",
          value: "sanskritsahitya",
        });
        expect(chapter.attributes).toContainEqual({
          key: "chapterNumber",
          value: mockSahityaData.chapters![index].number,
        });
      });
    });

    test("should create proper verse entities", () => {
      const result = parseSanskritSahityaData(mockSahityaData);
      const verses = result.verses;

      expect(verses).toHaveLength(5);

      // First two are explanatory text
      expect(verses[0].type).toBe("SLOKAM");
      expect(verses[1].type).toBe("SLOKAM");

      // Rest are verses
      expect(verses[2].type).toBe("SLOKAM");
      expect(verses[3].type).toBe("SLOKAM");
      expect(verses[4].type).toBe("SLOKAM");

      // Check verse with chandas information
      const verseWithChandas = verses.find((v) =>
        v.attributes.some((attr) => attr.key === "chandas"),
      );
      expect(verseWithChandas).toBeDefined();
      expect(verseWithChandas!.attributes).toContainEqual({
        key: "chandas",
        value: "अनुष्टुप्",
      });
      expect(verseWithChandas!.notes).toContain("Chandas: अनुष्टुप्");
    });

    test("should handle multiple meanings correctly", () => {
      const result = parseSanskritSahityaData(mockSahityaData);
      const verses = result.verses;

      // Find verse with English translation
      const verseWithTranslation = verses.find((v) => v.meaning.length > 0);
      expect(verseWithTranslation).toBeDefined();

      const meanings = verseWithTranslation!.meaning;
      expect(
        meanings.some((m) => m.value.includes("Having heard Bharata's words")),
      ).toBe(true);
      expect(meanings.some((m) => m.value.includes("Word-by-word:"))).toBe(
        true,
      );

      // Check verse with multiple meanings
      const verseWithMultipleMeanings = verses.find(
        (v) =>
          v.meaning.length > 1 &&
          v.meaning.some((m) => m.value.includes("Additional:")),
      );
      expect(verseWithMultipleMeanings).toBeDefined();
    });

    test("should handle data without chapters", () => {
      const dataWithoutChapters = {
        title: "Simple Text",
        data: [
          {
            c: "1",
            v: "Test verse",
          },
        ],
      };

      const result = parseSanskritSahityaData(dataWithoutChapters);

      expect(result.chapters).toHaveLength(0);
      expect(result.verses).toHaveLength(1);
      expect(result.verses[0].parentRelation?.type).toBe("root");
    });

    test("should set correct parent relationships", () => {
      const result = parseSanskritSahityaData(mockSahityaData);

      // Check verse parent relationships
      const chapter1Verses = result.verses.filter((v) =>
        v.attributes.some(
          (attr) => attr.key === "chapterNumber" && attr.value === "1",
        ),
      );
      expect(chapter1Verses).toHaveLength(3);
      chapter1Verses.forEach((verse) => {
        expect(verse.parentRelation?.type).toBe("chapter");
        expect(verse.parentRelation?.chapterNumber).toBe("1");
      });

      const chapter3_1Verses = result.verses.filter((v) =>
        v.attributes.some(
          (attr) => attr.key === "chapterNumber" && attr.value === "3.1",
        ),
      );
      expect(chapter3_1Verses).toHaveLength(1);
      expect(chapter3_1Verses[0].parentRelation?.type).toBe("chapter");
      expect(chapter3_1Verses[0].parentRelation?.chapterNumber).toBe("3.1");
    });
  });

  describe("Helper functions", () => {
    let parsedHierarchy: ParsedHierarchy;

    beforeEach(() => {
      parsedHierarchy = parseSanskritSahityaData(mockSahityaData);
    });

    test("getChapterNumbers should return all chapter numbers", () => {
      const chapterNumbers = getChapterNumbers(parsedHierarchy.chapters);
      expect(chapterNumbers).toEqual(["1", "2", "3.1"]);
    });

    test("getEntitiesByChapter should filter entities by chapter", () => {
      const chapter1Entities = getEntitiesByChapter(
        parsedHierarchy.verses,
        "1",
      );
      expect(chapter1Entities).toHaveLength(3);

      const chapter2Entities = getEntitiesByChapter(
        parsedHierarchy.verses,
        "2",
      );
      expect(chapter2Entities).toHaveLength(1);

      const chapter3_1Entities = getEntitiesByChapter(
        parsedHierarchy.verses,
        "3.1",
      );
      expect(chapter3_1Entities).toHaveLength(1);
    });

    test("getEntityStatistics should provide comprehensive statistics", () => {
      const stats = getEntityStatistics(parsedHierarchy);

      expect(stats.totalEntities).toBe(9);
      expect(stats.rootTitle).toBe("नाट्यशास्त्रम्");
      expect(stats.chapterTypes).toEqual({
        // KAANDAM: 2,
        ADHYAAYAM: 3,
      });
      expect(stats.verseTypes).toEqual({
        // OTHERS: 2,
        SLOKAM: 5,
      });
      expect(stats.versesWithMeaning).toBe(2);
      expect(stats.versesWithChandas).toBe(1);
      expect(stats.averageVerseLength).toBeGreaterThan(0);
    });

    test("getEntityStatistics should handle empty hierarchy", () => {
      const emptyHierarchy: ParsedHierarchy = {
        root: {
          type: "KAVYAM",
          text: [{ language: "SAN", value: "Empty Book" }],
          meaning: [],
          attributes: [],
          bookmarked: false,
          order: 0,
          notes: "",
        },
        books: [],
        chapters: [],
        verses: [],
        metadata: {
          totalEntities: 1,
          rootTitle: "Empty Book",
          bookCount: 0,
          chapterCount: 0,
          verseCount: 0,
          hasHierarchicalBooks: false,
        },
      };

      const stats = getEntityStatistics(emptyHierarchy);

      expect(stats.totalEntities).toBe(1);
      expect(stats.chapterTypes).toEqual({});
      expect(stats.verseTypes).toEqual({});
      expect(stats.versesWithMeaning).toBe(0);
      expect(stats.versesWithChandas).toBe(0);
      expect(stats.averageVerseLength).toBe(0);
    });
  });

  describe("Edge cases", () => {
    test("should handle verse data with only text (no verse)", () => {
      const dataWithOnlyText = {
        title: "Text Only",
        data: [
          {
            c: "1",
            t: "Only explanatory text here",
          },
        ],
      };

      const result = parseSanskritSahityaData(dataWithOnlyText);
      expect(result.verses).toHaveLength(1);
      // expect(result.verses[0].type).toBe("OTHERS");
      expect(result.verses[0].text[0].value).toBe("Only explanatory text here");
    });

    test("should handle verse data with only verse (no text)", () => {
      const dataWithOnlyVerse = {
        title: "Verse Only",
        data: [
          {
            c: "1",
            v: "Only verse text here",
          },
        ],
      };

      const result = parseSanskritSahityaData(dataWithOnlyVerse);
      expect(result.verses).toHaveLength(1);
      expect(result.verses[0].type).toBe("SLOKAM");
      expect(result.verses[0].text[0].value).toBe("Only verse text here");
    });

    test("should handle missing verse numbers and indices", () => {
      const dataWithMissingFields = {
        title: "Missing Fields",
        data: [
          {
            c: "1",
            v: "Verse without number or index",
          },
        ],
      };

      const result = parseSanskritSahityaData(dataWithMissingFields);
      expect(result.verses).toHaveLength(1);

      const verse = result.verses[0];
      expect(verse.attributes.some((attr) => attr.key === "verseNumber")).toBe(
        false,
      );
      expect(verse.attributes.some((attr) => attr.key === "bookIndex")).toBe(
        false,
      );
      expect(verse.order).toBe(0);
    });

    test("should handle chapters with numeric string numbers", () => {
      const dataWithNumericChapterNumbers = {
        title: "Numeric Chapters",
        chapters: [
          { number: "1", name: "Chapter One" },
          { number: "2.5", name: "Chapter Two Point Five" },
        ],
        data: [
          { c: "1", v: "Verse in chapter 1" },
          { c: "2.5", v: "Verse in chapter 2.5" },
        ],
      };

      const result = parseSanskritSahityaData(dataWithNumericChapterNumbers);
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].order).toBe(1);
      expect(result.chapters[1].order).toBe(5);
    });
  });

  describe("Hierarchical Books Structure", () => {
    const hierarchicalData: SanskritSahityaData = {
      title: "महाभारतम्",
      terms: {
        bookSg: "पर्व",
        chapterSg: "अध्यायः",
      },
      books: [
        { number: "1", name: "आदिपर्व" },
        { number: "2", name: "सभापर्व" },
      ],
      chapters: [
        { number: "1.1", name: "प्रथम अध्याय" },
        { number: "1.2", name: "द्वितीय अध्याय" },
        { number: "2.1", name: "सभा प्रथम अध्याय" },
      ],
      data: [
        { c: "1.1", n: "1", v: "धृतराष्ट्र उवाच।" },
        { c: "1.2", n: "1", v: "संजय उवाच।" },
        { c: "2.1", n: "1", v: "जनमेजय उवाच।" },
      ],
    };

    test("should parse hierarchical structure correctly", () => {
      const result = parseSanskritSahityaData(hierarchicalData);

      expect(result.root.text[0].value).toBe("महाभारतम्");
      expect(result.root.type).toBe("KAVYAM");
      expect(result.books).toHaveLength(2);
      expect(result.chapters).toHaveLength(3);
      expect(result.verses).toHaveLength(3);
      expect(result.metadata.hasHierarchicalBooks).toBe(true);
      expect(result.metadata.totalEntities).toBe(9); // 1 root + 2 books + 3 chapters + 3 verses
    });

    test("should use bookSg from terms for book entity type", () => {
      const result = parseSanskritSahityaData(hierarchicalData);

      expect(result.books[0].type).toBe(BOOK_SG_ENTITY_TYPE_MAP["पर्व"]);
      expect(result.books[1].type).toBe(BOOK_SG_ENTITY_TYPE_MAP["पर्व"]);
    });

    test("should create proper parent relationships in hierarchical structure", () => {
      const result = parseSanskritSahityaData(hierarchicalData);

      // Books should belong to root
      expect(result.books[0].parentRelation?.type).toBe("root");
      expect(result.books[1].parentRelation?.type).toBe("root");

      // Chapters should belong to books
      expect(result.chapters[0].parentRelation?.type).toBe("book");
      expect(result.chapters[0].parentRelation?.bookNumber).toBe("1");
      expect(result.chapters[1].parentRelation?.type).toBe("book");
      expect(result.chapters[1].parentRelation?.bookNumber).toBe("1");
      expect(result.chapters[2].parentRelation?.type).toBe("book");
      expect(result.chapters[2].parentRelation?.bookNumber).toBe("2");

      // Verses should belong to chapters
      expect(result.verses[0].parentRelation?.type).toBe("chapter");
      expect(result.verses[0].parentRelation?.chapterNumber).toBe("1.1");
      expect(result.verses[1].parentRelation?.type).toBe("chapter");
      expect(result.verses[1].parentRelation?.chapterNumber).toBe("1.2");
      expect(result.verses[2].parentRelation?.type).toBe("chapter");
      expect(result.verses[2].parentRelation?.chapterNumber).toBe("2.1");
    });

    test("should add book attributes for hierarchical chapters", () => {
      const result = parseSanskritSahityaData(hierarchicalData);

      // Chapters should have bookNumber attribute
      expect(result.chapters[0].attributes).toContainEqual({
        key: "bookNumber",
        value: "1",
      });
      expect(result.chapters[0].attributes).toContainEqual({
        key: "localChapterNumber",
        value: "1",
      });
      expect(result.chapters[2].attributes).toContainEqual({
        key: "bookNumber",
        value: "2",
      });
    });

    test("should handle mixed structures gracefully", () => {
      const mixedData: SanskritSahityaData = {
        title: "Mixed Structure",
        books: [{ number: "1", name: "Book 1" }],
        chapters: [
          { number: "1.1", name: "Chapter 1.1" }, // Belongs to book
          { number: "2", name: "Standalone Chapter" }, // No corresponding book
        ],
        data: [
          { c: "1.1", v: "Verse in book chapter" },
          { c: "2", v: "Verse in standalone chapter" },
          { v: "Verse without chapter" }, // Should belong to root
        ],
      };

      const result = parseSanskritSahityaData(mixedData);

      expect(result.books).toHaveLength(1);
      expect(result.chapters).toHaveLength(2);
      expect(result.verses).toHaveLength(3);

      // First chapter belongs to book
      expect(result.chapters[0].parentRelation?.type).toBe("book");
      expect(result.chapters[0].parentRelation?.bookNumber).toBe("1");

      // Second chapter has no corresponding book, belongs to root
      expect(result.chapters[1].parentRelation?.type).toBe("root");

      // Verses have appropriate parents
      expect(result.verses[0].parentRelation?.type).toBe("chapter");
      expect(result.verses[1].parentRelation?.type).toBe("chapter");
      expect(result.verses[2].parentRelation?.type).toBe("root");
    });
  });
});
