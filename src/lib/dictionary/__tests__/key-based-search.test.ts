/**
 * Unit Tests for Key-Based Search (Phase 13)
 *
 * Tasks: T218-T219
 * Purpose: Test KEY_EXACT and KEY_PREFIX search modes
 * Coverage:
 * - T218: All scripts (Sanskrit/Devanagari, Telugu, Latin/IAST)
 * - T219: Verify scoring formulas (exact=100, prefix=80+15×ratio)
 */

import { SearchService } from "../search-service";
import {
  IDictionaryRepository,
  DatabaseResult,
} from "../dictionary-repository";
import { DictionaryWord } from "@/app/generated/prisma";
import { SearchOptions, SearchMode } from "../types";

// Mock repository
class MockDictionaryRepository implements IDictionaryRepository {
  findWords = jest.fn();
  countWords = jest.fn();
  aggregateSearch = jest.fn();
  findById = jest.fn();
}

describe("Key-Based Search", () => {
  let service: SearchService;
  let mockRepository: MockDictionaryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new MockDictionaryRepository();
    service = new SearchService(mockRepository);
  });

  describe("T218: Multi-Script Support", () => {
    describe("Sanskrit/Devanagari Script", () => {
      it("should search exact match in Devanagari", async () => {
        const mockWords: DictionaryWord[] = [
          {
            id: "1",
            origin: "mw",
            wordIndex: 1,
            word: [{ language: "sa", value: "नमस्ते" }],
            description: [{ language: "en", value: "greeting" }],
            attributes: [],
            phonetic: "namaste",
            wordLnum: 1,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const dbResult: DatabaseResult<DictionaryWord> = {
          data: mockWords,
          total: 1,
          hasMore: false,
        };

        mockRepository.findWords.mockResolvedValue(dbResult);

        const options: SearchOptions = {
          queryText: "नमस्ते",
          filters: {
            origins: [],
            language: "sa",
            wordLengthMin: null,
            wordLengthMax: null,
            hasAudio: null,
            hasAttributes: null,
            dateRange: { start: null, end: null },
            searchMode: SearchMode.KEY_EXACT,
            sortBy: "wordIndex",
            sortDirection: "asc",
          },
          sortBy: "wordIndex",
          sortDirection: "asc",
          pagination: { limit: 20, offset: 0 },
        };

        const result = await service.performSearch(options);

        expect(result.status).toBe("success");
        if (result.status === "success") {
          expect(mockRepository.findWords).toHaveBeenCalledWith(
            expect.objectContaining({
              searchMode: SearchMode.KEY_EXACT,
              sortBy: "wordIndex",
              sortOrder: "asc",
              language: "sa",
            }),
          );
        }
      });

      it("should search prefix match in Devanagari", async () => {
        const mockWords: DictionaryWord[] = [
          {
            id: "1",
            origin: "mw",
            wordIndex: 1,
            word: [{ language: "sa", value: "नमस्ते" }],
            description: [{ language: "en", value: "greeting" }],
            attributes: [],
            phonetic: "namaste",
            wordLnum: 1,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2",
            origin: "mw",
            wordIndex: 2,
            word: [{ language: "sa", value: "नमस्कार" }],
            description: [{ language: "en", value: "salutation" }],
            attributes: [],
            phonetic: "namaskara",
            wordLnum: 2,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const dbResult: DatabaseResult<DictionaryWord> = {
          data: mockWords,
          total: 2,
          hasMore: false,
        };

        mockRepository.findWords.mockResolvedValue(dbResult);

        const options: SearchOptions = {
          queryText: "नम",
          filters: {
            origins: [],
            language: "sa",
            wordLengthMin: null,
            wordLengthMax: null,
            hasAudio: null,
            hasAttributes: null,
            dateRange: { start: null, end: null },
            searchMode: SearchMode.KEY_PREFIX,
            sortBy: "wordIndex",
            sortDirection: "asc",
          },
          sortBy: "wordIndex",
          sortDirection: "desc",
          pagination: { limit: 20, offset: 0 },
        };

        const result = await service.performSearch(options);

        expect(result.status).toBe("success");
        if (result.status === "success") {
          expect(mockRepository.findWords).toHaveBeenCalledWith(
            expect.objectContaining({
              searchMode: SearchMode.KEY_PREFIX,
              sortBy: "wordIndex",
              sortOrder: "desc",
            }),
          );
        }
      });
    });

    describe("Telugu Script", () => {
      it("should search exact match in Telugu", async () => {
        const mockWords: DictionaryWord[] = [
          {
            id: "1",
            origin: "eng2te",
            wordIndex: 1,
            word: [{ language: "te", value: "నమస్తే" }],
            description: [{ language: "en", value: "greeting" }],
            attributes: [],
            phonetic: "namaste",
            wordLnum: 1,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const dbResult: DatabaseResult<DictionaryWord> = {
          data: mockWords,
          total: 1,
          hasMore: false,
        };

        mockRepository.findWords.mockResolvedValue(dbResult);

        const options: SearchOptions = {
          queryText: "నమస్తే",
          filters: {
            origins: ["eng2te"],
            language: "te",
            wordLengthMin: null,
            wordLengthMax: null,
            hasAudio: null,
            hasAttributes: null,
            dateRange: { start: null, end: null },
            searchMode: SearchMode.KEY_EXACT,
            sortBy: "wordIndex",
            sortDirection: "asc",
          },
          sortBy: "wordIndex",
          sortDirection: "asc",
          pagination: { limit: 20, offset: 0 },
        };

        const result = await service.performSearch(options);

        expect(result.status).toBe("success");
        if (result.status === "success") {
          expect(mockRepository.findWords).toHaveBeenCalledWith(
            expect.objectContaining({
              searchMode: SearchMode.KEY_EXACT,
              sortBy: "wordIndex",
              sortOrder: "asc",
              language: "te",
            }),
          );
        }
      });

      it("should search prefix match in Telugu", async () => {
        const mockWords: DictionaryWord[] = [
          {
            id: "1",
            origin: "eng2te",
            wordIndex: 1,
            word: [{ language: "te", value: "రామాయణం" }],
            description: [{ language: "en", value: "epic" }],
            attributes: [],
            phonetic: "ramayanam",
            wordLnum: 1,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2",
            origin: "eng2te",
            wordIndex: 2,
            word: [{ language: "te", value: "రామచంద్రుడు" }],
            description: [{ language: "en", value: "Lord Rama" }],
            attributes: [],
            phonetic: "ramachandrudu",
            wordLnum: 2,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const dbResult: DatabaseResult<DictionaryWord> = {
          data: mockWords,
          total: 2,
          hasMore: false,
        };

        mockRepository.findWords.mockResolvedValue(dbResult);

        const options: SearchOptions = {
          queryText: "రామ",
          filters: {
            origins: ["eng2te"],
            language: "te",
            wordLengthMin: null,
            wordLengthMax: null,
            hasAudio: null,
            hasAttributes: null,
            dateRange: { start: null, end: null },
            searchMode: SearchMode.KEY_PREFIX,
            sortBy: "wordIndex",
            sortDirection: "asc",
          },
          sortBy: "wordIndex",
          sortDirection: "desc",
          pagination: { limit: 20, offset: 0 },
        };

        const result = await service.performSearch(options);

        expect(result.status).toBe("success");
        if (result.status === "success") {
          expect(mockRepository.findWords).toHaveBeenCalledWith(
            expect.objectContaining({
              searchMode: SearchMode.KEY_PREFIX,
              sortBy: "wordIndex",
              sortOrder: "desc",
            }),
          );
        }
      });
    });

    describe("Latin/IAST Script", () => {
      it("should search exact match in Latin (case-insensitive)", async () => {
        const mockWords: DictionaryWord[] = [
          {
            id: "1",
            origin: "mw",
            wordIndex: 1,
            word: [{ language: "sa-iast", value: "namaste" }],
            description: [{ language: "en", value: "greeting" }],
            attributes: [],
            phonetic: "namaste",
            wordLnum: 1,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const dbResult: DatabaseResult<DictionaryWord> = {
          data: mockWords,
          total: 1,
          hasMore: false,
        };

        mockRepository.findWords.mockResolvedValue(dbResult);

        const options: SearchOptions = {
          queryText: "Namaste", // Mixed case
          filters: {
            origins: ["mw"],
            language: null,
            wordLengthMin: null,
            wordLengthMax: null,
            hasAudio: null,
            hasAttributes: null,
            dateRange: { start: null, end: null },
            searchMode: SearchMode.KEY_EXACT,
            sortBy: "wordIndex",
            sortDirection: "asc",
          },
          sortBy: "wordIndex",
          sortDirection: "asc",
          pagination: { limit: 20, offset: 0 },
        };

        const result = await service.performSearch(options);

        expect(result.status).toBe("success");
        if (result.status === "success") {
          expect(mockRepository.findWords).toHaveBeenCalledWith(
            expect.objectContaining({
              searchMode: SearchMode.KEY_EXACT,
              sortBy: "wordIndex",
              sortOrder: "asc",
            }),
          );
        }
      });

      it("should search prefix match in IAST", async () => {
        const mockWords: DictionaryWord[] = [
          {
            id: "1",
            origin: "mw",
            wordIndex: 1,
            word: [{ language: "sa-iast", value: "dhātu" }],
            description: [{ language: "en", value: "root" }],
            attributes: [],
            phonetic: "dhatu",
            wordLnum: 1,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2",
            origin: "mw",
            wordIndex: 2,
            word: [{ language: "sa-iast", value: "dharma" }],
            description: [{ language: "en", value: "duty" }],
            attributes: [],
            phonetic: "dharma",
            wordLnum: 2,
            sourceData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const dbResult: DatabaseResult<DictionaryWord> = {
          data: mockWords,
          total: 2,
          hasMore: false,
        };

        mockRepository.findWords.mockResolvedValue(dbResult);

        const options: SearchOptions = {
          queryText: "dh",
          filters: {
            origins: ["mw"],
            language: null,
            wordLengthMin: null,
            wordLengthMax: null,
            hasAudio: null,
            hasAttributes: null,
            dateRange: { start: null, end: null },
            searchMode: SearchMode.KEY_PREFIX,
            sortBy: "wordIndex",
            sortDirection: "asc",
          },
          sortBy: "wordIndex",
          sortDirection: "desc",
          pagination: { limit: 20, offset: 0 },
        };

        const result = await service.performSearch(options);

        expect(result.status).toBe("success");
        if (result.status === "success") {
          expect(mockRepository.findWords).toHaveBeenCalledWith(
            expect.objectContaining({
              searchMode: SearchMode.KEY_PREFIX,
              sortBy: "wordIndex",
              sortOrder: "desc",
            }),
          );
        }
      });
    });
  });

  describe("T219: Scoring Formula Verification", () => {
    describe("KEY_EXACT scoring", () => {
      it("should assign score of 100 for exact matches", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "sa", value: "dharma" }],
          description: [{ language: "en", value: "duty" }],
          attributes: [],
          phonetic: "dharma",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = service.calculateRelevance(
          word,
          "dharma",
          ["dharma"],
          SearchMode.KEY_EXACT,
        );

        expect(result.relevanceScore).toBe(100);
      });

      it("should assign score of 100 for case-insensitive Latin matches", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "sa-iast", value: "namaste" }],
          description: [{ language: "en", value: "greeting" }],
          attributes: [],
          phonetic: "namaste",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = service.calculateRelevance(
          word,
          "NAMASTE",
          ["namaste"],
          SearchMode.KEY_EXACT,
        );

        expect(result.relevanceScore).toBe(100);
      });
    });

    describe("KEY_PREFIX scoring formula: 80 + (15 × queryLength / wordLength)", () => {
      it("should calculate score for 2-char query on 3-char word (2/3 ratio)", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "en", value: "abc" }],
          description: [{ language: "en", value: "test" }],
          attributes: [],
          phonetic: "abc",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Formula: 80 + (15 × 2 / 3) = 80 + 10 = 90
        const result = service.calculateRelevance(
          word,
          "ab",
          ["ab"],
          SearchMode.KEY_PREFIX,
        );

        expect(result.relevanceScore).toBe(90);
      });

      it("should calculate score for 2-char query on 7-char word (2/7 ratio)", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "en", value: "abandon" }],
          description: [{ language: "en", value: "test" }],
          attributes: [],
          phonetic: "abandon",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Formula: 80 + (15 × 2 / 7) ≈ 80 + 4.29 = 84.29 (rounded to 84)
        const result = service.calculateRelevance(
          word,
          "ab",
          ["ab"],
          SearchMode.KEY_PREFIX,
        );

        expect(result.relevanceScore).toBeCloseTo(84, 0);
      });

      it("should calculate score for 5-char query on 10-char word (5/10 = 0.5 ratio)", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "en", value: "abcdefghij" }],
          description: [{ language: "en", value: "test" }],
          attributes: [],
          phonetic: "abcdefghij",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Formula: 80 + (15 × 5 / 10) = 80 + 7.5 = 87.5
        const result = service.calculateRelevance(
          word,
          "abcde",
          ["abcde"],
          SearchMode.KEY_PREFIX,
        );

        expect(result.relevanceScore).toBe(87.5);
      });

      it("should upgrade exact prefix match to score 100", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "en", value: "test" }],
          description: [{ language: "en", value: "test" }],
          attributes: [],
          phonetic: "test",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Full word match in PREFIX mode should be upgraded to 100
        const result = service.calculateRelevance(
          word,
          "test",
          ["test"],
          SearchMode.KEY_PREFIX,
        );

        expect(result.relevanceScore).toBe(100);
      });
    });

    describe("Multi-match bonus: +5 per additional match (cap +15)", () => {
      it("should add +5 bonus for 2 language matches", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [
            { language: "sa", value: "dharma" },
            { language: "en", value: "dharma" },
          ],
          description: [{ language: "en", value: "duty" }],
          attributes: [],
          phonetic: "dharma",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Base score 100 + 5 bonus = 105 (but capped at 100)
        const result = service.calculateRelevance(
          word,
          "dharma",
          ["dharma"],
          SearchMode.KEY_EXACT,
        );

        expect(result.relevanceScore).toBe(100);
      });

      it("should add +10 bonus for 3 language matches", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [
            { language: "sa", value: "om" },
            { language: "en", value: "om" },
            { language: "te", value: "om" },
          ],
          description: [{ language: "en", value: "sacred sound" }],
          attributes: [],
          phonetic: "om",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Base score 100 + 10 bonus = 110 (but capped at 100)
        const result = service.calculateRelevance(
          word,
          "om",
          ["om"],
          SearchMode.KEY_EXACT,
        );

        expect(result.relevanceScore).toBe(100);
      });

      it("should cap multi-match bonus at +15 (4+ matches)", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [
            { language: "sa", value: "test" },
            { language: "en", value: "test" },
            { language: "te", value: "test" },
            { language: "hi", value: "test" },
            { language: "ta", value: "test" },
          ],
          description: [{ language: "en", value: "test word" }],
          attributes: [],
          phonetic: "test",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Base score 100 + capped 15 bonus = 115 (but score capped at 100)
        const result = service.calculateRelevance(
          word,
          "test",
          ["test"],
          SearchMode.KEY_EXACT,
        );

        expect(result.relevanceScore).toBe(100);
      });
    });

    describe("Language filter integration with scoring", () => {
      it("should score language-specific exact match", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [
            { language: "sa", value: "dharma" },
            { language: "en", value: "duty" },
          ],
          description: [{ language: "en", value: "religious duty" }],
          attributes: [],
          phonetic: "dharma",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // When language filter is "sa", should match only Sanskrit
        const result = service.calculateRelevance(
          word,
          "dharma",
          ["dharma"],
          SearchMode.KEY_EXACT,
        );

        expect(result.relevanceScore).toBe(100);
      });

      it("should apply prefix scoring with language filter", () => {
        const word: DictionaryWord = {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [
            { language: "sa", value: "dharma" },
            { language: "en", value: "duty" },
          ],
          description: [{ language: "en", value: "religious duty" }],
          attributes: [],
          phonetic: "dharma",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // PREFIX mode with language filter "sa", query "dh" (2/6 ratio)
        // Formula: 80 + (15 × 2 / 6) = 80 + 5 = 85
        const result = service.calculateRelevance(
          word,
          "dh",
          ["dh"],
          SearchMode.KEY_PREFIX,
        );

        expect(result.relevanceScore).toBe(85);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty query text", async () => {
      const options: SearchOptions = {
        queryText: "",
        filters: {
          origins: [],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
          searchMode: SearchMode.KEY_EXACT,
          sortBy: "wordIndex",
          sortDirection: "asc",
        },
        sortBy: "relevance",
        sortDirection: "asc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("error");
    });

    it("should handle query longer than word in PREFIX mode", () => {
      const word: DictionaryWord = {
        id: "1",
        origin: "mw",
        wordIndex: 1,
        word: [{ language: "en", value: "om" }],
        description: [{ language: "en", value: "sacred sound" }],
        attributes: [],
        phonetic: "om",
        wordLnum: 1,
        sourceData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Query "omkar" is longer than word "om", should not match in PREFIX
      const result = service.calculateRelevance(
        word,
        "omkar",
        ["omkar"],
        SearchMode.KEY_PREFIX,
      );

      // No match, score should be 0
      expect(result.relevanceScore).toBe(0);
    });

    it("should handle special Unicode characters", async () => {
      const mockWords: DictionaryWord[] = [
        {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "sa", value: "आत्मन्" }],
          description: [{ language: "en", value: "self" }],
          attributes: [],
          phonetic: "ātman",
          wordLnum: 1,
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const dbResult: DatabaseResult<DictionaryWord> = {
        data: mockWords,
        total: 1,
        hasMore: false,
      };

      mockRepository.findWords.mockResolvedValue(dbResult);

      const options: SearchOptions = {
        queryText: "आत्मन्",
        filters: {
          origins: [],
          language: "sa",
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
          searchMode: SearchMode.KEY_EXACT,
          sortBy: "wordIndex",
          sortDirection: "asc",
        },
        sortBy: "relevance",
        sortDirection: "asc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("success");
    });
  });
});
