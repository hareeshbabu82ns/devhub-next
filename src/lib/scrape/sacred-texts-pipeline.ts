/**
 * sacred-texts.com pipeline: catalog → book TOC → chapter JSON → entities.
 *
 * Every page fetched is cached as HTML under `${dataFolder}/sacred-texts/html`
 * (mirroring the URL path), so re-runs and re-parses never hit the site again
 * unless `refetch` is set. Parsed chapters are written to
 * `${dataFolder}/sacred-texts/books/<book>/chapters/<chapter>.json`, and entity
 * creation reads only those files.
 *
 * The site sits behind Cloudflare and may refuse automated requests. A blocked
 * response is detected and reported (SacredTextsBlockedError) with the cache
 * file it expected, so a page saved from a browser can be dropped in place.
 */

import path from "path";
import fs from "fs/promises";
import config from "@/config";
import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma";
import { transliteratedText } from "@/app/(app)/sanscript/_components/utils";
import { entityTypeName } from "@/lib/entity-types";
import type { LANGUAGES_TYPE } from "@/lib/constants";
import {
  SACRED_TEXTS_ORIGIN,
  buildBookStructure,
  isSacredTextsBlockedPage,
  parseBookOverviewPage,
  parseCategoryPage,
  parseChapterPage,
  sacredTextsBookUrl,
  sacredTextsCategoryUrl,
  sacredTextsChapterUrl,
  type SacredTextsBookOverview,
  type SacredTextsBookStructure,
  type SacredTextsCategory,
  type SacredTextsChapterContent,
  type SacredTextsChapterRef,
  type SacredTextsGroup,
} from "./sacred-texts";

export const SACRED_TEXTS_SOURCE = "sacred-texts";

/** Minimum gap between two network requests to the site. */
const REQUEST_GAP_MS = 750;
const USER_AGENT = "devhub-next/2 (personal library importer)";

const cacheRoot = () => path.resolve(config.dataFolder, "sacred-texts");

// ---------------------------------------------------------------------------
// Slugs & paths
// ---------------------------------------------------------------------------

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function assertSlug(value: string, what: string): string {
  if (!SLUG.test(value) || value.includes("..")) {
    throw new Error(`Invalid ${what}: ${JSON.stringify(value)}`);
  }
  return value;
}

/** URL on sacred-texts.com → cache file (path segments sanitised). */
export function cacheFileForUrl(url: string): string {
  const u = new URL(url);
  if (u.origin !== SACRED_TEXTS_ORIGIN) {
    throw new Error(`Not a sacred-texts.com URL: ${url}`);
  }
  const segments = u.pathname
    .split("/")
    .filter(Boolean)
    .map((s) => decodeURIComponent(s).replace(/[^A-Za-z0-9._-]/g, "_"))
    .filter((s) => s !== "." && s !== "..");
  if (!segments.length) segments.push("index");
  const page = u.searchParams.get("chaptersPage");
  if (page && /^\d+$/.test(page) && page !== "1") {
    segments[segments.length - 1] += `__page-${page}`;
  }
  return path.join(cacheRoot(), "html", ...segments) + ".html";
}

const bookDir = (bookSlug: string) =>
  path.join(cacheRoot(), "books", assertSlug(bookSlug, "book slug"));

const chapterJsonFile = (bookSlug: string, chapterSlug: string) =>
  path.join(
    bookDir(bookSlug),
    "chapters",
    `${assertSlug(chapterSlug, "chapter slug")}.json`,
  );

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

export class SacredTextsBlockedError extends Error {
  constructor(
    public url: string,
    public cacheFile: string,
    public status: number,
  ) {
    super(
      `sacred-texts.com is blocking automated requests from this server ` +
        `(Cloudflare, HTTP ${status}) for ${url}. ` +
        `Save the page from a browser as ${cacheFile} to use it from the cache.`,
    );
    this.name = "SacredTextsBlockedError";
  }
}

let lastRequestAt = 0;

async function politeFetch(url: string): Promise<Response> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    cache: "no-store",
  });
}

/** HTML for a sacred-texts.com URL, from the cache unless `refetch`. */
export async function fetchSacredTextsHtml(
  url: string,
  refetch = false,
): Promise<{ html: string; cached: boolean }> {
  const file = cacheFileForUrl(url);
  if (!refetch && (await exists(file))) {
    const html = await fs.readFile(file, "utf-8");
    if (!isSacredTextsBlockedPage(html)) return { html, cached: true };
  }

  const res = await politeFetch(url);
  const html = await res.text();
  if (isSacredTextsBlockedPage(html) || res.status === 403) {
    throw new SacredTextsBlockedError(url, file, res.status);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html);
  return { html, cached: false };
}

