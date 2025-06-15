/**
 * Unit tests for Sanskrit Sahitya Import Server Actions
 * Tests the server action logic without database mocking
 */

import { writeFile, unlink, mkdir } from "fs/promises";
import { resolve } from "path";
import { existsSync } from "fs";
import {
  parseSanskritSahityaFile,
  validateSanskritSahityaFile,
} from "@/app/actions/sanskrit-sahitya-import-actions";

// Mock dependencies (only auth, not database)
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/lib/auth";

describe("Sanskrit Sahitya Import Actions", () => {
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

  const mockUser = {
    id: "user123",
    email: "test@example.com",
    name: "Test User",
  };

  const mockSession = {
    user: mockUser,
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup test directory
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }

    // Create test JSON file
    await writeFile(testFilePath, JSON.stringify(mockSahityaData, null, 2));

    // Mock successful authentication
    (auth as jest.MockedFunction<any>).mockResolvedValue(mockSession);
  });

  afterEach(async () => {
    try {
      await unlink(testFilePath);
    } catch {
      // File might not exist, ignore
    }
  });

  describe("validateSanskritSahityaFile", () => {
    test("should validate a correct Sanskrit Sahitya JSON file", async () => {
      const result = await validateSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.isValid).toBe(true);
        expect(result.data.title).toBe("नाट्यशास्त्रम्");
      }
    });

    test("should reject invalid JSON syntax", async () => {
      const invalidFilePath = resolve(testDir, "invalid.json");
      await writeFile(invalidFilePath, "{ invalid json }");

      const result = await validateSanskritSahityaFile(invalidFilePath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Invalid JSON file format");
      }

      await unlink(invalidFilePath);
    });

    test("should reject file with missing required fields", async () => {
      const incompleteData = { title: "Test" }; // Missing 'data' field
      const incompleteFilePath = resolve(testDir, "incomplete.json");
      await writeFile(incompleteFilePath, JSON.stringify(incompleteData));

      const result = await validateSanskritSahityaFile(incompleteFilePath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Invalid file structure");
      }

      await unlink(incompleteFilePath);
    });

    test("should reject unauthorized access", async () => {
      (auth as jest.MockedFunction<any>).mockResolvedValue(null);

      const result = await validateSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBe("Unauthorized access");
      }
    });

    test("should handle file not found error", async () => {
      const nonExistentPath = resolve(testDir, "nonexistent.json");

      const result = await validateSanskritSahityaFile(nonExistentPath);

      expect(result.status).toBe("error");
    });
  });

  describe("parseSanskritSahityaFile", () => {
    test("should successfully parse Sanskrit Sahitya data", async () => {
      const result = await parseSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.metadata.bookTitle).toBe("नाट्यशास्त्रम्");
        expect(result.data.metadata.totalEntities).toBe(9); // 1 book + 3 chapters + 5 verses
        expect(result.data.book.type).toBe("KAVYAM");
        expect(result.data.chapters).toHaveLength(3);
        expect(result.data.verses).toHaveLength(5);
      }
    });

    test("should parse with custom options", async () => {
      const options = {
        defaultLanguage: "HIN",
        meaningLanguage: "ENG",
        bookmarkAll: true,
      };

      const result = await parseSanskritSahityaFile(testFilePath, options);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.book.text[0].language).toBe("HIN");
        expect(result.data.book.bookmarked).toBe(true);
        expect(result.data.chapters[0].bookmarked).toBe(true);
        expect(result.data.verses[0].bookmarked).toBe(true);
      }
    });

    test("should create proper entity structure", async () => {
      const result = await parseSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        const { book, chapters, verses } = result.data;

        // Check book entity
        expect(book.text[0]).toEqual({
          language: "SAN",
          value: "नाट्यशास्त्रम्",
        });
        expect(book.attributes).toContainEqual({
          key: "sourceType",
          value: "sanskritsahitya",
        });

        // Check chapter entities
        expect(chapters[0].type).toBe("KAANDAM");
        expect(chapters[1].type).toBe("KAANDAM");
        expect(chapters[2].type).toBe("ADHYAAYAM"); // Sub-chapter

        // Check verse entities
        expect(verses[0].type).toBe("OTHERS"); // Explanatory text
        expect(verses[2].type).toBe("SLOKAM"); // Actual verse

        // Check verse with chandas
        const verseWithChandas = verses.find((v) =>
          v.attributes.some((attr) => attr.key === "chandas"),
        );
        expect(verseWithChandas).toBeDefined();
        expect(verseWithChandas!.attributes).toContainEqual({
          key: "chandas",
          value: "अनुष्टुप्",
        });
      }
    });

    test("should handle verses with multiple meanings", async () => {
      const result = await parseSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        const versesWithMeaning = result.data.verses.filter(
          (v) => v.meaning.length > 0,
        );
        expect(versesWithMeaning).toHaveLength(2);

        // Check verse with English translation and anuvada
        const verseWithTranslation = versesWithMeaning.find((v) =>
          v.meaning.some((m) =>
            m.value.includes("Having heard Bharata's words"),
          ),
        );
        expect(verseWithTranslation).toBeDefined();
        expect(verseWithTranslation!.meaning).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              language: "ENG",
              value: expect.stringContaining("Having heard Bharata's words"),
            }),
            expect.objectContaining({
              language: "ENG",
              value: expect.stringContaining("Word-by-word:"),
            }),
          ]),
        );

        // Check verse with additional meaning
        const verseWithAdditional = versesWithMeaning.find((v) =>
          v.meaning.some((m) => m.value.includes("Additional:")),
        );
        expect(verseWithAdditional).toBeDefined();
      }
    });

    test("should create proper parent relationships", async () => {
      const result = await parseSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        const { verses } = result.data;

        // Check verses in chapter 1
        const chapter1Verses = verses.filter((v) =>
          v.attributes.some(
            (attr) => attr.key === "chapterNumber" && attr.value === "1",
          ),
        );
        expect(chapter1Verses).toHaveLength(3);
        chapter1Verses.forEach((verse) => {
          expect(verse.parentRelation?.type).toBe("chapter");
          expect(verse.parentRelation?.chapterNumber).toBe("1");
        });

        // Check verse in sub-chapter 3.1
        const chapter3_1Verses = verses.filter((v) =>
          v.attributes.some(
            (attr) => attr.key === "chapterNumber" && attr.value === "3.1",
          ),
        );
        expect(chapter3_1Verses).toHaveLength(1);
        expect(chapter3_1Verses[0].parentRelation?.type).toBe("chapter");
        expect(chapter3_1Verses[0].parentRelation?.chapterNumber).toBe("3.1");
      }
    });

    test("should reject unauthorized access", async () => {
      (auth as jest.MockedFunction<any>).mockResolvedValue(null);

      const result = await parseSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBe("Unauthorized access");
      }
    });

    test("should handle invalid JSON syntax", async () => {
      const invalidFilePath = resolve(testDir, "invalid-parse.json");
      await writeFile(invalidFilePath, "{ invalid json }");

      const result = await parseSanskritSahityaFile(invalidFilePath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Invalid JSON file format");
      }

      await unlink(invalidFilePath);
    });

    test("should handle file with invalid structure", async () => {
      const invalidData = { title: "Test", data: "invalid" }; // data should be array
      const invalidFilePath = resolve(testDir, "invalid-structure.json");
      await writeFile(invalidFilePath, JSON.stringify(invalidData));

      const result = await parseSanskritSahityaFile(invalidFilePath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toContain("Validation error");
      }

      await unlink(invalidFilePath);
    });

    test("should use default options when not provided", async () => {
      const result = await parseSanskritSahityaFile(testFilePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.book.text[0].language).toBe("SAN"); // Default Sanskrit
        expect(result.data.book.bookmarked).toBe(false); // Default not bookmarked

        // Check that meanings are in English (default)
        const versesWithMeaning = result.data.verses.filter(
          (v) => v.meaning.length > 0,
        );
        versesWithMeaning.forEach((verse) => {
          verse.meaning.forEach((meaning) => {
            expect(meaning.language).toBe("ENG");
          });
        });
      }
    });
  });

  describe("Edge cases", () => {
    test("should handle data without chapters", async () => {
      const dataWithoutChapters = {
        title: "Simple Text",
        data: [
          {
            c: "1",
            v: "Test verse",
          },
        ],
      };

      const filePath = resolve(testDir, "no-chapters.json");
      await writeFile(filePath, JSON.stringify(dataWithoutChapters));

      const result = await parseSanskritSahityaFile(filePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.chapters).toHaveLength(0);
        expect(result.data.verses).toHaveLength(1);
        expect(result.data.verses[0].parentRelation?.type).toBe("book");
      }

      await unlink(filePath);
    });

    test("should handle data without terms", async () => {
      const dataWithoutTerms = {
        title: "No Terms",
        data: [
          {
            c: "1",
            v: "Test verse",
          },
        ],
      };

      const filePath = resolve(testDir, "no-terms.json");
      await writeFile(filePath, JSON.stringify(dataWithoutTerms));

      const result = await parseSanskritSahityaFile(filePath);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        const bookAttributes = result.data.book.attributes;
        expect(
          bookAttributes.some((attr) => attr.key === "chapterSingular"),
        ).toBe(false);
        expect(
          bookAttributes.some((attr) => attr.key === "chapterPlural"),
        ).toBe(false);
      }

      await unlink(filePath);
    });

    test("should handle file read errors gracefully", async () => {
      const nonExistentPath = resolve(testDir, "does-not-exist.json");

      const result = await parseSanskritSahityaFile(nonExistentPath);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBeTruthy();
      }
    });
  });
});
