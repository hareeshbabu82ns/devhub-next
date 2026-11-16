/**
 * Keys, structure and entity building for sanskritsahitya works. The last
 * block runs over the real data repository and is skipped without it.
 */

import { existsSync } from "fs";
import {
  countFields,
  headerRecords,
  newRowKeyState,
  readHeader,
  rowRecords,
  hashValue,
  SEQ_ROW_FILE_STRIDE,
} from "../sahitya-format";
import {
  decodeCaseNumber,
  decodePersonNumber,
  isHandledField,
  morphologyMarkdown,
  padacchedaMarkdown,
  dandaMarkdown,
} from "../sahitya-fields";
import { ganas, matras, scanLine, scanVerse } from "../sahitya-chandas";
import {
  buildRecord,
  buildRoot,
  entityHash,
  planStructure,
  siteRef,
  workContext,
} from "../sahitya-processor";
import { discoverWorks, readWorkFile, sahityaDataDir } from "../sahitya-sources";

const attr = (e: { attributes: { key: string; value: string }[] }, key: string) =>
  e.attributes.find((a) => a.key === key)?.value;

const EPIC = {
  title: "रामायणम्",
  custom: {
    anv: { name: "अन्वयः", lang: "sa", order: 1 },
    md: { name: "M N Dutt", lang: "en", order: 2, showInline: true },
    es: { name: "Summary", lang: "en", order: 3, showInline: true },
    ens: { name: "Summary", lang: "en", order: 3, aiGenerated: true },
    mn: { name: "मल्लिनाथः", lang: "sa", markdown: true, order: 4 },
  },
  terms: { bookSg: "काण्डम्", bookPl: "काण्डानि" },
  books: [{ number: "1", name: "बालकाण्डम्", subtitle: "The birth of Rāma", ens: "Four brothers are born." }],
  chapters: [{ number: "1.1", name: "प्रथमः सर्गः", subtitle: "A summary" }, { number: "1.2" }],
  data: [
    { c: "1.1", t: "श्रीरस्तु" },
    {
      c: "1.1",
      n: "1",
      v: "तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् । नारदं परिपप्रच्छ वाल्मीकिर्मुनिपुंगवम् ॥",
      ch: { n: "अनुष्टुप्" },
      es: "Valmiki asked Narada.",
      md: "The ascetic Valmiki asked Narada.",
      anv: "तपस्वी वाल्मीकिः नारदं परिपप्रच्छ",
      mn: "तप इति ॥ व्याख्या",
      xx: [[[{ w: "भेजे", l: "भज्", pos: "1. Ā.", c: 0, n: 0, g: 0, fin: "भेजे", pn: 3, tm: 15 }]]],
      sp: "सूतः",
      newField: "kept",
    },
    { c: "1.1", t: "इति प्रथमः सर्गः" },
    { c: "1.2", n: "1", v: "द्वितीयः ।" },
    { c: "1.2", n: "1", v: "repeated number" },
  ],
};