// ---------------------------------------------------------------------------
// Catalog & books
// ---------------------------------------------------------------------------

export async function loadSacredTextsCategory(
  category: string,
  refetch = false,
): Promise<SacredTextsCategory> {
  assertSlug(category, "category");
  const { html } = await fetchSacredTextsHtml(sacredTextsCategoryUrl(category), refetch);
  return parseCategoryPage(html, category);
}

export interface SacredTextsBookDetails extends SacredTextsBookOverview {
  structure: SacredTextsBookStructure;
  /** Chapters already scraped to JSON */
  scraped: string[];
}

async function scrapedChapterSlugs(bookSlug: string): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(bookDir(bookSlug), "chapters"));
    return files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
}

/** Book overview with the complete table of contents (all TOC pages). */
export async function loadSacredTextsBook(
  bookSlug: string,
  refetch = false,
): Promise<SacredTextsBookDetails> {
  assertSlug(bookSlug, "book slug");
  const first = parseBookOverviewPage(
    (await fetchSacredTextsHtml(sacredTextsBookUrl(bookSlug), refetch)).html,
    bookSlug,
  );

  const chapters = [...first.chapters];
  const seen = new Set(chapters.map((c) => c.slug));
  let lastPage = first.lastPage;
  // The pager only links nearby pages plus the last one; keep going until the
  // highest page seen so far is done.
  for (let page = 2; page <= lastPage; page++) {
    const parsed = parseBookOverviewPage(
      (await fetchSacredTextsHtml(sacredTextsBookUrl(bookSlug, page), refetch)).html,
      bookSlug,
    );
    lastPage = Math.max(lastPage, parsed.lastPage);
    for (const c of parsed.chapters) {
      if (seen.has(c.slug)) continue;
      seen.add(c.slug);
      chapters.push(c);
    }
  }
  chapters.sort((a, b) => a.num - b.num);

  const details: SacredTextsBookDetails = {
    ...first,
    lastPage,
    chapters,
    structure: buildBookStructure(chapters),
    scraped: await scrapedChapterSlugs(bookSlug),
  };
  const { scraped: _scraped, ...toSave } = details;
  await writeJson(path.join(bookDir(bookSlug), "book.json"), {
    ...toSave,
    fetchedAt: new Date().toISOString(),
  });
  return details;
}

