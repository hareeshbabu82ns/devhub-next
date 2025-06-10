/**
 * Dictionary Processing Tests
 *
 * This test suite demonstrates the testability of the separated dictionary
 * processing logic without requiring actual database connections.
 */

import {
  processDictionaryWordRow,
  processDictionaryWordRows,
  validateRowData,
  SqliteRowData,
  TableMetadata,
} from "../dictionary-processor";
import {
  InMemoryDictionaryWordDatabase,
  saveDictionaryWordsBulk,
} from "../dictionary-database";
import { DictionaryName } from "../dictionary-constants";

describe("Dictionary Processor", () => {
  let mockTableMetadata: TableMetadata;
  let mockRowData: SqliteRowData;

  beforeEach(() => {
    mockTableMetadata = {
      tableName: "testTable",
      columns: ["key", "data", "lnum"],
      columnPositions: { key: 0, data: 1, lnum: 2 },
      wordFieldName: "key",
      descFieldName: "data",
      orderFieldName: "lnum",
    };

    mockRowData = {
      key: "test_word",
      data: "test description",
      lnum: 1,
    };
  });

  describe("processDictionaryWordRow", () => {
    test("should process Sanskrit dictionary word correctly", () => {
      const dictName: DictionaryName = "mw";
      const wordIndex = 1;

      const result = processDictionaryWordRow(
        mockRowData,
        dictName,
        wordIndex,
        mockTableMetadata,
      );

      expect(result).toMatchObject({
        wordIndex: 1,
        origin: "MW",
        wordLnum: 1,
      });

      expect(result.word).toHaveLength(5); // Should have 5 language variants
      expect(result.description).toHaveLength(5);
      expect(result.phonetic).toBeTruthy();
      expect(result.sourceData.wordLang).toBe("SLP1");
      expect(result.sourceData.descriptionLang).toBe("SLP1");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test("should process English dictionary word correctly", () => {
      const dictName: DictionaryName = "eng2te";
      const wordIndex = 1;

      const result = processDictionaryWordRow(
        mockRowData,
        dictName,
        wordIndex,
        mockTableMetadata,
      );

      expect(result).toMatchObject({
        wordIndex: 1,
        origin: "ENG2TEL",
      });

      expect(result.sourceData.wordLang).toBe("ENG");
      expect(result.sourceData.descriptionLang).toBe("TEL");
    });

    test("should handle missing optional fields gracefully", () => {
      const rowDataWithoutLnum = {
        key: "test_word",
        data: "test description",
      };

      const result = processDictionaryWordRow(
        rowDataWithoutLnum,
        "mw",
        1,
        mockTableMetadata,
      );

      expect(result.wordLnum).toBeUndefined();
      expect(result.word).toHaveLength(5);
    });

    test("should handle empty strings appropriately", () => {
      const emptyRowData = {
        key: "",
        data: "",
        lnum: 0,
      };

      const result = processDictionaryWordRow(
        emptyRowData,
        "mw",
        1,
        mockTableMetadata,
      );

      expect(result.word[0].value).toBe("");
      expect(result.description[0].value).toBe("");
    });
  });

  describe("processDictionaryWordRows", () => {
    test("should process multiple rows correctly", () => {
      const rows: SqliteRowData[] = [
        { key: "word1", data: "desc1", lnum: 1 },
        { key: "word2", data: "desc2", lnum: 2 },
        { key: "word3", data: "desc3", lnum: 3 },
      ];

      const results = processDictionaryWordRows(rows, "ae", mockTableMetadata);

      expect(results).toHaveLength(3);
      expect(results[0].wordIndex).toBe(1);
      expect(results[1].wordIndex).toBe(2);
      expect(results[2].wordIndex).toBe(3);

      expect(results[0].word[0].value).toBe("word1");
      expect(results[1].word[0].value).toBe("word2");
      expect(results[2].word[0].value).toBe("word3");
    });

    test("should handle empty array", () => {
      const results = processDictionaryWordRows([], "mw", mockTableMetadata);

      expect(results).toHaveLength(0);
    });
  });

  describe("validateRowData", () => {
    test("should validate correct row data", () => {
      const validation = validateRowData(mockRowData, "mw", mockTableMetadata);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect missing word field", () => {
      const invalidRowData = {
        data: "test description",
        lnum: 1,
      };

      const validation = validateRowData(
        invalidRowData,
        "mw",
        mockTableMetadata,
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Missing word field 'key' for dictionary 'mw'",
      );
    });

    test("should detect unknown dictionary", () => {
      const validation = validateRowData(
        mockRowData,
        "unknown_dict" as DictionaryName,
        mockTableMetadata,
      );

      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((error) =>
          error.includes("Unknown dictionary name"),
        ),
      ).toBe(true);
    });
  });
});

describe("Dictionary Database Operations", () => {
  let database: InMemoryDictionaryWordDatabase;

  beforeEach(() => {
    database = new InMemoryDictionaryWordDatabase();
  });

  describe("InMemoryDictionaryWordDatabase", () => {
    test("should store and retrieve words correctly", async () => {
      const mockWords = [
        {
          wordIndex: 1,
          origin: "MW",
          word: [{ language: "SLP1", value: "test1" }],
          description: [{ language: "SLP1", value: "desc1" }],
          attributes: [],
          phonetic: "test1 desc1",
          sourceData: {
            data: { key: "test1", data: "desc1" },
            wordField: "key",
            descriptionField: "data",
            wordLang: "SLP1",
            descriptionLang: "SLP1",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          wordIndex: 2,
          origin: "MW",
          word: [{ language: "SLP1", value: "test2" }],
          description: [{ language: "SLP1", value: "desc2" }],
          attributes: [],
          phonetic: "test2 desc2",
          sourceData: {
            data: { key: "test2", data: "desc2" },
            wordField: "key",
            descriptionField: "data",
            wordLang: "SLP1",
            descriptionLang: "SLP1",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await database.insertMany(mockWords);

      expect(database.getAllWords()).toHaveLength(2);
      expect(await database.countByOrigin("MW")).toBe(2);
      expect(database.getWordsByOrigin("MW")).toHaveLength(2);
    });

    test("should delete words by origin", async () => {
      const mockWords = [
        {
          wordIndex: 1,
          origin: "MW",
          word: [{ language: "SLP1", value: "test1" }],
          description: [{ language: "SLP1", value: "desc1" }],
          attributes: [],
          phonetic: "test1 desc1",
          sourceData: {
            data: { key: "test1", data: "desc1" },
            wordField: "key",
            descriptionField: "data",
            wordLang: "SLP1",
            descriptionLang: "SLP1",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          wordIndex: 1,
          origin: "AP90",
          word: [{ language: "SLP1", value: "test2" }],
          description: [{ language: "SLP1", value: "desc2" }],
          attributes: [],
          phonetic: "test2 desc2",
          sourceData: {
            data: { key: "test2", data: "desc2" },
            wordField: "key",
            descriptionField: "data",
            wordLang: "SLP1",
            descriptionLang: "SLP1",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await database.insertMany(mockWords);
      expect(database.getAllWords()).toHaveLength(2);

      await database.deleteByOrigin("MW");
      expect(database.getAllWords()).toHaveLength(1);
      expect(database.getWordsByOrigin("MW")).toHaveLength(0);
      expect(database.getWordsByOrigin("AP90")).toHaveLength(1);
    });

    test("should report connection status", async () => {
      expect(await database.isConnected()).toBe(true);
    });
  });

  describe("saveDictionaryWordsBulk", () => {
    test("should save words in chunks with progress tracking", async () => {
      const mockWords = Array.from({ length: 15 }, (_, i) => ({
        wordIndex: i + 1,
        origin: "MW",
        word: [{ language: "SLP1", value: `test${i + 1}` }],
        description: [{ language: "SLP1", value: `desc${i + 1}` }],
        attributes: [],
        phonetic: `test${i + 1} desc${i + 1}`,
        sourceData: {
          data: { key: `test${i + 1}`, data: `desc${i + 1}` },
          wordField: "key",
          descriptionField: "data",
          wordLang: "SLP1",
          descriptionLang: "SLP1",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const progressUpdates: any[] = [];
      await saveDictionaryWordsBulk(mockWords, database, "mw", {
        chunkSize: 5,
        progressCallback: (progress) => {
          progressUpdates.push(progress);
        },
      });

      expect(database.getAllWords()).toHaveLength(15);
      expect(progressUpdates).toHaveLength(3); // 15 words / 5 chunk size = 3 chunks
      expect(progressUpdates[2].percentage).toBe(100);
    });

    test("should delete existing words when requested", async () => {
      // Add some initial words
      await database.insertMany([
        {
          wordIndex: 1,
          origin: "MW",
          word: [{ language: "SLP1", value: "old_word" }],
          description: [{ language: "SLP1", value: "old_desc" }],
          attributes: [],
          phonetic: "old_word old_desc",
          sourceData: {
            data: { key: "old_word", data: "old_desc" },
            wordField: "key",
            descriptionField: "data",
            wordLang: "SLP1",
            descriptionLang: "SLP1",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      expect(database.getAllWords()).toHaveLength(1);

      const newWords = [
        {
          wordIndex: 1,
          origin: "MW",
          word: [{ language: "SLP1", value: "new_word" }],
          description: [{ language: "SLP1", value: "new_desc" }],
          attributes: [],
          phonetic: "new_word new_desc",
          sourceData: {
            data: { key: "new_word", data: "new_desc" },
            wordField: "key",
            descriptionField: "data",
            wordLang: "SLP1",
            descriptionLang: "SLP1",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await saveDictionaryWordsBulk(newWords, database, "mw", {
        deleteExisting: true,
      });

      const allWords = database.getAllWords();
      expect(allWords).toHaveLength(1);
      expect(allWords[0].word[0].value).toBe("new_word");
    });
  });
});