describe("source records", () => {
  it("reads the header and keeps unknown keys", () => {
    const h = readHeader({ ...EPIC, extra: 1 }, "x.json");
    expect(h.title).toBe("रामायणम्");
    expect(h.extra).toBe(1);
    expect((h as Record<string, unknown>).data).toBeUndefined();
  });

  it("rejects files that are not works", () => {
    expect(() => readHeader({ name: "dhatu", data: [] }, "d.json")).toThrow(/title/);
    expect(() => readHeader({ title: "x" }, "d.json")).toThrow(/data/);
  });

  it("keys verses by chapter and number, prose by the verse it follows", () => {
    const recs = rowRecords(EPIC.data, "r1.json", 0, newRowKeyState());
    expect(recs.map((r) => r.key)).toEqual([
      "t:1.1:0:1",
      "v:1.1:1",
      "t:1.1:1:1",
      "v:1.2:1",
      "v:1.2:1#2",
    ]);
    expect(recs[0].seq).toBe(SEQ_ROW_FILE_STRIDE);
    expect(recs[1].ref).toBe("1.1");
  });

  it("carries counters across shards", () => {
    const state = newRowKeyState();
    rowRecords([{ c: "2", n: "5", v: "a" }], "w1.json", 0, state);
    const second = rowRecords([{ c: "2", t: "after five" }], "w2.json", 1, state);
    expect(second[0].key).toBe("t:2:5:1");
    expect(second[0].seq).toBe(2 * SEQ_ROW_FILE_STRIDE);
  });

  it("hashes independent of key order", () => {
    expect(hashValue({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(
      hashValue({ b: [1, { d: 3, c: 2 }], a: 1 }),
    );
  });

  it("counts fields", () => {
    expect(countFields(EPIC.data)).toMatchObject({ c: 5, t: 2, v: 3, newField: 1 });
  });
});

describe("structure", () => {
  const header = readHeader(EPIC, "r1.json");
  const recs = [
    ...headerRecords(header, "r1.json"),
    ...rowRecords(EPIC.data, "r1.json", 0, newRowKeyState()),
  ];
  const plan = planStructure(recs);

  it("puts chapters under their book and rows under their chapter", () => {
    expect(plan.get("b:1")).toEqual({ parentKey: "", pos: 1 });
    expect(plan.get("c:1.1")).toEqual({ parentKey: "b:1", pos: 1 });
    expect(plan.get("c:1.2")).toEqual({ parentKey: "b:1", pos: 2 });
    expect(plan.get("t:1.1:0:1")).toEqual({ parentKey: "c:1.1", pos: 0 });
    expect(plan.get("v:1.1:1")).toEqual({ parentKey: "c:1.1", pos: 1 });
    expect(plan.get("v:1.2:1#2")).toEqual({ parentKey: "c:1.2", pos: 1 });
  });

  it("nests dotted chapters without books, and falls back to the root", () => {
    const p = planStructure([
      { key: "c:3", kind: "chapter", ref: "3", seq: 1 },
      { key: "c:3.1", kind: "chapter", ref: "3.1", seq: 2 },
      { key: "v:3.1.2:1", kind: "row", ref: "3.1.2", seq: 3 },
      { key: "v::1", kind: "row", ref: null, seq: 4 },
    ]);
    expect(p.get("c:3.1")!.parentKey).toBe("c:3");
    expect(p.get("v:3.1.2:1")!.parentKey).toBe("c:3.1");
    expect(p.get("v::1")!.parentKey).toBe("");
  });
});

describe("building entities", () => {
  const header = readHeader(EPIC, "r1.json");
  const ctx = workContext("ramayanam", header);

  it("picks types from the work and its terms", () => {
    expect(ctx.rootType).toBe("ITIHASAM");
    expect(ctx.bookType).toBe("KAANDAM");
    expect(ctx.chapterType).toBe("SARGA");
    expect(workContext("raghuvansham", { title: "x" }).chapterType).toBe("SARGA");
    expect(workContext("x", { title: "x", terms: { chapterSg: "अध्यायः" } }).chapterType).toBe(
      "ADHYAAYAM",
    );
  });

  it("builds the root with its terms and source link", () => {
    const root = buildRoot(ctx);
    expect(root.text[0]).toEqual({ language: "SAN", value: "रामायणम्" });
    expect(root.text.map((t) => t.language)).toEqual(["SAN", "IAST", "SLP1", "ITRANS", "TEL"]);
    expect(attr(root, "bookSingular")).toBe("काण्डम्");
    expect(attr(root, "sourceUrl")).toBe("https://sanskritsahitya.org/ramayanam");
  });

  it("builds a book with subtitle and AI summary as meaning", () => {
    const book = buildRecord(ctx, { key: "b:1", kind: "book", row: EPIC.books[0], pos: 1 });
    expect(book.type).toBe("KAANDAM");
    expect(book.meaning).toHaveLength(1);
    expect(book.meaning[0].value).toBe("**The birth of Rāma**\n\nFour brothers are born.");
    expect(attr(book, "aiGenerated")).toBe("ens");
  });

  it("names a chapter without a name from the work's terms", () => {
    const c = buildRecord(
      workContext("mahabharatam", { title: "x", terms: { chapterSg: "अध्यायः" } }),
      { key: "c:1.2", kind: "chapter", row: { number: "1.2" }, pos: 2 },
    );
    expect(c.text[0].value).toBe("अध्यायः 1.2");
  });

  it("builds a verse with every field in its place", () => {
    const v = buildRecord(ctx, { key: "v:1.1:1", kind: "row", row: EPIC.data[1], pos: 1 });
    expect(v.type).toBe("SLOKAM");
    expect(v.order).toBe(1);
    expect(v.text[0].value).toBe(
      "**सूतः** —  \nतपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् ।  \nनारदं परिपप्रच्छ वाल्मीकिर्मुनिपुंगवम् ॥",
    );
    // English fields → meaning, in their order, headed when there are several
    expect(v.meaning).toEqual([
      {
        language: "ENG",
        value:
          "**M N Dutt**  \nThe ascetic Valmiki asked Narada.\n\n---\n\n**Summary**  \nValmiki asked Narada.",
      },
    ]);
    const kinds = v.annotations.map((a) => `${a.kind}:${a.title}`);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "ANVAYA:अन्वयः",
        "COMMENTARY:मल्लिनाथः",
        "WORD_ANALYSIS:Morphology",
        "CHANDAS:छन्दः — अनुष्टुप्",
      ]),
    );
    expect(v.annotations.every((a) => a.source.startsWith("sanskritsahitya:"))).toBe(true);
    expect(attr(v, "chandas")).toBe("अनुष्टुप्");
    expect(attr(v, "speaker")).toBe("सूतः");
    expect(attr(v, "ssRef")).toBe("1.1.1");
    expect(attr(v, "sourceUrl")).toBe("https://sanskritsahitya.org/ramayanam/1.1.1");
    // unknown plain field is kept as an attribute
    expect(attr(v, "src.newField")).toBe("kept");
  });

  it("marks prose rows", () => {
    const t = buildRecord(ctx, { key: "t:1.1:0:1", kind: "row", row: EPIC.data[0], pos: 0 });
    expect(attr(t, "textKind")).toBe("prose");
    expect(attr(t, "ssRef")).toBeUndefined();
  });

  it("treats undeclared Sanskrit and English fields by their script", () => {
    const v = buildRecord(workContext("x", { title: "x" }), {
      key: "v::1",
      kind: "row",
      row: { n: "1", v: "क", vd: "व्याख्या", es: "Summary text" },
    });
    expect(v.meaning[0].value).toBe("Summary text");
    expect(v.annotations[0]).toMatchObject({ kind: "COMMENTARY", title: "वल्लभदेवः" });
  });

  it("hashes what a build writes, so edits can be told apart", () => {
    const v = buildRecord(ctx, { key: "v:1.1:1", kind: "row", row: EPIC.data[1], pos: 1 });
    const same = { ...v, annotations: [] };
    expect(entityHash(same)).toBe(entityHash(v));
    expect(entityHash({ ...v, meaning: [{ language: "ENG", value: "edited" }] })).not.toBe(
      entityHash(v),
    );
  });

  it("reports which fields have a rule", () => {
    expect(isHandledField("pc", undefined)).toBe(true);
    expect(isHandledField("ens", undefined)).toBe(true);
    expect(isHandledField("newField", undefined)).toBe(false);
    expect(isHandledField("zz", { zz: { name: "New", lang: "en" } })).toBe(true);
  });

  it("addresses verses the way the site does", () => {
    expect(siteRef({ n: "4" })).toBe("4");
    expect(siteRef({ c: "1", n: "4" })).toBe("1.4");
    expect(siteRef({ c: "1.1", n: "4" })).toBe("1.1.4");
  });
});

