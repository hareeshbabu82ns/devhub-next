/**
 * Reading originals from the SQLite sources and building search entries from
 * them. Tests that need a source file are skipped when it is not present.
 */

import { existsSync } from "fs";
import { resolve } from "path";
import sanscript from "@indic-transliteration/sanscript";
import { openSource, readRawBatch, sourceLayout } from "../dictionary-sources";
import {
  DICTIONARY_PROCESSOR_VERSION,
  buildEntryFromRaw,
  gwynnToItrans,
  simpleHtmlToMarkdown,
} from "../dictionary-processor";
import { buildSearchText } from "../word-utils";
import { DictionaryName } from "../dictionary-constants";

const DICT_DIR = resolve(process.cwd(), "data/dict");
const has = (file: string) => existsSync(resolve(DICT_DIR, file));


describe("gwynnToItrans", () => {
  const te = (s: string) => sanscript.t(gwynnToItrans(s), "itrans_dravidian", "telugu");

  it("reads long vowels, w and c the way Gwynn writes them", () => {
    expect(te("akkaDakkaDa")).toBe("అక్కడక్కడ");
    expect(te("akkaDikakkaDee")).toBe("అక్కడికక్కడే");
    expect(te("wiiDu")).toBe("వీడు");
    expect(te("ceppu")).toBe("చెప్పు");
  });

  it("writes anusvara before a stop and at the end", () => {
    expect(te("pangaTincu")).toBe("పంగటించు");
    expect(te("ankanam")).toBe("అంకనం");
    expect(te("anna")).toBe("అన్న");
  });

  it("handles ś, S and ṛ", () => {
    expect(te("śiSyuDu")).toBe("శిష్యుడు");
    expect(te("kṛpa")).toBe("కృప");
  });
});

describe("simpleHtmlToMarkdown", () => {
  it("keeps Telugu quotations and spaces them off", () => {
    expect(simpleHtmlToMarkdown("interj. Well done!<tel>శాబాసు</tel>.")).toBe(
      "interj. Well done! శాబాసు.",
    );
  });
  it("turns b / i / p into Markdown", () => {
    expect(simpleHtmlToMarkdown("<b>salilam</b> <i>n</i>. water.<p></p>")).toBe(
      "**salilam** _n_. water.",
    );
  });
});

describe("buildSearchText", () => {
  it("keeps every distinct word of a long meaning", () => {
    const long = Array.from({ length: 3000 }, (_, i) => `word${i}x`).join(" ");
    const text = buildSearchText(
      [{ language: "IAST", value: "dharma" }],
      [{ language: "ENG", value: `${long} finalword` }],
    );
    expect(text.split(" ")).toContain("finalword");
    expect(text.split(" ")).toContain("dharma");
  });

  it("drops markup, numbers and repeats", () => {
    const text = buildSearchText(
      [{ language: "SAN", value: "धर्म" }],
      [
        { language: "IAST", value: "**dharma** `m.` law, 3, law" },
        { language: "ITRANS", value: "__dharma__ law" },
      ],
    );
    expect(text).toBe("धर्म dharma law");
  });
});

describe("buildEntryFromRaw", () => {
  it("builds a Cologne entry with a pointer to its original", () => {
    const e = buildEntryFromRaw(
      "mw",
      {
        key: "827",
        seq: 900,
        row: {
          key: "agastya",
          lnum: 827,
          data: "<H2><h><key1>agastya</key1><key2>aga/stya</key2></h><body><s>aga/stya</s> <lex>m.</lex> (3, 4) = <s>aga/sti</s></body><tail><L>827</L><pc>4,3</pc></tail></H2>",
        },
      },
      { table: "mw", columns: ["key", "lnum", "data"] },
    );
    expect(e.origin).toBe("MW");
    expect(e.wordIndex).toBe(900);
    expect(e.wordLnum).toBe(827);
    expect(e.sourceKey).toBe("827");
    expect(e.sourceData).toEqual({ key: "827", table: "mw", lnum: 827 });
    expect(e.processorVersion).toBe(DICTIONARY_PROCESSOR_VERSION);
    expect(e.word.find((w) => w.language === "SAN")?.value).toBe("अगस्त्य");
    expect(e.searchText).toContain("agastya");
  });

  it("builds a Brown entry with Telugu in every script", () => {
    const e = buildEntryFromRaw(
      "brown_te",
      { key: "5", seq: 5, row: { key: "కాలుమడి", lnum: 1, data: "See<tel>కాల్మడి</tel>." } },
      { table: "brown_te", columns: ["key", "lnum", "data"] },
    );
    expect(e.origin).toBe("BROWN_TE");
    expect(e.word.find((w) => w.language === "TEL")?.value).toBe("కాలుమడి");
    expect(e.description.find((d) => d.language === "TEL")?.value).toBe("See కాల్మడి.");
    expect(e.description.find((d) => d.language === "IAST")?.value).toMatch(/^See kālmaḍi\.$/);
  });

  it("builds a Gwynn entry keeping Gwynn's spelling", () => {
    const e = buildEntryFromRaw(
      "gwynn_te",
      {
        key: "9",
        seq: 9,
        row: { key: "salilam", lnum: 2.1, data: "<b>salilam</b> <i>n. class</i>. water.<p></p>" },
      },
      { table: "gwynn_te", columns: ["key", "lnum", "data"] },
    );
    expect(e.word.find((w) => w.language === "TEL")?.value).toBe("సలిలం");
    expect(e.word.find((w) => w.language === "ENG")?.value).toBe("salilam");
    expect(e.description[0]).toEqual({ language: "ENG", value: "**salilam** _n. class_. water." });
  });
});

const ALL_SOURCES: DictionaryName[] = ["mw", "brown_te", "eng2en", "dhatu_pata"];

describe.each(ALL_SOURCES)("reading %s originals", (dict) => {
  const file = dict === "eng2en" ? "eng2en.sqlite" : `${dict}.sqlite`;
  const run = has(file) ? it : it.skip;

  run("numbers rows in order with unique, stable keys", () => {
    const a = readRawBatch(dict, 100, 300);
    const b = readRawBatch(dict, 100, 300);
    expect(a.rows).toHaveLength(300);
    expect(a.rows.map((r) => r.seq)).toEqual(Array.from({ length: 300 }, (_, i) => 101 + i));
    expect(new Set(a.rows.map((r) => r.key)).size).toBe(300);
    expect(b.rows.map((r) => [r.key, r.hash])).toEqual(a.rows.map((r) => [r.key, r.hash]));
    // The row is the table's own columns, untouched
    expect(Object.keys(a.rows[0].row)).toEqual(a.layout.columns);
  });

  run("builds every row of a batch", () => {
    const { rows, layout } = readRawBatch(dict, 0, 200);
    for (const r of rows) {
      const e = buildEntryFromRaw(dict, r, layout);
      expect(e.word.length).toBeGreaterThan(0);
      expect(e.sourceKey).toBe(r.key);
      expect(e.wordIndex).toBe(r.seq);
    }
  });
});

describe("source layouts", () => {
  const run = has("brown_te.sqlite") && has("mw.sqlite") ? it : it.skip;
  run("uses lnum where it is unique and rowid where it repeats", () => {
    for (const [dict, key] of [
      ["mw", "lnum"],
      ["brown_te", "rowid"],
    ] as const) {
      const { sqlite, spec } = openSource(dict);
      try {
        expect(sourceLayout(sqlite, spec).keyColumn).toBe(key);
      } finally {
        sqlite.close();
      }
    }
  });
});
