"use server";

import { DictionaryWord } from "@/app/generated/prisma";
import { mapDbToDictionary } from "./utils";
import { DictionaryItem } from "./types";
import { MatchMode, parseMatchMode } from "@/lib/dictionary/lookup-query";
import {
  FacetCount,
  LocateResult,
  LookupHit,
  LookupSort,
  NeighbourEntry,
  getDictionaryStats,
  getEntryContext,
  getEntryRelations,
  locateInDictionary,
  lookupFacets,
  lookupWords,
} from "@/lib/dictionary/lookup-service";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";

const MAX_LIMIT = 10000;

/** Headword as the reader should see it: English for English dictionaries */
function displayWord(
  origin: string,
  words: { language: string; value: string }[],
  language: string,
): string {
  if (getDictionaryInfo(origin).headword === "en") {
    const eng =
      words.find((w) => w.language === "ENG") ??
      words.find((w) => w.language === "ITRANS");
    if (eng) return eng.value;
  }
  return (words.find((w) => w.language === language) ?? words[0])?.value ?? "";
}

const TIER_MATCH: Record<number, DictionaryItem["matchType"]> = {
  0: "exact",
  1: "exact",
  2: "prefix",
  3: "contains",
};

function toItem(hit: LookupHit | DictionaryWord, language: string): DictionaryItem {
  const item = mapDbToDictionary(hit, language);
  item.word = displayWord(hit.origin, hit.word, language);
  const tier = (hit as LookupHit).tier;
  if (typeof tier === "number") item.matchType = TIER_MATCH[tier];
  if (typeof (hit as LookupHit).score === "number") item.matchType = "meaning";
  return item;
}

export interface LookupRequest {
  query: string;
  mode: MatchMode | string;
  origins: string[];
  sort?: LookupSort;
  sortOrder?: "asc" | "desc";
  language: string;
  limit: number;
  offset: number;
}

export interface LookupResponse {
  results: DictionaryItem[];
  total: number;
  mode: MatchMode;
  fellBack: boolean;
  browse: boolean;
}

export async function lookupDictionary(
  req: LookupRequest,
): Promise<LookupResponse> {
  const limit = Math.min(Math.max(1, req.limit || 10), MAX_LIMIT);
  const offset = Math.max(0, req.offset || 0);
  const r = await lookupWords({
    query: req.query ?? "",
    mode: parseMatchMode(req.mode),
    origins: (req.origins ?? []).filter(Boolean),
    sort: req.sort,
    sortOrder: req.sortOrder,
    limit,
    offset,
  });
  return {
    results: r.hits.map((h) => toItem(h, req.language)),
    total: r.total,
    mode: r.mode,
    fellBack: r.fellBack,
    browse: r.browse,
  };
}

export async function dictionaryFacets(
  query: string,
  mode: MatchMode | string,
): Promise<{ mode: MatchMode; counts: FacetCount[] }> {
  return lookupFacets(query ?? "", parseMatchMode(mode));
}

export async function locateWord(
  origin: string,
  query: string,
): Promise<LocateResult | null> {
  if (!origin || !query?.trim()) return null;
  return locateInDictionary(origin, query);
}

export async function dictionaryStats(): Promise<FacetCount[]> {
  return getDictionaryStats();
}

export interface EntryLink {
  id: string;
  origin: string;
  wordIndex: number;
  word: string;
}

function toLink(n: NeighbourEntry, language: string): EntryLink {
  return {
    id: n.id,
    origin: n.origin,
    wordIndex: n.wordIndex,
    word: displayWord(n.origin, n.word, language),
  };
}

export interface EntryView {
  item: DictionaryItem;
  before: EntryLink[];
  after: EntryLink[];
  position: number;
  dictionaryTotal: number;
}

export async function getDictionaryEntry(
  id: string,
  language: string,
): Promise<EntryView | null> {
  const ctx = await getEntryContext(id);
  if (!ctx) return null;
  return {
    item: toItem(ctx.entry, language),
    before: ctx.before.map((n) => toLink(n, language)),
    after: ctx.after.map((n) => toLink(n, language)),
    position: ctx.position,
    dictionaryTotal: ctx.dictionaryTotal,
  };
}

export interface EntryRelationsView {
  elsewhere: DictionaryItem[];
  beginningWith: EntryLink[];
}

export async function getDictionaryEntryRelations(
  id: string,
  language: string,
): Promise<EntryRelationsView> {
  const r = await getEntryRelations(id);
  return {
    elsewhere: r.elsewhere.map((e) => toItem(e, language)),
    beginningWith: r.beginningWith.map((n) => toLink(n, language)),
  };
}