async function readSavedBook(bookSlug: string): Promise<SacredTextsBookDetails> {
  const file = path.join(bookDir(bookSlug), "book.json");
  if (!(await exists(file))) {
    throw new Error(`Load the table of contents of "${bookSlug}" first.`);
  }
  const saved = JSON.parse(await fs.readFile(file, "utf-8"));
  return { ...saved, scraped: await scrapedChapterSlugs(bookSlug) };
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

export interface SavedSacredTextsChapter extends SacredTextsChapterContent {
  book: string;
  slug: string;
  title: string;
  url: string;
  scrapedAt: string;
}

export interface ChapterScrapeResult {
  slug: string;
  ok: boolean;
  cached?: boolean;
  kind?: "verses" | "prose";
  count?: number;
  error?: string;
}

export async function scrapeSacredTextsChapters(
  bookSlug: string,
  chapterSlugs: string[],
  refetch = false,
): Promise<{ results: ChapterScrapeResult[]; blocked?: string }> {
  const book = await readSavedBook(bookSlug);
  const toc = new Map(book.chapters.map((c) => [c.slug, c]));
  const results: ChapterScrapeResult[] = [];

  for (const slug of chapterSlugs) {
    assertSlug(slug, "chapter slug");
    const entry = toc.get(slug);
    const url = sacredTextsChapterUrl(bookSlug, slug);
    try {
      const { html, cached } = await fetchSacredTextsHtml(url, refetch);
      const content = parseChapterPage(html);
      const saved: SavedSacredTextsChapter = {
        book: bookSlug,
        slug,
        title: entry?.title ?? content.heading ?? slug,
        url,
        scrapedAt: new Date().toISOString(),
        ...content,
      };
      await writeJson(chapterJsonFile(bookSlug, slug), saved);
      const count = content.kind === "verses" ? content.verses.length : content.paragraphs.length;
      results.push({ slug, ok: count > 0, cached, kind: content.kind, count, error: count ? undefined : "No content found on the page" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ slug, ok: false, error: message });
      // Every following request would be refused too.
      if (error instanceof SacredTextsBlockedError) return { results, blocked: message };
    }
  }
  return { results };
}

async function readSavedChapter(bookSlug: string, chapterSlug: string) {
  const file = chapterJsonFile(bookSlug, chapterSlug);
  if (!(await exists(file))) return undefined;
  return JSON.parse(await fs.readFile(file, "utf-8")) as SavedSacredTextsChapter;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface SacredTextsEntityOptions {
  bookSlug: string;
  /** Entity the book is attached to (optional) */
  parentId?: string;
  /** Root entity from a previous batch of the same run */
  rootId?: string;
  rootType: string;
  /** ITRANS title for the root (defaults to the English book title) */
  rootTitle?: string;
  /** Type for "Book N" groups (grouped books only) */
  groupType?: string;
  /** ITRANS title per group, in group order */
  groupTitles?: string[];
  chapterType: string;
  verseType: string;
  chapterSlugs: string[];
}

export interface EntityBatchResult {
  rootId: string;
  created: number;
  skipped: number;
  missing: string[];
  verses: number;
}

const THUMBNAIL = "/default-om_256.png";
const FILL_LANGUAGES: LANGUAGES_TYPE[] = ["SAN", "IAST", "ITRANS", "TEL"];
/** Nicer ITRANS names than the registry for numbering ("parva 3"). */
const ITRANS_NUMBER_LABEL: Record<string, string> = {
  PARVAM: "parva",
  KAANDAM: "kANDa",
  SARGA: "sarga",
  ADHYAAYAM: "adhyAya",
};

const numberLabel = (type: string, n: number) =>
  `${ITRANS_NUMBER_LABEL[type] ?? entityTypeName(type, "ITRANS")} ${n}`;

type TextList = { language: string; value: string }[];

/** English title plus ITRANS (transliterated to SAN/IAST/TEL) when given. */
function titleText(english: string, itrans?: string): TextList {
  const list: TextList = [];
  if (itrans?.trim()) {
    list.push(
      ...(transliteratedText([{ language: "ITRANS", value: itrans.trim() }], [
        "SAN",
        "IAST",
        "TEL",
      ]) ?? []),
    );
  }
  if (english.trim()) list.push({ language: "ENG", value: english.trim() });
  return list;
}

const sourceAttributes = (url: string, extra: Record<string, string>) => [
  { key: "sourceType", value: SACRED_TEXTS_SOURCE },
  ...Object.entries(extra).map(([key, value]) => ({ key, value })),
  { key: "sourceUrl", value: url },
];

async function findOrCreateRoot(
  opts: SacredTextsEntityOptions,
  book: SacredTextsBookDetails,
): Promise<string> {
  if (opts.rootId) {
    const root = await db.entity.findUnique({ where: { id: opts.rootId }, select: { id: true } });
    if (!root) throw new Error(`Root entity ${opts.rootId} not found`);
    return root.id;
  }
  const existing = await db.entity.findFirst({
    where: {
      type: opts.rootType,
      attributes: { some: { key: "stBook", value: opts.bookSlug } },
      ...(opts.parentId ? { parents: { has: opts.parentId } } : {}),
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.entity.create({
    data: {
      type: opts.rootType,
      imageThumbnail: THUMBNAIL,
      text: titleText(book.title, opts.rootTitle),
      meaning: book.description ? [{ language: "ENG", value: book.description }] : [],
      attributes: sourceAttributes(book.url, { stBook: opts.bookSlug }),
      ...(opts.parentId ? { parentsRel: { connect: { id: opts.parentId } } } : {}),
    },
    select: { id: true },
  });
  return created.id;
}

async function findOrCreateGroup(
  rootId: string,
  group: SacredTextsGroup,
  groupIndex: number,
  opts: SacredTextsEntityOptions,
): Promise<string> {
  const groupType = opts.groupType!;
  const order = group.number - 1;
  const existing = await db.entity.findFirst({
    where: { type: groupType, parents: { has: rootId }, order },
    select: { id: true },
  });
  if (existing) return existing.id;

  const itrans = opts.groupTitles?.[groupIndex]?.trim() || numberLabel(groupType, group.number);
  const url = group.slug
    ? sacredTextsChapterUrl(opts.bookSlug, group.slug)
    : sacredTextsBookUrl(opts.bookSlug);
  const created = await db.entity.create({
    data: {
      type: groupType,
      order,
      imageThumbnail: THUMBNAIL,
      text: titleText(group.title, itrans),
      attributes: sourceAttributes(url, { stBook: opts.bookSlug, stGroup: String(group.number) }),
      parentsRel: { connect: { id: rootId } },
    },
    select: { id: true },
  });
  return created.id;
}

function verseEntities(
  chapter: SavedSacredTextsChapter,
  verseType: string,
): Prisma.EntityCreateWithoutParentsRelInput[] {
  if (chapter.kind === "verses") {
    return chapter.verses.map((v, idx) => ({
      type: verseType,
      order: idx,
      imageThumbnail: THUMBNAIL,
      text:
        transliteratedText(
          Object.entries(v.text).map(([language, value]) => ({ language, value })),
          FILL_LANGUAGES,
        ) ?? [],
      attributes: v.number !== null ? [{ key: "verseNumber", value: String(v.number) }] : [],
    }));
  }
  return chapter.paragraphs.map((p, idx) => ({
    type: verseType,
    order: idx,
    imageThumbnail: THUMBNAIL,
    text: [{ language: "ENG", value: p }],
  }));
}

/**
 * Create entities for one batch of chapters. The first batch creates (or
 * finds) the root; pass the returned `rootId` to the following batches.
 * Chapters that already exist under their parent are skipped, so a run can be
 * resumed or repeated safely.
 */
export async function createSacredTextsEntities(
  opts: SacredTextsEntityOptions,
): Promise<EntityBatchResult> {
  assertSlug(opts.bookSlug, "book slug");
  const book = await readSavedBook(opts.bookSlug);
  const { structure } = book;
  if (structure.mode === "grouped" && !opts.groupType) {
    throw new Error("Pick an entity type for the book's groups (e.g. KAANDAM, PARVAM).");
  }

  const rootId = await findOrCreateRoot(opts, book);
  const result: EntityBatchResult = { rootId, created: 0, skipped: 0, missing: [], verses: 0 };

  // chapter slug → (group, chapter)
  const where = new Map<string, { group: SacredTextsGroup; groupIndex: number; chapter: SacredTextsChapterRef }>();
  structure.groups.forEach((group, groupIndex) =>
    group.chapters.forEach((chapter) => where.set(chapter.slug, { group, groupIndex, chapter })),
  );

  const groupIds = new Map<number, string>();
  for (const slug of opts.chapterSlugs) {
    const loc = where.get(slug);
    const saved = loc && (await readSavedChapter(opts.bookSlug, slug));
    if (!loc || !saved) {
      result.missing.push(slug);
      continue;
    }

    let containerId = rootId;
    if (structure.mode === "grouped") {
      containerId =
        groupIds.get(loc.group.number) ??
        (await findOrCreateGroup(rootId, loc.group, loc.groupIndex, opts));
      groupIds.set(loc.group.number, containerId);
    }

    const order = loc.chapter.number - 1;
    const existing = await db.entity.findFirst({
      where: {
        type: opts.chapterType,
        parents: { has: containerId },
        attributes: { some: { key: "stChapter", value: slug } },
      },
      select: { id: true },
    });
    if (existing) {
      result.skipped++;
      continue;
    }

    const children = verseEntities(saved, opts.verseType);
    // Grouped Sanskrit chapters get a numbered ITRANS name ("sarga 5");
    // everything keeps the site's English title.
    const english =
      structure.mode === "grouped" ? `Chapter ${loc.chapter.number}` : loc.chapter.title;
    const itrans =
      structure.mode === "grouped" || saved.kind === "verses"
        ? numberLabel(opts.chapterType, loc.chapter.number)
        : undefined;

    await db.entity.create({
      data: {
        type: opts.chapterType,
        order,
        imageThumbnail: THUMBNAIL,
        text: titleText(english, itrans),
        attributes: sourceAttributes(saved.url, { stBook: opts.bookSlug, stChapter: slug }),
        parentsRel: { connect: { id: containerId } },
        childrenRel: { create: children },
      },
      select: { id: true },
    });
    result.created++;
    result.verses += children.length;
  }
  return result;
}
