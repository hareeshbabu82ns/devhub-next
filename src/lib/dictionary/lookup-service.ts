/**
 * Lookup service: runs dictionary searches, browsing and entry navigation
 * against MongoDB. Query construction lives in ./lookup-query (pure).
 */

import { DictionaryWord, Prisma } from "@/app/generated/prisma";
import { db } from "@/lib/db";
import {
  HeadwordQuery,
  MatchMode,
  WordCondition,
  buildHeadwordQuery,
  escapeRegex,
  hasWildcards,
  headwordMatchFilter,
  meaningSearchText,
  rankingStage,
} from "./lookup-query";
import { getDictionaryInfo } from "./dictionary-catalog";

export type LookupSort = "relevance" | "dictionary" | "alphabetical";

export interface LookupParams {
  query: string;
  mode: MatchMode;
  /** Empty means every dictionary */
  origins: string[];
  sort?: LookupSort;
  sortOrder?: "asc" | "desc";
  limit: number;
  offset: number;
}

export type LookupHit = DictionaryWord & {
  /** 0 exact, 1 loose exact, 2 starts with, 3 contains */
  tier?: number;
  /** full-text score, meaning searches only */
  score?: number;
};

export interface LookupResult {
  hits: LookupHit[];
  total: number;
  /** Mode actually used; differs from the request when smart fell back */
  mode: MatchMode;
  fellBack: boolean;
  browse: boolean;
}

interface RawDoc {
  _id: { $oid: string } | string;
  [key: string]: any;
}

function rawDate(value: any): Date {
  if (!value) return new Date(0);
  return new Date(value.$date ?? value);
}

/** Stored sub-documents use `lang`; the Prisma model calls it `language` */
function fromRawLangValues(
  values: Array<{ lang?: string; language?: string; value: string }> = [],
) {
  return values.map((v) => ({
    language: v.language ?? v.lang ?? "",
    value: v.value ?? "",
  }));
}

function fromRaw(doc: RawDoc): LookupHit {
  return {
    id: typeof doc._id === "string" ? doc._id : doc._id.$oid,
    origin: doc.origin,
    wordIndex: doc.wordIndex,
    wordLnum: doc.wordLnum ?? 0,
    word: fromRawLangValues(doc.word),
    description: fromRawLangValues(doc.description),
    attributes: doc.attributes ?? [],
    phonetic: doc.phonetic ?? "",
    sourceData: doc.sourceData ?? null,
    createdAt: rawDate(doc.createdAt),
    updatedAt: rawDate(doc.updatedAt),
    tier: typeof doc._tier === "number" ? doc._tier : undefined,
    score: typeof doc.score === "number" ? doc.score : undefined,
  };
}

/** Imports in progress are staged under "__import__…" origins; never show them */
const NOT_STAGING = { $not: { $regex: "^__" } };

function originFilter(origins: string[]): Record<string, unknown> {
  return origins.length > 0
    ? { origin: { $in: origins } }
    : { origin: NOT_STAGING };
}

function withOrigins(
  match: Record<string, unknown>,
  origins: string[],
): Record<string, unknown> {
  return { $and: [originFilter(origins), match] };
}

async function runFacetPipeline(
  pipeline: Record<string, unknown>[],
): Promise<{ hits: LookupHit[]; total: number }> {
  const raw = (await db.dictionaryWord.aggregateRaw({
    pipeline: pipeline as Prisma.InputJsonValue[],
  })) as unknown as Array<{ total: { n: number }[]; results: RawDoc[] }>;
  const first = raw?.[0];
  return {
    hits: (first?.results ?? []).map(fromRaw),
    total: first?.total?.[0]?.n ?? 0,
  };
}

async function headwordLookup(
  hq: HeadwordQuery,
  p: LookupParams,
): Promise<{ hits: LookupHit[]; total: number }> {
  const dir = p.sortOrder === "desc" ? -1 : 1;
  const sort = p.sort ?? "relevance";
  const sortStage =
    sort === "dictionary"
      ? { $sort: { origin: 1, wordIndex: dir } }
      : sort === "alphabetical"
        ? { $sort: { phonetic: dir, origin: 1, wordIndex: 1 } }
        : { $sort: { _tier: 1, _loose: 1, _len: 1, origin: 1, wordIndex: 1 } };

  const page =
    sort === "relevance"
      ? [rankingStage(hq), sortStage, { $skip: p.offset }, { $limit: p.limit }]
      : [sortStage, { $skip: p.offset }, { $limit: p.limit }, rankingStage(hq)];

  return runFacetPipeline([
    { $match: withOrigins(headwordMatchFilter(hq), p.origins) },
    { $facet: { total: [{ $count: "n" }], results: page } },
  ]);
}

