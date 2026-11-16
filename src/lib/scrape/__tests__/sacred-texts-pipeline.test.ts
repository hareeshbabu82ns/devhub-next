/**
 * Pipeline flow without the network or a database: cached pages in a temp
 * data folder, a stubbed fetch, and an in-memory stand-in for db.entity.
 */
import fs from "fs";
import os from "os";
import path from "path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sacred-texts-"));

// jest.mock factories are hoisted above `tmp`, so read it lazily.
jest.mock("@/config", () => ({
  __esModule: true,
  default: {
    get dataFolder() {
      return tmp;
    },
  },
}));

type Row = { id: string; type: string; order: number; parents: string[]; attributes: { key: string; value: string }[]; text: unknown; children?: unknown[] };
const rows: Row[] = [];
type Where = {
  type?: string;
  order?: number;
  parents?: { has?: string };
  attributes?: { some?: { key: string; value: string } };
};
const matches = (r: Row, where: Where) =>
  (!where.type || r.type === where.type) &&
  (where.order === undefined || r.order === where.order) &&
  (!where.parents?.has || r.parents.includes(where.parents.has)) &&
  (!where.attributes?.some ||
    r.attributes.some(
      (a) => a.key === where.attributes!.some!.key && a.value === where.attributes!.some!.value,
    ));

jest.mock("@/lib/db", () => ({
  db: {
    entity: {
      findUnique: jest.fn(async ({ where }) => rows.find((r) => r.id === where.id) ?? null),
      findFirst: jest.fn(async ({ where }) => rows.find((r) => matches(r, where)) ?? null),
      create: jest.fn(async ({ data }) => {
        const row: Row = {
          id: `e${rows.length + 1}`,
          type: data.type,
          order: data.order ?? 0,
          parents: data.parentsRel ? [data.parentsRel.connect.id] : [],
          attributes: data.attributes ?? [],
          text: data.text,
          children: data.childrenRel?.create,
        };
        rows.push(row);
        return { id: row.id };
      }),
    },
  },
}));

import {
  SacredTextsBlockedError,
  cacheFileForUrl,
  createSacredTextsEntities,
  loadSacredTextsBook,
  loadSacredTextsCategory,
  scrapeSacredTextsChapters,
} from "../sacred-texts-pipeline";