describe("field rendering", () => {
  it("ends a line after every danda and verse number", () => {
    expect(dandaMarkdown("अ । आ ॥ इ । ई ॥")).toBe("अ ।  \nआ ॥  \nइ ।  \nई ॥");
    expect(dandaMarkdown("पातु वपुः पुरारेः॥ १ ॥ अथ कथा। पिकस्य ॥ ।")).toBe(
      "पातु वपुः पुरारेः ॥ १ ॥  \nअथ कथा ।  \nपिकस्य ॥ ।",
    );
    expect(dandaMarkdown("क ॥१२॥")).toBe("क ॥ १२ ॥");
  });

  it("decodes case/number and person/number codes", () => {
    expect(decodeCaseNumber("6.1")).toBe("षष्ठी एकवचनम्");
    expect(decodeCaseNumber("0.0")).toBe("");
    expect(decodePersonNumber(3)).toBe("प्रथमपुरुषः एकवचनम्");
    expect(decodePersonNumber(9)).toBe("प्रथमपुरुषः बहुवचनम्");
    expect(decodePersonNumber(1)).toBe("उत्तमपुरुषः एकवचनम्");
    expect(decodePersonNumber(8)).toBe("मध्यमपुरुषः बहुवचनम्");
  });

  it("renders padaccheda with compounds and glosses", () => {
    const md = padacchedaMarkdown([
      { w: "श्रियः", p: [{ l: "श्री", cn: "6.1" }], e: "of fortune" },
      {
        w: "जीवितहारिणी",
        p: [
          { l: "जीवित", inf: "जीवित", r: "जीव्", s: ["क्त"] },
          { l: "हारिणी", inf: "हारिन्", r: "हृ", s: ["णिनि"], cn: "1.1" },
        ],
        e: "stealer of life",
      },
      { w: "अयुङ्क्त", p: [{ l: "युज्", fin: "अयुङ्क्त", pn: 3, t: "लङ्", pp: "A1" }] },
    ]);
    expect(md).toContain("| श्रियः | श्री, षष्ठी एकवचनम् | of fortune |");
    expect(md).toContain("जीवित, √जीव्, +क्त + हारिणी → हारिन्, √हृ, +णिनि, प्रथमा एकवचनम्");
    expect(md).toContain("युज्, लङ्, प्रथमपुरुषः एकवचनम्, आत्मनेपदम्");
  });

  it("renders morphology with decoded tense", () => {
    const md = morphologyMarkdown([
      [[{ w: "भेजे", l: "भज्", pos: "1. Ā.", c: 0, n: 0, g: 0, fin: "भेजे", pn: 3, tm: 15 }]],
      [[{ w: "आसनं", l: "आसन", pos: "n", c: 2, n: 1, g: 3 }]],
    ]);
    expect(md).toContain("| भेजे | भज् | 1. Ā. लिट् प्रथमपुरुषः एकवचनम् |");
    expect(md).toContain("| आसनं | आसन | n acc. sg. |");
  });
});

