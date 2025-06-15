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

      expect(result.book).toBeDefined();
      expect(result.chapters).toHaveLength(3);
      expect(result.verses).toHaveLength(5);
      expect(result.metadata.totalEntities).toBe(9); // 1 book + 3 chapters + 5 verses
      expect(result.metadata.bookTitle).toBe("नाट्यशास्त्रम्");
    });

    test("should parse with custom options", () => {
      const options: ParseOptions = {
        defaultLanguage: "HIN",
        meaningLanguage: "ENG",
        bookmarkAll: true,
      };

      const result = parseSanskritSahityaData(mockSahityaData, options);

      expect(result.book.text[0].language).toBe("HIN");
      expect(result.book.bookmarked).toBe(true);
      expect(result.chapters[0].bookmarked).toBe(true);
      expect(result.verses[0].bookmarked).toBe(true);
    });

    test("should create proper book entity", () => {
      const result = parseSanskritSahityaData(mockSahityaData);
      const book = result.book;

      expect(book.type).toBe("KAVYAM");
      expect(book.text[0]).toEqual({
        language: "SAN",
        value: "नाट्यशास्त्रम्",
      });
      expect(book.attributes).toContainEqual({
        key: "sourceType",
        value: "sanskritsahitya",
      });
      expect(book.attributes).toContainEqual({
        key: "bookTitle",
        value: "नाट्यशास्त्रम्",
      });
      expect(book.attributes).toContainEqual({
        key: "chapterSingular",
        value: "अध्यायः",
      });
      expect(book.attributes).toContainEqual({
        key: "chapterPlural",
        value: "अध्यायाः",
      });
    });

    test("should create proper chapter entities", () => {
      const result = parseSanskritSahityaData(mockSahityaData);
      const chapters = result.chapters;

      expect(chapters).toHaveLength(3);

      // Regular chapters
      expect(chapters[0].type).toBe("KAANDAM");
      expect(chapters[1].type).toBe("KAANDAM");

      // Sub-chapter
      expect(chapters[2].type).toBe("ADHYAAYAM");
      expect(chapters[2].parentRelation?.type).toBe("book"); // Should fallback to book if parent not found

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
      expect(result.verses[0].parentRelation?.type).toBe("book");
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
      expect(stats.bookTitle).toBe("नाट्यशास्त्रम्");
      expect(stats.chapterTypes).toEqual({
        KAANDAM: 2,
        ADHYAAYAM: 1,
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
        book: {
          type: "KAVYAM",
          text: [{ language: "SAN", value: "Empty Book" }],
          meaning: [],
          attributes: [],
          bookmarked: false,
          order: 0,
          notes: "",
        },
        chapters: [],
        verses: [],
        metadata: {
          totalEntities: 1,
          bookTitle: "Empty Book",
          chapterCount: 0,
          verseCount: 0,
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
      expect(result.chapters[1].order).toBe(2.5);
    });
  });
});
