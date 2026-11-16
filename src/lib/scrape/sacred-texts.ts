/**
 * Parsers for sacred-texts.com (the 2026 redesign).
 *
 * The old static site (`/hin/index.htm`, `/hin/rys/rys1001.htm`, …) now
 * redirects to a SvelteKit app, and the original pages live on at
 * archive.sacred-texts.com. The new site is organised as:
 *
 *   /categories/<category>              sections of books (`section.category-section`)
 *   /book/<book>?chaptersPage=N         book overview, table of contents in pages of 25
 *   /book/<book>/<chapter>              one chapter, content inside `article .contents`
 *
 * Everything here is pure (HTML string in, data out) so it can be unit tested
 * without the network; fetching and caching live in sacred-texts-pipeline.ts.
 */

import * as cheerio from "cheerio";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioSelection = cheerio.Cheerio<any>;

export const SACRED_TEXTS_ORIGIN = "https://sacred-texts.com";
/** The old Hinduism index; it now redirects to /categories/hinduism. */
export const SACRED_TEXTS_LEGACY_HINDUISM_URL = `${SACRED_TEXTS_ORIGIN}/hin`;
export const SACRED_TEXTS_DEFAULT_CATEGORY = "hinduism";

export const sacredTextsCategoryUrl = (category: string) =>
  `${SACRED_TEXTS_ORIGIN}/categories/${encodeURIComponent(category)}`;

export const sacredTextsBookUrl = (bookSlug: string, chaptersPage = 1) =>
  chaptersPage > 1
    ? `${SACRED_TEXTS_ORIGIN}/book/${bookSlug}?chaptersPage=${chaptersPage}`
    : `${SACRED_TEXTS_ORIGIN}/book/${bookSlug}`;