async function meaningLookup(
  p: LookupParams,
): Promise<{ hits: LookupHit[]; total: number }> {
  const search = meaningSearchText(p.query);
  if (!search) return { hits: [], total: 0 };
  const dir = p.sortOrder === "desc" ? -1 : 1;
  const sort = p.sort ?? "relevance";
  const sortStage =
    sort === "dictionary"
      ? { $sort: { origin: 1, wordIndex: dir } }
      : sort === "alphabetical"
        ? { $sort: { phonetic: dir, origin: 1 } }
        : { $sort: { score: -1, origin: 1, wordIndex: 1 } };

  const match: Record<string, unknown> = {
    $text: { $search: search, $caseSensitive: false, $diacriticSensitive: false },
  };
  match.origin = originFilter(p.origins).origin;

  return runFacetPipeline([
    { $match: match },
    { $addFields: { score: { $meta: "textScore" } } },
    {
      $facet: {
        total: [{ $count: "n" }],
        results: [sortStage, { $skip: p.offset }, { $limit: p.limit }],
      },
    },
  ]);
}

async function browseLookup(
  p: LookupParams,
): Promise<{ hits: LookupHit[]; total: number }> {
  const where: Prisma.DictionaryWordWhereInput =
    p.origins.length > 0
      ? { origin: { in: p.origins } }
      : { NOT: { origin: { startsWith: "__" } } };
  const dir = p.sortOrder === "desc" ? "desc" : "asc";
  const orderBy: Prisma.DictionaryWordOrderByWithRelationInput[] =
    p.sort === "alphabetical"
      ? [{ phonetic: dir }]
      : [{ origin: "asc" }, { wordIndex: dir }];
  const [hits, total] = await Promise.all([
    db.dictionaryWord.findMany({
      where,
      orderBy,
      skip: p.offset,
      take: p.limit,
    }),
    db.dictionaryWord.count({ where }),
  ]);
  return { hits, total };
}

/**
 * Search or browse. With no query this pages through the selected
 * dictionaries in their own order. "smart" falls back to a meaning search
 * when no headword matches.
 */
export async function lookupWords(p: LookupParams): Promise<LookupResult> {
  const query = p.query.trim();
  const hq =
    query && p.mode !== "meaning" ? buildHeadwordQuery(query, p.mode) : null;

  if (!query || (p.mode !== "meaning" && !hq)) {
    const r = await browseLookup(p);
    return { ...r, mode: p.mode, fellBack: false, browse: true };
  }

  if (p.mode === "meaning") {
    const r = await meaningLookup(p);
    return { ...r, mode: "meaning", fellBack: false, browse: false };
  }

  const r = await headwordLookup(hq!, p);
  if (r.total === 0 && p.mode === "smart" && !hasWildcards(query)) {
    const m = await meaningLookup({ ...p, sort: "relevance" });
    if (m.total > 0) {
      return { ...m, mode: "meaning", fellBack: true, browse: false };
    }
  }
  return { ...r, mode: p.mode, fellBack: false, browse: false };
}

export interface FacetCount {
  origin: string;
  count: number;
}