describe("metre scansion", () => {
  // pancatantram 3.1, as the earlier importer showed it from the source's ch.s
  const verse =
    "न विश्वसेत्पूर्व-विरोधितस्य शत्रोश्च मित्रत्वमुपागतस्य । दग्धां गुहां पश्य उलूक-पूर्णां काक-प्रणीतेन हुताशनेन ॥";

  it("splits into pādas and marks guru / laghu like the source did", () => {
    const lines = scanVerse(verse, "उपजातिः");
    expect(lines.map((l) => l.map(([t]) => t).join("·"))).toEqual([
      "न·वि·श्व·से·त्पू·र्व·वि·रो·धि·त·स्य",
      "श·त्रो·श्च·मि·त्र·त्व·मु·पा·ग·त·स्य",
      "द·ग्धां·गु·हां·प·श्य·उ·लू·क·पू·र्णां",
      "का·क·प्र·णी·ते·न·हु·ता·श·ने·न",
    ]);
    expect(lines.map((l) => l.map(([, w]) => w).join(""))).toEqual([
      "lglggllglgl",
      "gglggllglgl",
      "gglggllglgg",
      "gglggllglgl",
    ]);
    expect(lines.map(ganas)).toEqual(["जतजगल", "ततजगल", "ततजगग", "ततजगल"]);
    expect(matras(lines[0])).toBe(16);
  });

  it("knows the weight rules", () => {
    const w = (s: string) => scanLine(s).map(([, x]) => x).join("");
    expect(w("कं")).toBe("g"); // anusvāra
    expect(w("कः")).toBe("g"); // visarga
    expect(w("कँ")).toBe("l"); // candrabindu is not heavy
    expect(w("तम्")).toBe("g"); // closed at the line end
    expect(w("ब्रह्म")).toBe("gl"); // before a conjunct
    expect(w("तत् स")).toBe("gl"); // closed across a word break
    expect(w("अपि")).toBe("ll");
  });

  it("keeps anuṣṭubh as four pādas of eight and leaves uneven halves whole", () => {
    const a = scanVerse(
      "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः । मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ॥",
    );
    expect(a.map((l) => l.length)).toEqual([8, 8, 8, 8]);
    // viyoginī: 10 + 11 per half
    const vi = scanVerse(`${"क".repeat(21)} । ${"क".repeat(21)} ॥`, "वियोगिनी");
    expect(vi.map((l) => l.length)).toEqual([10, 11, 10, 11]);
    const arya = scanVerse("क ख ग घ । च छ ॥", "आर्या");
    expect(arya.map((l) => l.length)).toEqual([4, 2]);
  });

  it("uses the source's syllables when a record still has them", () => {
    const ctx = workContext("x", { title: "x" });
    const v = buildRecord(ctx, {
      key: "v::1",
      kind: "row",
      row: { n: "1", v: "क ख", ch: { n: "x", s: [[["क", "g"], ["ख", "l"]]] } },
    });
    expect(v.annotations.find((a) => a.kind === "CHANDAS")!.text).toContain("| **क** | ख |");
  });
});