export const sacredTextsChapterUrl = (bookSlug: string, chapterSlug: string) =>
  `${SACRED_TEXTS_ORIGIN}/book/${bookSlug}/${chapterSlug}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SacredTextsBookSummary {
  slug: string;
  title: string;
  url: string;
  author?: string;
  note?: string;
  year?: string;
}

export interface SacredTextsSection {
  id: string;
  title: string;
  books: SacredTextsBookSummary[];
}

export interface SacredTextsCategory {
  slug: string;
  title: string;
  url: string;
  sections: SacredTextsSection[];
}

export interface SacredTextsTocEntry {
  /** 1-based position in the book's table of contents */
  num: number;
  title: string;
  slug: string;
  url: string;
}

export interface SacredTextsBookOverview {
  slug: string;
  title: string;
  url: string;
  description?: string;
  /** "613 chapters" badge, when shown */
  chapterCount?: number;
  /** Highest `chaptersPage` linked from the pager (1 when unpaged) */
  lastPage: number;
  chapters: SacredTextsTocEntry[];
}

export interface SacredTextsVerse {
  /** Verse number as printed (null for text before the first number) */
  number: number | null;
  /** Text per language code (SAN for Devanagari, IAST for romanisation) */
  text: Record<string, string>;
}

export interface SacredTextsChapterContent {
  heading?: string;
  subheading?: string;
  kind: "verses" | "prose";
  /** Language of each verse column, in page order */
  languages: string[];
  verses: SacredTextsVerse[];
  /** Prose paragraphs (English translations etc.) */
  paragraphs: string[];
}

export interface SacredTextsChapterRef extends SacredTextsTocEntry {
  /** Chapter number inside its group (or the TOC number for flat books) */
  number: number;
}

export interface SacredTextsGroup {
  /** Group number as printed ("Book 3" → 3); 0 for flat books */
  number: number;
  title: string;
  /** Index page of the group ("Book 1"), when the TOC has one */
  slug?: string;
  chapters: SacredTextsChapterRef[];
}

export interface SacredTextsBookStructure {
  mode: "grouped" | "flat";
  groups: SacredTextsGroup[];
  /** TOC entries not placed in any group (grouped mode only) */
  extras: SacredTextsTocEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const squash = (s: string | undefined | null) =>
  (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

/** Cloudflare block / challenge pages instead of real content. */
export function isSacredTextsBlockedPage(html: string): boolean {
  return (
    /<title>\s*(Attention Required!|Just a moment\.\.\.)\s*\|?\s*Cloudflare/i.test(
      html,
    ) ||
    /id="cf-error-details"/.test(html) ||
    /challenges\.cloudflare\.com\/cdn-cgi\/challenge-platform/.test(html)
  );
}

/** `/book/<slug>/...` → `<slug>`; absolute URLs on sacred-texts.com allowed. */
function bookSlugFromHref(href: string): string | undefined {
  const m = href.match(/^(?:https?:\/\/(?:www\.)?sacred-texts\.com)?\/book\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** `/book/<book>/<chapter>` → `<chapter>` (only for the given book). */
function chapterSlugFromHref(href: string, bookSlug: string): string | undefined {
  const path = href
    .replace(/^https?:\/\/(?:www\.)?sacred-texts\.com/, "")
    .split(/[?#]/)[0];
  const prefix = `/book/${bookSlug}/`;
  if (!path.startsWith(prefix)) return undefined;
  const rest = path.slice(prefix.length).replace(/\/+$/, "");
  return rest ? decodeURIComponent(rest) : undefined;
}

// ---------------------------------------------------------------------------
// Category page: /categories/<slug>
// ---------------------------------------------------------------------------

export function parseCategoryPage(
  html: string,
  categorySlug: string,
): SacredTextsCategory {
  const $ = cheerio.load(html);
  const title =
    squash($("h1").first().text()) ||
    squash($("title").text()).split("|")[0].trim() ||
    categorySlug;

  const sections: SacredTextsSection[] = [];
  const seenSections = new Set<string>();

  // The page renders the same sections more than once (layout variants), so
  // keep the first occurrence of each section id.
  $("section.category-section").each((_, sec) => {
    const $sec = $(sec);
    const id = $sec.attr("id") || squash($sec.find("h2").first().text());
    if (!id || seenSections.has(id)) return;

    const books: SacredTextsBookSummary[] = [];
    const seenBooks = new Set<string>();
    $sec.find("li.book").each((_, li) => {
      const $li = $(li);
      const $a = $li.find("a.book-title").first().length
        ? $li.find("a.book-title").first()
        : $li.find('a[href*="/book/"]').first();
      const href = $a.attr("href") || "";
      const slug = bookSlugFromHref(href);
      if (!slug || seenBooks.has(slug)) return;
      seenBooks.add(slug);
      books.push({
        slug,
        title: squash($a.text()) || slug,
        url: `${SACRED_TEXTS_ORIGIN}/book/${slug}`,
        author: squash($li.find(".book-author").first().text()) || undefined,
        note: squash($li.find(".book-note").first().text()) || undefined,
        year: squash($li.find(".book-year").first().text()) || undefined,
      });
    });

    if (!books.length) return; // parent headings ("The Vedas") and link lists
    seenSections.add(id);
    sections.push({
      id,
      title: squash($sec.find("h2").first().text()) || id,
      books,
    });
  });

  // Fallback if the section markup changes again: every book link on the page.
  if (!sections.length) {
    const books: SacredTextsBookSummary[] = [];
    const seen = new Set<string>();
    $('a[href*="/book/"]').each((_, a) => {
      const slug = bookSlugFromHref($(a).attr("href") || "");
      const t = squash($(a).text());
      if (!slug || !t || seen.has(slug)) return;
      seen.add(slug);
      books.push({ slug, title: t, url: `${SACRED_TEXTS_ORIGIN}/book/${slug}` });
    });
    if (books.length) sections.push({ id: "books", title: "Books", books });
  }

  return {
    slug: categorySlug,
    title,
    url: sacredTextsCategoryUrl(categorySlug),
    sections,
  };
}

// ---------------------------------------------------------------------------
// Book overview: /book/<slug>?chaptersPage=N
// ---------------------------------------------------------------------------

export function parseBookOverviewPage(
  html: string,
  bookSlug: string,
): SacredTextsBookOverview {
  const $ = cheerio.load(html);

  let description: string | undefined;
  $('script[type="application/ld+json"]').each((_, s) => {
    if (description) return;
    try {
      const json = JSON.parse($(s).text());
      const nodes: unknown[] = Array.isArray(json?.["@graph"])
        ? json["@graph"]
        : [json];
      for (const n of nodes) {
        const node = n as { "@type"?: string; description?: string };
        if (node?.["@type"] === "Book" && node.description) {
          description = squash(node.description);
          break;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });
  description ||= $('meta[name="description"]').attr("content")?.trim();

  const title =
    squash($("h1#book-title").first().text()) ||
    squash($("h1").first().text()) ||
    squash($("title").text()).split(/[–|]/)[0].trim() ||
    bookSlug;

  let chapterCount: number | undefined;
  $(".bo-badge, p, span").each((_, el) => {
    if (chapterCount !== undefined) return;
    const m = squash($(el).text()).match(/^([\d,]+)\s+chapters?$/i);
    if (m) chapterCount = parseInt(m[1].replace(/,/g, ""), 10);
  });

  let lastPage = 1;
  $('a[href*="chaptersPage="]').each((_, a) => {
    const m = ($(a).attr("href") || "").match(/chaptersPage=(\d+)/);
    if (m) lastPage = Math.max(lastPage, parseInt(m[1], 10));
  });

  const chapters: SacredTextsTocEntry[] = [];
  const seen = new Set<string>();
  const push = (href: string, numText: string, titleText: string) => {
    const slug = chapterSlugFromHref(href, bookSlug);
    if (!slug || seen.has(slug)) return;
    const num = parseInt(numText, 10);
    if (!Number.isFinite(num)) return;
    seen.add(slug);
    chapters.push({
      num,
      title: titleText || slug,
      slug,
      url: sacredTextsChapterUrl(bookSlug, slug),
    });
  };

  $("a.bo-toc-row").each((_, a) => {
    const $a = $(a);
    push(
      $a.attr("href") || "",
      squash($a.find(".bo-toc-num").text()),
      squash($a.find(".bo-toc-title").text()),
    );
  });

  // Fallback: "<num> <title>" links into the book.
  if (!chapters.length) {
    $(`a[href*="/book/${bookSlug}/"]`).each((_, a) => {
      const m = squash($(a).text()).match(/^(\d+)\s+(.+)$/);
      if (m) push($(a).attr("href") || "", m[1], m[2]);
    });
  }

  return {
    slug: bookSlug,
    title,
    url: sacredTextsBookUrl(bookSlug),
    description,
    chapterCount,
    lastPage,
    chapters,
  };
}

// ---------------------------------------------------------------------------
// Chapter page: /book/<book>/<chapter>
// ---------------------------------------------------------------------------

const DEVANAGARI = /[ऀ-ॿ]/g;
const LATIN = /[A-Za-zÀ-ɏḀ-ỿ]/g;

function detectLanguage(text: string): string {
  const deva = text.match(DEVANAGARI)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  return deva > latin ? "SAN" : "IAST";
}

/**
 * One verse column: lines separated by <br>, a verse starts with its number,
 * either inline ("1 tapaḥ…", new site) or on its own line ("<font>1</font>",
 * archive site).
 */
function parseVerseColumn(
  $: cheerio.CheerioAPI,
  $cell: CheerioSelection,
): { number: number | null; lines: string[] }[] {
  const $td = $cell.clone();
  $td.find("br").replaceWith("\n");
  $td.find("p, div").each((_, el) => {
    $(el).append("\n");
  });
  const lines = $td
    .text()
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const verses: { number: number | null; lines: string[] }[] = [];
  let current: { number: number | null; lines: string[] } | undefined;
  for (const line of lines) {
    const m = line.match(/^(\d+)(?:\s+(.*))?$/);
    if (m) {
      current = { number: parseInt(m[1], 10), lines: [] };
      verses.push(current);
      if (m[2]) current.lines.push(m[2]);
    } else {
      if (!current) {
        current = { number: null, lines: [] };
        verses.push(current);
      }
      current.lines.push(line);
    }
  }
  return verses.filter((v) => v.lines.length);
}

function contentRoot($: cheerio.CheerioAPI) {
  for (const sel of ["article .contents", ".contents", "article", "main", "body"]) {
    const el = $(sel).first();
    if (el.length) return el;
  }
  return $.root();
}

export function parseChapterPage(html: string): SacredTextsChapterContent {
  const $ = cheerio.load(html);
  const $root = contentRoot($);

  // Ads, widgets and footnote markers injected into the reader.
  $root
    .find(
      ".ista-ad-host, .not-prose, [data-fuse-zone], [data-ad-kind], script, style, noscript, svg, button, form",
    )
    .remove();
  $root.find("a[data-footnote-ref], sup a[href^='#fn']").remove();
  $root.find("h1 br, h2 br, h3 br, h4 br").replaceWith(" ");

  const heading = squash($root.find("h1").first().text()) || undefined;
  const subheading =
    squash($root.find("h2, h3").first().text()) ||
    // new site prints "Chapter 1" as a bare text node after the h1
    squash(
      $root
        .contents()
        .filter((_, n) => n.type === "text")
        .map((_, n) => $(n).text())
        .get()
        .join(" "),
    ) ||
    undefined;

  // --- verse tables (Sanskrit texts with parallel Devanagari / IAST) -------
  const columns: { language: string; verses: ReturnType<typeof parseVerseColumn> }[] = [];
  $root.find("table td").each((_, td) => {
    const verses = parseVerseColumn($, $(td));
    const numbered = verses.filter((v) => v.number !== null).length;
    if (numbered < 1) return;
    const language = detectLanguage(verses.map((v) => v.lines.join(" ")).join(" "));
    // Same language twice (layout tables)? Keep the richer column.
    const existing = columns.find((c) => c.language === language);
    if (existing) {
      if (existing.verses.length < verses.length) existing.verses = verses;
      return;
    }
    columns.push({ language, verses });
  });

  if (columns.length) {
    // Align columns by verse number (falling back to position).
    const primary = columns.reduce((a, b) => (b.verses.length > a.verses.length ? b : a));
    const verses: SacredTextsVerse[] = primary.verses.map((pv, idx) => {
      const text: Record<string, string> = {};
      for (const col of columns) {
        const match =
          (pv.number !== null && col.verses.find((v) => v.number === pv.number)) ||
          col.verses[idx];
        if (match) text[col.language] = match.lines.join("  \n");
      }
      return { number: pv.number, text };
    });
    return {
      heading,
      subheading,
      kind: "verses",
      languages: columns.map((c) => c.language),
      verses,
      paragraphs: [],
    };
  }

  // --- prose (English translations) ----------------------------------------
  $root.find("[data-footnotes], .footnotes, section.footnotes").remove();
  $root.find("li[id^='fn-']").closest("ol, ul").remove();

  const paragraphs: string[] = [];
  $root.find("p, blockquote").each((_, el) => {
    if (el.tagName === "blockquote" && $(el).find("p").length) return;
    let text = squash($(el).text());
    if (!text) return;
    if (/^p\.\s*[\divxlc]+$/i.test(text)) return; // page markers "p. 2"
    const cont = text.match(/^\[paragraph continues\]\s*(.*)$/i);
    if (cont) {
      text = cont[1];
      if (paragraphs.length && text) {
        paragraphs[paragraphs.length - 1] += ` ${text}`;
        return;
      }
    }
    if (text) paragraphs.push(text);
  });

  return {
    heading,
    subheading,
    kind: "prose",
    languages: paragraphs.length ? ["ENG"] : [],
    verses: [],
    paragraphs,
  };
}

// ---------------------------------------------------------------------------
// Book structure: "Book 1: Chapter 5" → group 1 / chapter 5
// ---------------------------------------------------------------------------

const GROUPED_TITLE =
  /^(?:book|parva|parvan|kanda|kandam|mandala|skandha)\s+(\d+)\s*[:.,\-–]\s*(?:chapter|canto|sarga|adhyaya|hymn|sukta|section)\s+(\d+)\b/i;
const GROUP_INDEX_TITLE = /^(book|parva|parvan|kanda|kandam|mandala|skandha)\s+(\d+)\s*$/i;

export function buildBookStructure(
  chapters: SacredTextsTocEntry[],
): SacredTextsBookStructure {
  const matched = chapters.filter((c) => GROUPED_TITLE.test(c.title));
  const grouped = chapters.length > 0 && matched.length >= chapters.length / 2;

  if (!grouped) {
    return {
      mode: "flat",
      groups: [
        {
          number: 0,
          title: "",
          chapters: chapters.map((c) => ({ ...c, number: c.num })),
        },
      ],
      extras: [],
    };
  }

  const groups = new Map<number, SacredTextsGroup>();
  const getGroup = (n: number) => {
    let g = groups.get(n);
    if (!g) {
      g = { number: n, title: `Book ${n}`, chapters: [] };
      groups.set(n, g);
    }
    return g;
  };
  const extras: SacredTextsTocEntry[] = [];

  for (const c of chapters) {
    const m = c.title.match(GROUPED_TITLE);
    if (m) {
      getGroup(parseInt(m[1], 10)).chapters.push({
        ...c,
        number: parseInt(m[2], 10),
      });
      continue;
    }
    const gi = c.title.match(GROUP_INDEX_TITLE);
    if (gi) {
      const g = getGroup(parseInt(gi[2], 10));
      g.title = c.title;
      g.slug = c.slug;
      continue;
    }
    extras.push(c);
  }

  const sorted = [...groups.values()].sort((a, b) => a.number - b.number);
  for (const g of sorted) g.chapters.sort((a, b) => a.number - b.number);
  return { mode: "grouped", groups: sorted, extras };
}