async function groupByOrigin(
  match: Record<string, unknown>,
): Promise<FacetCount[]> {
  const raw = (await db.dictionaryWord.aggregateRaw({
    pipeline: [
      { $match: match },
      { $group: { _id: "$origin", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ] as Prisma.InputJsonValue[],
  })) as unknown as Array<{ _id: string; n: number }>;
  return (raw ?? [])
    .filter((r) => !String(r._id).startsWith("__"))
    .map((r) => ({ origin: r._id, count: r.n }));
}

/**
 * How many entries match in each dictionary, ignoring the dictionary
 * selection, so the reader can see where else a word appears.
 */
export async function lookupFacets(
  rawQuery: string,
  mode: MatchMode,
): Promise<{ mode: MatchMode; counts: FacetCount[] }> {
  const query = rawQuery.trim();
  if (!query) return { mode, counts: [] };

  const meaning = async () => {
    const search = meaningSearchText(query);
    return search ? groupByOrigin({ $text: { $search: search } }) : [];
  };

  if (mode === "meaning") return { mode, counts: await meaning() };
  const hq = buildHeadwordQuery(query, mode);
  if (!hq) return { mode, counts: [] };
  const counts = await groupByOrigin(headwordMatchFilter(hq));
  if (counts.length === 0 && mode === "smart" && !hasWildcards(query)) {
    return { mode: "meaning", counts: await meaning() };
  }
  return { mode, counts };
}

function locateConditions(query: string, origin: string): WordCondition[] {
  if (getDictionaryInfo(origin).headword === "en") {
    return [
      {
        languages: ["ENG", "ITRANS"],
        regex: `^${escapeRegex(query)}`,
        caseInsensitive: true,
      },
    ];
  }
  const hq = buildHeadwordQuery(query, "prefix");
  // Only strict (script) matches: loose ones would jump to the wrong letter
  return (hq?.conditions ?? []).filter(
    (c) =>
      !c.caseInsensitive &&
      (c.languages.includes("SAN") || c.languages.includes("TEL")),
  );
}

export interface LocateResult {
  id: string;
  wordIndex: number;
  /** Zero-based position of the entry within the dictionary */
  position: number;
  /** The part of the query that was found (shortened when needed) */
  matched: string;
}

/**
 * Finds where a word (or the closest shorter prefix of it) sits in a
 * dictionary, so browsing can jump straight to that page.
 */
export async function locateInDictionary(
  origin: string,
  rawQuery: string,
): Promise<LocateResult | null> {
  let query = rawQuery.normalize("NFC").trim().replace(/[*?]/g, "");
  while (query.length > 0) {
    const conditions = locateConditions(query, origin);
    if (conditions.length > 0) {
      const hq: HeadwordQuery = {
        script: "other",
        conditions,
        exactValues: [],
        exactConditions: [],
        prefixConditions: [],
      };
      const raw = (await db.dictionaryWord.aggregateRaw({
        pipeline: [
          { $match: { origin, ...headwordMatchFilter(hq) } },
          { $sort: { wordIndex: 1 } },
          { $limit: 1 },
          { $project: { wordIndex: 1 } },
        ] as Prisma.InputJsonValue[],
      })) as unknown as RawDoc[];
      const doc = raw?.[0];
      if (doc) {
        const position = await db.dictionaryWord.count({
          where: { origin, wordIndex: { lt: doc.wordIndex } },
        });
        return {
          id: typeof doc._id === "string" ? doc._id : doc._id.$oid,
          wordIndex: doc.wordIndex,
          position,
          matched: query,
        };
      }
    }
    query = query.slice(0, -1);
  }
  return null;
}

const NEIGHBOUR_SELECT = {
  id: true,
  origin: true,
  wordIndex: true,
  word: true,
} satisfies Prisma.DictionaryWordSelect;

export type NeighbourEntry = Prisma.DictionaryWordGetPayload<{
  select: typeof NEIGHBOUR_SELECT;
}>;

export interface EntryContext {
  entry: DictionaryWord;
  before: NeighbourEntry[];
  after: NeighbourEntry[];
  /** Zero-based position within its dictionary */
  position: number;
  dictionaryTotal: number;
}

/** An entry plus the entries around it in its dictionary */
export async function getEntryContext(
  id: string,
  span = 6,
): Promise<EntryContext | null> {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  const entry = await db.dictionaryWord.findUnique({ where: { id } });
  if (!entry) return null;
  const { origin, wordIndex } = entry;
  const [before, after, position, dictionaryTotal] = await Promise.all([
    db.dictionaryWord.findMany({
      where: { origin, wordIndex: { lt: wordIndex } },
      orderBy: { wordIndex: "desc" },
      take: span,
      select: NEIGHBOUR_SELECT,
    }),
    db.dictionaryWord.findMany({
      where: { origin, wordIndex: { gt: wordIndex } },
      orderBy: { wordIndex: "asc" },
      take: span,
      select: NEIGHBOUR_SELECT,
    }),
    db.dictionaryWord.count({ where: { origin, wordIndex: { lt: wordIndex } } }),
    db.dictionaryWord.count({ where: { origin } }),
  ]);
  return {
    entry,
    before: before.reverse(),
    after,
    position,
    dictionaryTotal,
  };
}

export interface EntryRelations {
  /** The same headword in other dictionaries */
  elsewhere: DictionaryWord[];
  /** Entries in the same dictionary that begin with this headword */
  beginningWith: NeighbourEntry[];
}

function headwordKey(entry: DictionaryWord): { language: string; value: string } | null {
  const preferred =
    getDictionaryInfo(entry.origin).headword === "en"
      ? ["ENG", "ITRANS"]
      : ["SAN", "TEL", "ITRANS"];
  for (const lang of preferred) {
    const w = entry.word.find((x) => x.language === lang && x.value?.trim());
    if (w) return { language: w.language, value: w.value.trim() };
  }
  return null;
}

export async function getEntryRelations(id: string): Promise<EntryRelations> {
  if (!/^[0-9a-f]{24}$/i.test(id)) return { elsewhere: [], beginningWith: [] };
  const entry = await db.dictionaryWord.findUnique({ where: { id } });
  if (!entry) return { elsewhere: [], beginningWith: [] };
  const key = headwordKey(entry);
  if (!key) return { elsewhere: [], beginningWith: [] };

  const [elsewhere, beginningWith] = await Promise.all([
    db.dictionaryWord.findMany({
      where: {
        AND: [
          { origin: { not: entry.origin } },
          { NOT: { origin: { startsWith: "__" } } },
        ],
        word: {
          some: {
            language: key.language,
            value: key.language === "SAN" || key.language === "TEL"
              ? { equals: key.value }
              : { equals: key.value, mode: "insensitive" },
          },
        },
      },
      orderBy: [{ origin: "asc" }, { wordIndex: "asc" }],
      take: 40,
    }),
    db.dictionaryWord.findMany({
      where: {
        origin: entry.origin,
        id: { not: entry.id },
        word: {
          some: {
            language: key.language,
            value: { startsWith: key.value },
          },
        },
      },
      orderBy: { wordIndex: "asc" },
      take: 40,
      select: NEIGHBOUR_SELECT,
    }),
  ]);
  return { elsewhere, beginningWith };
}

/** Entry counts per dictionary, for the browse landing page */
export async function getDictionaryStats(): Promise<FacetCount[]> {
  return groupByOrigin({});
}
