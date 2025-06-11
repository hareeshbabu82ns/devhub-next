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
  convertText,
} from "../dictionary-processor";
import {
  InMemoryDictionaryWordDatabase,
  saveDictionaryWordsBulk,
} from "../dictionary-database";
import {
  DictionaryName,
  TRANSLITERATION_SCHEMES,
} from "../dictionary-constants";
import { convertLexiconHtmlToMarkdown, TagHandler } from "../lexicon-utils";

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

    test("should process Eng-Eng dictionary word correctly", () => {
      const dictName: DictionaryName = "eng2en";
      const wordIndex = 1;

      const rowData: SqliteRowData = {
        word: "Em",
        wordtype: "term",
        definition:
          "An obsolete or colloquial contraction of the old form hem, them.",
      };
      const tableMetadata: TableMetadata = {
        tableName: "eng2en",
        columns: ["word", "wordtype", "definition"],
        columnPositions: { word: 0, wordtype: 1, definition: 2 },
        wordFieldName: "word",
        descFieldName: "wordtype,definition",
        orderFieldName: "",
      };

      const result = processDictionaryWordRow(
        rowData,
        dictName,
        wordIndex,
        tableMetadata,
      );

      expect(result).toMatchObject({
        wordIndex: 1,
        origin: "ENG2ENG",
      });

      expect(result.sourceData.wordLang).toBe("ENG");
      expect(result.sourceData.descriptionLang).toBe("ENG");

      expect(result.word).toHaveLength(1);
      expect(result.description).toHaveLength(1);

      const wordDB = result.word.find((d) => d.language === "ENG");
      expect(wordDB).toBeDefined();
      expect(wordDB?.value).toBe("Em");

      const descDB = result.description.find((d) => d.language === "ENG");
      expect(descDB).toBeDefined();
      expect(descDB?.value).toBe(
        "term An obsolete or colloquial contraction of the old form hem, them.",
      );

      expect(result.phonetic).toBe(
        "obsolete colloquial contraction old form hem",
      );
    });

    test("should process Eng-Tel dictionary word correctly", () => {
      const dictName: DictionaryName = "eng2te";
      const wordIndex = 1;

      const rowData: SqliteRowData = {
        eng_word: "A\tArticle",
        pos: "n",
        pos_type: null,
        meaning:
          "1. ఒక, one; He gave me a rupee: అతఁడు నాకొక రూపాయి ఇచ్చినాఁడు. 2. కొన్నిౘోట్ల 'ఒక' అనే అర్థము ఉండదు. That is a dog: అది కుక్క; He is a good man: వాడు మంచివాఁడు.",
      };
      const tableMetadata: TableMetadata = {
        tableName: "eng2te",
        columns: ["eng_word", "pos", "pos_type", "meaning"],
        columnPositions: { eng_word: 0, pos: 1, pos_type: 2, meaning: 3 },
        wordFieldName: "eng_word",
        descFieldName: "meaning",
        orderFieldName: "",
      };

      const result = processDictionaryWordRow(
        rowData,
        dictName,
        wordIndex,
        tableMetadata,
      );

      expect(result).toMatchObject({
        wordIndex: 1,
        origin: "ENG2TEL",
      });
      expect(result.sourceData.wordLang).toBe("ENG");
      expect(result.sourceData.descriptionLang).toBe("TEL");
      expect(result.word).toHaveLength(1);
      expect(result.description.length).toBeGreaterThan(1);

      const telDes = result.description.find((d) => d.language === "TEL");
      expect(telDes).toBeDefined();
      expect(telDes?.value).toContain(
        "1. ఒక, one; He gave me a rupee: అతఁడు నాకొక రూపాయి ఇచ్చినాఁడు.",
      );
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

  describe("Custom Handlers DictionaryWords", () => {
    it("should convert HTML to Markdown", () => {
      const customHandlers = {
        h1: {
          open: "",
          close: "",
        },
        h: {
          open: " **",
          close: "** ",
        },
        body: "\n  ",
      };

      const html = "<H1><h>header</h><body>some data</H1>";
      const expected = "**header** some data";

      const result = convertLexiconHtmlToMarkdown(
        "ae",
        html,
        "",
        TRANSLITERATION_SCHEMES.DEVANAGARI,
        customHandlers,
      );

      expect(result).toBe(expected);
    });
    it("should convert HTML to Markdown AE-SAN", () => {
      const keyHandler: TagHandler = ($, element, parser) => {
        // const tag = element.prop("tagName")?.toLowerCase();
        const currentKeyText = element.text();
        const configKeyText = parser.getConfig().keyWord;
        if (currentKeyText === configKeyText) {
          parser.addToMarkdown("");
        } else {
          parser.addToMarkdown("**");
          parser.processElement($, element);
          parser.addToMarkdown("**  \n");
        }
      };
      const divHandler: TagHandler = ($, element, parser) => {
        const attrN = element.attr("n") as string;
        if (attrN && ["lb", "NI"].includes(attrN)) {
          parser.addToMarkdown("  \n");
        } else {
        }
        parser.processElement($, element);
      };
      const ignoreHandler: TagHandler = ($, element, parser) => {
        parser.addToMarkdown("");
      };

      const customHandlers = {
        h1: {
          open: "",
          close: "",
        },
        h: {
          open: "",
          close: "",
        },
        key1: keyHandler,
        key2: keyHandler,
        body: "  \n",
        lb: "  \n",
        div: divHandler,
        b: {
          open: "",
          close: "",
        },
        ab: {
          open: " `",
          close: "` ",
        },
        // s: transliterateHandler,
        tail: ignoreHandler,
      };

      const html =
        '<H1><h><key1>a</key1><key2>a</key2></h><body><b>A, An</b>  (As an article) not ex.; ‘a man’ <div n="lb"/><s>naraH</s>. <b>2</b> (One) <s>eka</s>. <b>3</b> (Indefinite) <s>kiM</s> <div n="lb"/>with <s>cit, cana</s> or <s>api</s>. <b>4</b> With part., <div n="lb"/>ex. by dat. or inf.; ‘set out a hunting’ <div n="lb"/><s>mfgayAyE</s> or <s>mfgayAM kartuM pratasTe;</s> ‘fell a-weep- <div n="lb"/>-ing’ <s>kraMdituM pravfttaH</s>. <b>5</b> (Every) <s>prati</s> in <div n="lb"/>comp., or by repetition of word; <div n="lb"/>‘100 Rs. a day’ <s>pratidinaM</s> or <s>dine dine</s> <div n="lb"/><s>SatarUpakaM</s>. <b>6</b> (Species) <s>viSezaH, BedaH,</s> <div n="lb"/>in comp.; ‘dog is an animal’ <s>SvA</s> <div n="lb"/><s>prARiviSezaH</s>.</body><tail><L>1</L><pc>001</pc></tail></H1>';
      const expected =
        "A, An  (As an article) not ex.; ‘a man’   \n__नरः__. 2 (One) __एक__. 3 (Indefinite) __किं__   \nwith __चित्, चन__ or __अपि__. 4 With part.,   \nex. by dat. or inf.; ‘set out a hunting’   \n__मृगयायै__ or __मृगयां कर्तुं प्रतस्थे;__ ‘fell a-weep-   \n-ing’ __क्रंदितुं प्रवृत्तः__. 5 (Every) __प्रति__ in   \ncomp., or by repetition of word;   \n‘100 Rs. a day’ __प्रतिदिनं__ or __दिने दिने__   \n__शतरूपकं__. 6 (Species) __विशेषः, भेदः,__   \nin comp.; ‘dog is an animal’ __श्वा__   \n__प्राणिविशेषः__.";

      const result = convertLexiconHtmlToMarkdown(
        "ae",
        html,
        "a",
        TRANSLITERATION_SCHEMES.DEVANAGARI,
        customHandlers,
      );

      expect(result).toBe(expected);
    });
  });
});
