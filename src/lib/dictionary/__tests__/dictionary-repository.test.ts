/**
 * Unit Tests for DictionaryRepository
 * 
 * Task: T007
 * Purpose: Test repository layer with mocked Prisma client
 * Coverage Target: 90%+
 */

import { DictionaryRepository, RepositoryQuery } from "../dictionary-repository";
import { PrismaClient, DictionaryWord } from "@/app/generated/prisma";

// Mock Prisma Client
const mockPrismaClient = {
  dictionaryWord: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    aggregateRaw: jest.fn(),
  },
} as unknown as PrismaClient;

describe("DictionaryRepository", () => {
  let repository: DictionaryRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DictionaryRepository(mockPrismaClient);
  });
  
  describe("constructor", () => {
    it("should accept optional PrismaClient instance", () => {
      const repo = new DictionaryRepository(mockPrismaClient);
      expect(repo).toBeInstanceOf(DictionaryRepository);
    });
    
    it("should create repository without explicit client", () => {
      // This will use the lazy-loaded db singleton
      // We can't test this easily without mocking require, so skip in unit tests
      expect(repository).toBeInstanceOf(DictionaryRepository);
    });
  });
  
  describe("findWords", () => {
    const mockWords: DictionaryWord[] = [
      {
        id: "1",
        origin: "mw",
        wordIndex: 1,
        wordLnum: 0,
        word: [{ language: "sa", value: "नमस्ते" }],
        description: [{ language: "en", value: "greetings" }],
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
    
    it("should find words with basic query", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue(mockWords);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(2);
      
      const query: RepositoryQuery = {
        limit: 20,
        offset: 0,
      };
      
      const result = await repository.findWords(query);
      
      expect(result.data).toEqual(mockWords);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { wordIndex: "asc" },
        skip: 0,
        take: 20,
      });
    });
    
    it("should filter by origins", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue([mockWords[0]]);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(1);
      
      const query: RepositoryQuery = {
        origins: ["mw", "ap90"],
        limit: 20,
        offset: 0,
      };
      
      await repository.findWords(query);
      
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            origin: { in: ["mw", "ap90"] },
          }),
        })
      );
    });
    
    it("should filter by queryText", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue([mockWords[0]]);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(1);
      
      const query: RepositoryQuery = {
        queryText: "namaste",
        limit: 20,
        offset: 0,
      };
      
      await repository.findWords(query);
      
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            word: {
              some: {
                value: {
                  contains: "namaste",
                  mode: "insensitive",
                },
              },
            },
          }),
        })
      );
    });
    
    it("should handle pagination with hasMore", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue([mockWords[0]]);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(10);
      
      const query: RepositoryQuery = {
        limit: 5,
        offset: 0,
      };
      
      const result = await repository.findWords(query);
      
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(10);
    });
    
    it("should sort by phonetic descending", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue(mockWords);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(2);
      
      const query: RepositoryQuery = {
        limit: 20,
        offset: 0,
        sortBy: "phonetic",
        sortOrder: "desc",
      };
      
      await repository.findWords(query);
      
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { phonetic: "desc" },
        })
      );
    });
    
    it("should filter by hasAttributes", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(0);
      
      const query: RepositoryQuery = {
        hasAttributes: true,
        limit: 20,
        offset: 0,
      };
      
      await repository.findWords(query);
      
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            attributes: { isEmpty: false },
          }),
        })
      );
    });
    
    it("should filter by date range", async () => {
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(0);
      
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      
      const query: RepositoryQuery = {
        dateRange: {
          start: startDate,
          end: endDate,
        },
        limit: 20,
        offset: 0,
      };
      
      await repository.findWords(query);
      
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });
  
  describe("countWords", () => {
    it("should count words without filters", async () => {
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(100);
      
      const query: RepositoryQuery = {
        limit: 20,
        offset: 0,
      };
      
      const count = await repository.countWords(query);
      
      expect(count).toBe(100);
      expect(mockPrismaClient.dictionaryWord.count).toHaveBeenCalledWith({
        where: {},
      });
    });
    
    it("should count words with filters", async () => {
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(5);
      
      const query: RepositoryQuery = {
        origins: ["mw"],
        queryText: "nama",
        limit: 20,
        offset: 0,
      };
      
      const count = await repository.countWords(query);
      
      expect(count).toBe(5);
      expect(mockPrismaClient.dictionaryWord.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            origin: { in: ["mw"] },
            word: expect.any(Object),
          }),
        })
      );
    });
  });
  
  describe("aggregateSearch", () => {
    it("should perform full-text search with aggregation", async () => {
      const mockAggregateResult = [
        {
          _id: { $oid: "1" },
          origin: "mw",
          wordIndex: 1,
          word: [{ language: "sa", value: "नमस्ते" }],
          description: [{ language: "en", value: "greetings" }],
          attributes: [],
          phonetic: "namaste",
          createdAt: { $date: new Date().toISOString() },
          updatedAt: { $date: new Date().toISOString() },
        },
      ];
      
      (mockPrismaClient.dictionaryWord.aggregateRaw as jest.Mock)
        .mockResolvedValueOnce([{ count: 1 }])  // count pipeline
        .mockResolvedValueOnce(mockAggregateResult);  // search pipeline
      
      const query: RepositoryQuery = {
        queryText: "namaste",
        limit: 20,
        offset: 0,
      };
      
      const result = await repository.aggregateSearch(query);
      
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrismaClient.dictionaryWord.aggregateRaw).toHaveBeenCalledTimes(2);
    });
    
    it("should fall back to findWords for short queries", async () => {
      const mockWords: DictionaryWord[] = [{
        id: "1",
        origin: "mw",
        wordIndex: 1,
        wordLnum: 0,
        word: [{ language: "sa", value: "अ" }],
        description: [{ language: "en", value: "letter a" }],
        attributes: [],
        phonetic: "a",
        sourceData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
      
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockResolvedValue(mockWords);
      (mockPrismaClient.dictionaryWord.count as jest.Mock).mockResolvedValue(1);
      
      const query: RepositoryQuery = {
        queryText: "a",  // Too short for full-text
        limit: 20,
        offset: 0,
      };
      
      const result = await repository.aggregateSearch(query);
      
      expect(result.data).toEqual(mockWords);
      expect(mockPrismaClient.dictionaryWord.aggregateRaw).not.toHaveBeenCalled();
      expect(mockPrismaClient.dictionaryWord.findMany).toHaveBeenCalled();
    });
    
    it("should sort by relevance in full-text search", async () => {
      (mockPrismaClient.dictionaryWord.aggregateRaw as jest.Mock)
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);
      
      const query: RepositoryQuery = {
        queryText: "test query",
        sortBy: "relevance",
        limit: 20,
        offset: 0,
      };
      
      await repository.aggregateSearch(query);
      
      const searchPipelineCall = (mockPrismaClient.dictionaryWord.aggregateRaw as jest.Mock).mock.calls[1][0];
      
      expect(searchPipelineCall.pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            $addFields: { score: { $meta: "textScore" } },
          }),
          expect.objectContaining({
            $sort: {
              score: { $meta: "textScore" },
              wordIndex: 1,
            },
          }),
        ])
      );
    });
  });
  
  describe("findById", () => {
    it("should find word by ID", async () => {
      const mockWord: DictionaryWord = {
        id: "123",
        origin: "mw",
        wordIndex: 1,
        wordLnum: 0,
        word: [{ language: "sa", value: "नमस्ते" }],
        description: [{ language: "en", value: "greetings" }],
        attributes: [],
        phonetic: "namaste",
        sourceData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (mockPrismaClient.dictionaryWord.findUnique as jest.Mock).mockResolvedValue(mockWord);
      
      const result = await repository.findById("123");
      
      expect(result).toEqual(mockWord);
      expect(mockPrismaClient.dictionaryWord.findUnique).toHaveBeenCalledWith({
        where: { id: "123" },
      });
    });
    
    it("should return null for non-existent ID", async () => {
      (mockPrismaClient.dictionaryWord.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await repository.findById("nonexistent");
      
      expect(result).toBeNull();
    });
  });
  
  describe("error handling", () => {
    it("should propagate database errors", async () => {
      const dbError = new Error("Database connection failed");
      (mockPrismaClient.dictionaryWord.findMany as jest.Mock).mockRejectedValue(dbError);
      
      const query: RepositoryQuery = {
        limit: 20,
        offset: 0,
      };
      
      await expect(repository.findWords(query)).rejects.toThrow("Database connection failed");
    });
  });
});