const put = (url: string, html: string) => {
  const file = cacheFileForUrl(url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};

const toc = (rows: [string, number, string][], pager = "") =>
  `<html><body><h1 id="book-title">The Ramayana in Sanskrit</h1><span class="bo-badge">4 chapters</span>
  <div class="bo-toc-list">${rows
    .map(
      ([slug, n, t]) =>
        `<a class="bo-toc-row" href="/book/the-ramayana-in-sanskrit/${slug}"><span class="bo-toc-num">${n}</span> <span class="bo-toc-title">${t}</span></a>`,
    )
    .join("")}</div>${pager}</body></html>`;

const chapter = (n: number) =>
  `<html><body><article><div class="contents"><h1>Book 1</h1>Chapter ${n}<table><tr>
  <td> 1 rāmo nāma ${n}<br> dvitīyā paṅktiḥ<br> 2 tṛtīyā paṅktiḥ<br></td>
  <td> 1 रामो नाम<br> द्वितीया पङ्क्तिः<br> 2 तृतीया पङ्क्तिः<br></td></tr></table></div></article></body></html>`;

const BLOCKED = `<html><head><title>Attention Required! | Cloudflare</title></head><body><div id="cf-error-details">Sorry, you have been blocked</div></body></html>`;

beforeAll(() => {
  put(
    "https://sacred-texts.com/categories/hinduism",
    `<html><body><h1>Hinduism</h1><section id="the-ramayana" class="category-section"><h2>The Ramayana</h2>
    <ul><li class="book"><a class="book-title" href="/book/the-ramayana-in-sanskrit">The Ramayana in Sanskrit</a></li></ul></section></body></html>`,
  );
  put(
    "https://sacred-texts.com/book/the-ramayana-in-sanskrit",
    toc(
      [
        ["book-1", 1, "Book 1"],
        ["book-1-chapter-1", 2, "Book 1: Chapter 1"],
      ],
      `<a href="/book/the-ramayana-in-sanskrit?chaptersPage=2">2</a>`,
    ),
  );
  put(
    "https://sacred-texts.com/book/the-ramayana-in-sanskrit?chaptersPage=2",
    toc([
      ["book-1-chapter-2", 3, "Book 1: Chapter 2"],
      ["book-1-chapter-3", 4, "Book 1: Chapter 3"],
    ]),
  );
  put("https://sacred-texts.com/book/the-ramayana-in-sanskrit/book-1-chapter-1", chapter(1));
  put("https://sacred-texts.com/book/the-ramayana-in-sanskrit/book-1-chapter-2", chapter(2));

  // Anything not cached is "fetched" and refused the way Cloudflare does.
  global.fetch = jest.fn(async () => new Response(BLOCKED, { status: 403 })) as typeof fetch;
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("sacred-texts pipeline", () => {
  it("maps URLs to cache files without escaping the cache folder", () => {
    expect(cacheFileForUrl("https://sacred-texts.com/book/x?chaptersPage=3")).toBe(
      path.join(tmp, "sacred-texts", "html", "book", "x__page-3.html"),
    );
    expect(cacheFileForUrl("https://sacred-texts.com/book/%2e%2e/%2e%2e/etc")).toBe(
      path.join(tmp, "sacred-texts", "html", "etc.html"),
    );
    expect(() => cacheFileForUrl("https://example.com/book/x")).toThrow();
  });

  it("reads the catalog from the cache", async () => {
    const cat = await loadSacredTextsCategory("hinduism");
    expect(cat.sections[0].books[0].slug).toBe("the-ramayana-in-sanskrit");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("follows TOC pages and groups chapters", async () => {
    const book = await loadSacredTextsBook("the-ramayana-in-sanskrit");
    expect(book.chapters.map((c) => c.slug)).toEqual([
      "book-1",
      "book-1-chapter-1",
      "book-1-chapter-2",
      "book-1-chapter-3",
    ]);
    expect(book.structure.mode).toBe("grouped");
    expect(book.structure.groups[0].chapters).toHaveLength(3);
  });

  it("scrapes cached chapters and stops at a Cloudflare block with the cache path", async () => {
    const { results, blocked } = await scrapeSacredTextsChapters("the-ramayana-in-sanskrit", [
      "book-1-chapter-1",
      "book-1-chapter-2",
      "book-1-chapter-3",
    ]);
    expect(results.slice(0, 2).map((r) => [r.ok, r.kind, r.count])).toEqual([
      [true, "verses", 2],
      [true, "verses", 2],
    ]);
    expect(results[2].ok).toBe(false);
    expect(blocked).toContain("HTTP 403");
    expect(blocked).toContain(
      path.join("html", "book", "the-ramayana-in-sanskrit", "book-1-chapter-3.html"),
    );
  });

  it("rejects path-like slugs", async () => {
    await expect(loadSacredTextsBook("../etc")).rejects.toThrow(/Invalid book slug/);
  });

  it("raises SacredTextsBlockedError for blocked uncached pages", async () => {
    await expect(loadSacredTextsCategory("buddhism")).rejects.toBeInstanceOf(
      SacredTextsBlockedError,
    );
  });

  it("creates root → group → chapter → verses, and skips them on re-run", async () => {
    const opts = {
      bookSlug: "the-ramayana-in-sanskrit",
      parentId: "god1",
      rootType: "ITIHASAM",
      rootTitle: "raamaayaNam",
      groupType: "KAANDAM",
      groupTitles: ["bAla kaandam"],
      chapterType: "SARGA",
      verseType: "SLOKAM",
      chapterSlugs: ["book-1-chapter-1", "book-1-chapter-2", "book-1-chapter-3"],
    };
    const first = await createSacredTextsEntities(opts);
    expect(first).toMatchObject({ created: 2, skipped: 0, verses: 4, missing: ["book-1-chapter-3"] });

    const root = rows.find((r) => r.id === first.rootId)!;
    expect(root.parents).toEqual(["god1"]);
    const group = rows.find((r) => r.type === "KAANDAM")!;
    expect(group.parents).toEqual([root.id]);
    expect(group.text).toEqual(
      expect.arrayContaining([
        { language: "ITRANS", value: "bAla kaandam" },
        { language: "ENG", value: "Book 1" },
      ]),
    );
    const sargas = rows.filter((r) => r.type === "SARGA");
    expect(sargas.map((s) => [s.order, s.parents[0]])).toEqual([
      [0, group.id],
      [1, group.id],
    ]);
    const verse = (sargas[0].children as { text: { language: string; value: string }[] }[])[0];
    expect(verse.text.map((t) => t.language).sort()).toEqual(["IAST", "ITRANS", "SAN", "TEL"]);
    expect(verse.text.find((t) => t.language === "IAST")!.value).toBe(
      "rāmo nāma 1  \ndvitīyā paṅktiḥ",
    );

    const again = await createSacredTextsEntities({ ...opts, rootId: first.rootId });
    expect(again).toMatchObject({ rootId: first.rootId, created: 0, skipped: 2 });
    expect(rows.filter((r) => r.type === "ITIHASAM")).toHaveLength(1);
    expect(rows.filter((r) => r.type === "KAANDAM")).toHaveLength(1);
  });
});