const DATA = sahityaDataDir();
const hasData = existsSync(DATA);
(hasData ? describe : describe.skip)("the data repository", () => {
  it(
    "builds every work's first file without throwing",
    async () => {
      const works = (await discoverWorks()).filter((w) => w.kind === "work");
      expect(works.length).toBeGreaterThan(10);
      for (const w of works) {
        const f = await readWorkFile(w.files[0]);
        const recs = [
          ...headerRecords(f.header, f.file),
          ...rowRecords(f.rows.slice(0, 300), f.file, 0, newRowKeyState()),
        ];
        const plan = planStructure(recs);
        const ctx = workContext(w.work, f.header);
        for (const r of recs) {
          const e = buildRecord(ctx, { ...r, pos: plan.get(r.key)!.pos });
          expect(e.text[0].language).toBe("SAN");
        }
        // keys are unique within a file
        expect(new Set(recs.map((r) => r.key)).size).toBe(recs.length);
      }
    },
    120_000,
  );

  it("treats metres, dhatus and lexicons as reference data", async () => {
    const works = await discoverWorks();
    for (const name of ["chhanda", "dhatu", "kosha", "ashtadhyayi"]) {
      const w = works.find((x) => x.work === name);
      if (w) expect(w.kind).toBe("reference");
    }
    const mbh = works.find((x) => x.work === "mahabharatam");
    if (mbh) expect(mbh.files[0]).toBe("mahabharatam/mahabharatam1.json");
  });
});
