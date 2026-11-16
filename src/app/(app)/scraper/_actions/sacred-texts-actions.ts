"use server";

import {
  createSacredTextsEntities,
  loadSacredTextsBook,
  loadSacredTextsCategory,
  scrapeSacredTextsChapters,
  type ChapterScrapeResult,
  type EntityBatchResult,
  type SacredTextsBookDetails,
  type SacredTextsEntityOptions,
} from "@/lib/scrape/sacred-texts-pipeline";
import type { SacredTextsCategory } from "@/lib/scrape/sacred-texts";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(label: string, fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.error(`[sacred-texts] ${label}:`, error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Books of a category (default: hinduism, the old /hin index). */
export async function getSacredTextsCatalog(
  category: string,
  refetch = false,
): Promise<Result<SacredTextsCategory>> {
  return run("catalog", () => loadSacredTextsCategory(category, refetch));
}

/** A book's overview and full table of contents. */
export async function getSacredTextsBook(
  bookSlug: string,
  refetch = false,
): Promise<Result<SacredTextsBookDetails>> {
  return run("book", () => loadSacredTextsBook(bookSlug, refetch));
}

/** Fetch and parse a batch of chapters into JSON files. */
export async function scrapeSacredTextsChapterBatch(
  bookSlug: string,
  chapterSlugs: string[],
  refetch = false,
): Promise<Result<{ results: ChapterScrapeResult[]; blocked?: string }>> {
  return run("chapters", () => scrapeSacredTextsChapters(bookSlug, chapterSlugs, refetch));
}

/** Create entities for a batch of scraped chapters. */
export async function createSacredTextsEntityBatch(
  options: SacredTextsEntityOptions,
): Promise<Result<EntityBatchResult>> {
  return run("entities", () => createSacredTextsEntities(options));
}
