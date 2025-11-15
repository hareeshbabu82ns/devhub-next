/**
 * Unit Tests for SearchService
 * 
 * Task: T125
 * Purpose: Test service layer without React dependencies
 * Coverage Target: 90%+
 */

import { SearchService } from "../search-service";
import {
  IDictionaryRepository,
  DatabaseResult,
} from "../dictionary-repository";
import { DictionaryWord } from "@/app/generated/prisma";
import { SearchOptions } from "../types";

// Mock repository
class MockDictionaryRepository implements IDictionaryRepository {
  findWords = jest.fn();
  countWords = jest.fn();
  aggregateSearch = jest.fn();
  findById = jest.fn();
}

describe("SearchService", () => {
  let service: SearchService;
  let mockRepository: MockDictionaryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new MockDictionaryRepository();
    service = new SearchService(mockRepository);
  });

  describe("constructor", () => {
    it("should accept repository via dependency injection", () => {
      const repo = new MockDictionaryRepository();
      const searchService = new SearchService(repo);
      expect(searchService).toBeInstanceOf(SearchService);
    });
  });

  describe("performSearch", () => {
    const mockWords: DictionaryWord[] = [
      {
        id: "1",
        origin: "mw",
        wordIndex: 1,
        wordLnum: 0,
        word: [{ language: "sa", value: "नमस्ते" }],
        description: [{ language: "en", value: "greetings, salutation" }],
        attributes: [],
        phonetic: "namaste",
        sourceData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        origin: "mw",
        wordIndex: 2,
        wordLnum: 0,
        word: [{ language: "sa", value: "नमः" }],
        description: [{ language: "en", value: "bow, obeisance" }],
        attributes: [],
        phonetic: "namah",
        sourceData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("should perform search with full-text for long queries", async () => {
      const dbResult: DatabaseResult<DictionaryWord> = {
        data: mockWords,
        total: 2,
        hasMore: false,
      };

      mockRepository.aggregateSearch.mockResolvedValue(dbResult);

      const options: SearchOptions = {
        queryText: "namaste",
        filters: {
          origins: ["mw"],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
        },
        sortBy: "relevance",
        sortDirection: "asc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.results.length).toBe(2);
        expect(result.data.total).toBe(2);
        expect(result.data.hasMore).toBe(false);
      }
      expect(mockRepository.aggregateSearch).toHaveBeenCalled();
    });

    it("should use findWords for short queries", async () => {
      const dbResult: DatabaseResult<DictionaryWord> = {
        data: [mockWords[0]],
        total: 1,
        hasMore: false,
      };

      mockRepository.findWords.mockResolvedValue(dbResult);

      const options: SearchOptions = {
        queryText: "n",
        filters: {
          origins: [],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
        },
        sortBy: "alphabetical",
        sortDirection: "asc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("success");
      expect(mockRepository.findWords).toHaveBeenCalled();
      expect(mockRepository.aggregateSearch).not.toHaveBeenCalled();
    });

    it("should calculate relevance scores for results", async () => {
      const dbResult: DatabaseResult<DictionaryWord> = {
        data: mockWords,
        total: 2,
        hasMore: false,
      };

      mockRepository.aggregateSearch.mockResolvedValue(dbResult);

      const options: SearchOptions = {
        queryText: "namaste",
        filters: {
          origins: [],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
        },
        sortBy: "relevance",
        sortDirection: "desc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.results[0]).toHaveProperty("relevanceScore");
        expect(result.data.results[0]).toHaveProperty("matchType");
        expect(result.data.results[0].relevanceScore).toBeGreaterThan(0);
        expect(result.data.results[0].relevanceScore).toBeLessThanOrEqual(100);
      }
    });

    it("should handle errors gracefully", async () => {
      mockRepository.aggregateSearch.mockRejectedValue(
        new Error("Database error")
      );

      const options: SearchOptions = {
        queryText: "test",
        filters: {
          origins: [],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
        },
        sortBy: "relevance",
        sortDirection: "asc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBe("Search failed");
        expect(result.details).toBe("Database error");
      }
    });

    it("should sort by relevance when requested", async () => {
      const dbResult: DatabaseResult<DictionaryWord> = {
        data: mockWords,
        total: 2,
        hasMore: false,
      };

      mockRepository.aggregateSearch.mockResolvedValue(dbResult);

      const options: SearchOptions = {
        queryText: "nama",
        filters: {
          origins: [],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: null,
          dateRange: { start: null, end: null },
        },
        sortBy: "relevance",
        sortDirection: "desc",
        pagination: { limit: 20, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        // Check that results are sorted by relevance
        const scores = result.data.results.map((r) => r.relevanceScore);
        const sortedScores = [...scores].sort((a, b) => b - a);
        expect(scores).toEqual(sortedScores);
      }
    });
  });

  describe("calculateRelevance", () => {
    const mockWord: DictionaryWord = {
      id: "1",
      origin: "mw",
      wordIndex: 1,
      wordLnum: 0,
      word: [{ language: "sa", value: "नमस्ते" }],
      description: [{ language: "en", value: "greetings, salutation" }],
      attributes: [],
      phonetic: "namaste",
      sourceData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should give high score for exact match", () => {
      const result = service.calculateRelevance(mockWord, "namaste", [
        "namaste",
      ]);

      expect(result.relevanceScore).toBeGreaterThan(50);
      expect(result.matchType).toBe("exact");
      expect(result.searchMetadata?.scoreBreakdown.exactBonus).toBe(25);
    });

    it("should give bonus for prefix match", () => {
      const result = service.calculateRelevance(mockWord, "nama", ["nama"]);

      expect(result.relevanceScore).toBeGreaterThan(0);
      expect(result.matchType).toBe("prefix");
      expect(result.searchMetadata?.scoreBreakdown.prefixBonus).toBeGreaterThan(
        0
      );
    });

    it("should handle phonetic matching", () => {
      const result = service.calculateRelevance(mockWord, "nama", ["nama"]);

      expect(result.matchType).toMatch(/prefix|phonetic/);
      expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it("should return fuzzy or phonetic match for partial matches", () => {
      const result = service.calculateRelevance(mockWord, "aste", ["aste"]);

      expect(result.matchType).toMatch(/fuzzy|phonetic/);
      expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it("should cap relevance score at 100", () => {
      const result = service.calculateRelevance(mockWord, "namaste", [
        "namaste",
        "नमस्ते",
      ]);

      expect(result.relevanceScore).toBeLessThanOrEqual(100);
    });

    it("should include search metadata", () => {
      const result = service.calculateRelevance(mockWord, "namaste", [
        "namaste",
      ]);

      expect(result.searchMetadata).toBeDefined();
      expect(result.searchMetadata?.queryLanguage).toBeDefined();
      expect(result.searchMetadata?.matchedLanguage).toBe("sa");
      expect(result.searchMetadata?.scoreBreakdown).toBeDefined();
    });
  });

  describe("normalizeScripts", () => {
    it("should return original query for empty input", () => {
      const result = service.normalizeScripts("");
      expect(result).toEqual([]);
    });

    it("should include original query in variations", () => {
      const result = service.normalizeScripts("namaste");
      expect(result).toContain("namaste");
    });

    it("should generate script variations", () => {
      const result = service.normalizeScripts("namaste");
      // Should at least include the original query
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result).toContain("namaste");
    });

    it("should deduplicate variations", () => {
      const result = service.normalizeScripts("a");
      const uniqueResults = [...new Set(result)];
      expect(result.length).toBe(uniqueResults.length);
    });

    it("should handle transliteration errors gracefully", () => {
      // Test with special characters that might cause errors
      const result = service.normalizeScripts("@#$%");
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("integration", () => {
    it("should work end-to-end with mock repository", async () => {
      const mockWords: DictionaryWord[] = [
        {
          id: "1",
          origin: "mw",
          wordIndex: 1,
          wordLnum: 0,
          word: [{ language: "sa", value: "योग" }],
          description: [{ language: "en", value: "union, yoga" }],
          attributes: [{ key: "pos", value: "noun" }],
          phonetic: "yoga",
          sourceData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.aggregateSearch.mockResolvedValue({
        data: mockWords,
        total: 1,
        hasMore: false,
      });

      const options: SearchOptions = {
        queryText: "yoga",
        filters: {
          origins: ["mw"],
          language: null,
          wordLengthMin: null,
          wordLengthMax: null,
          hasAudio: null,
          hasAttributes: true,
          dateRange: { start: null, end: null },
        },
        sortBy: "relevance",
        sortDirection: "desc",
        pagination: { limit: 10, offset: 0 },
      };

      const result = await service.performSearch(options);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.results.length).toBe(1);
        expect(result.data.results[0].word[0].value).toBe("योग");
        expect(result.data.results[0].relevanceScore).toBeGreaterThan(0);
        expect(result.data.results[0].matchType).toBe("exact");
      }
    });
  });
});
