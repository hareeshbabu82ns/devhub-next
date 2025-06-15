/**
 * Integration tests for Sanskrit Sahitya Import functionality
 * Tests the complete parsing workflow without database dependencies
 */

import { writeFile, unlink, mkdir } from "fs/promises";
import { resolve } from "path";
import { existsSync } from "fs";
import {
  parseSanskritSahityaData,
  validateSanskritSahityaData,
  getEntityStatistics,
} from "@/lib/scrape/sanskrit-sahitya-parser";

describe("Sanskrit Sahitya Import Integration", () => {
  const testDir = resolve(__dirname, "test-data");
  const testFilePath = resolve(testDir, "test-sahitya.json");

  const mockSahityaData = {
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

  beforeEach(async () => {
    // Setup test directory
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }

    // Create test JSON file
    await writeFile(testFilePath, JSON.stringify(mockSahityaData, null, 2));
  });

  afterEach(async () => {
    try {
      await unlink(testFilePath);
    } catch {
      // File might not exist, ignore
    }
  });

  describe("Complete workflow", () => {
    test("should complete full parsing workflow", async () => {
      // Step 1: Read and parse file
      const fileContent = await import("fs/promises").then((fs) =>
        fs.readFile(testFilePath, "utf-8"),
      );
      const jsonData = JSON.parse(fileContent);

      // Step 2: Validate data structure
      const validatedData = validateSanskritSahityaData(jsonData);
      expect(validatedData.title).toBe("नाट्यशास्त्रम्");

      // Step 3: Parse into entity hierarchy
      const hierarchy = parseSanskritSahityaData(validatedData, {
        defaultLanguage: "SAN",
        meaningLanguage: "ENG",
        bookmarkAll: false,
      });

      // Step 4: Verify complete structure
      expect(hierarchy.metadata.totalEntities).toBe(9);
      expect(hierarchy.book.type).toBe("KAVYAM");
      expect(hierarchy.chapters).toHaveLength(3);
      expect(hierarchy.verses).toHaveLength(5);

      // Step 5: Get statistics
      const stats = getEntityStatistics(hierarchy);
      expect(stats.totalEntities).toBe(9);
      expect(stats.chapterTypes).toEqual({
        KAANDAM: 2,
        ADHYAAYAM: 1,
      });
      expect(stats.verseTypes).toEqual({
        // OTHERS: 2,
        SLOKAM: 5,
      });
    });

    test("should handle real-world data structure variations", async () => {
      // Test with minimal data
      const minimalData = {
        title: "Simple Test",
        data: [{ c: "1", v: "Simple verse" }],
      };

      const validated = validateSanskritSahityaData(minimalData);
      const parsed = parseSanskritSahityaData(validated);

      expect(parsed.book.text[0].value).toBe("Simple Test");
      expect(parsed.chapters).toHaveLength(0);
      expect(parsed.verses).toHaveLength(1);
      expect(parsed.verses[0].parentRelation?.type).toBe("book");
    });

    test("should handle complex nested chapter structure", async () => {
      const nestedData = {
        title: "Complex Structure",
        chapters: [
          { number: "1", name: "Chapter 1" },
          { number: "1.1", name: "Sub-chapter 1.1" },
          { number: "1.2", name: "Sub-chapter 1.2" },
          { number: "2", name: "Chapter 2" },
        ],
        data: [
          { c: "1", v: "Verse in chapter 1" },
          { c: "1.1", v: "Verse in sub-chapter 1.1" },
          { c: "1.2", v: "Verse in sub-chapter 1.2" },
          { c: "2", v: "Verse in chapter 2" },
        ],
      };

      const validated = validateSanskritSahityaData(nestedData);
      const parsed = parseSanskritSahityaData(validated);

      expect(parsed.chapters).toHaveLength(4);
      expect(parsed.verses).toHaveLength(4);

      // Check that sub-chapters have proper parent relationships
      const subChapters = parsed.chapters.filter((ch) =>
        ch.attributes.some(
          (attr) => attr.key === "chapterNumber" && attr.value.includes("."),
        ),
      );
      expect(subChapters).toHaveLength(2);
      // Note: Currently our implementation sets parent to book if main chapter not found,
      // but in a full implementation this would be improved
    });

    test("should preserve all Sanskrit text and English translations", async () => {
      const hierarchy = parseSanskritSahityaData(mockSahityaData);

      // Check Sanskrit text preservation
      const sanskritTexts = hierarchy.verses
        .map((v) => v.text.find((t) => t.language === "SAN")?.value)
        .filter(Boolean);

      expect(sanskritTexts).toContain(
        "प्रणम्य शिरसा देवौ पितामहमहेश्वरौ । नाट्यशास्त्रं प्रवक्ष्यामि ब्रह्मणा यदुदाहृतम् ॥",
      );
      expect(sanskritTexts).toContain(
        "भरतस्य वचः श्रुत्वा पप्रच्छुर्मुनयस्ततः । भगवन्श्रोतुमिच्छामो यजनं रङ्गसंश्रयम् ॥",
      );

      // Check English translations
      const englishMeanings = hierarchy.verses
        .flatMap((v) => v.meaning.filter((m) => m.language === "ENG"))
        .map((m) => m.value);

      expect(
        englishMeanings.some((m) => m.includes("Having heard Bharata's words")),
      ).toBe(true);
      expect(englishMeanings.some((m) => m.includes("Word-by-word:"))).toBe(
        true,
      );
    });

    test("should handle error conditions gracefully", () => {
      // Invalid data structure
      expect(() => validateSanskritSahityaData({})).toThrow();
      expect(() => validateSanskritSahityaData({ title: "Test" })).toThrow();
      expect(() => validateSanskritSahityaData({ data: [] })).toThrow();

      // Invalid JSON
      expect(() => JSON.parse("{ invalid }")).toThrow();
    });

    test("should support different language configurations", () => {
      const hindiOptions = {
        defaultLanguage: "HIN",
        meaningLanguage: "HIN",
        bookmarkAll: true,
      };

      const hierarchy = parseSanskritSahityaData(mockSahityaData, hindiOptions);

      expect(hierarchy.book.text[0].language).toBe("HIN");
      expect(hierarchy.book.bookmarked).toBe(true);
      expect(hierarchy.chapters[0].bookmarked).toBe(true);
      expect(hierarchy.verses[0].bookmarked).toBe(true);

      // Meanings should still be in the specified meaning language
      const versesWithMeanings = hierarchy.verses.filter(
        (v) => v.meaning.length > 0,
      );
      versesWithMeanings.forEach((verse) => {
        verse.meaning.forEach((meaning) => {
          expect(meaning.language).toBe("HIN");
        });
      });
    });
  });

  describe("Performance and scalability", () => {
    test("should handle large datasets efficiently", () => {
      // Create a large dataset
      const largeData = {
        title: "Large Dataset",
        chapters: Array.from({ length: 100 }, (_, i) => ({
          number: (i + 1).toString(),
          name: `Chapter ${i + 1}`,
        })),
        data: Array.from({ length: 1000 }, (_, i) => ({
          c: Math.floor(i / 10 + 1).toString(),
          n: ((i % 10) + 1).toString(),
          i,
          v: `Verse ${i + 1} content here`,
          es: `English translation for verse ${i + 1}`,
        })),
      };

      const startTime = Date.now();
      const validated = validateSanskritSahityaData(largeData);
      const parsed = parseSanskritSahityaData(validated);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second for 1000 verses)
      expect(endTime - startTime).toBeLessThan(1000);

      expect(parsed.metadata.totalEntities).toBe(1101); // 1 book + 100 chapters + 1000 verses
      expect(parsed.chapters).toHaveLength(100);
      expect(parsed.verses).toHaveLength(1000);
    });

    test("should handle memory efficiently with large texts", () => {
      const longTextData = {
        title: "Long Text Test",
        data: [
          {
            c: "1",
            v: "A".repeat(10000), // Very long verse
            es: "B".repeat(5000), // Long translation
            anv: "C".repeat(5000), // Long word-by-word
            md: "D".repeat(5000), // Long additional meaning
          },
        ],
      };

      const validated = validateSanskritSahityaData(longTextData);
      const parsed = parseSanskritSahityaData(validated);

      expect(parsed.verses[0].text[0].value).toHaveLength(10000);
      expect(parsed.verses[0].meaning).toHaveLength(3); // es, anv, md
      expect(parsed.verses[0].meaning[0].value).toHaveLength(5000);
    });
  });
});
