import { db } from "@/lib/db";
import { containerIdsUnder, countChildren } from "../retrieval";
import { embedModelId, getEmbedConfig } from "./embeddings";
import { fold, fromBytes } from "./text";

/**
 * Read side of the knowledge index: which part of the library a scope
 * covers, how much of it is indexed, and its vectors held in memory for
 * search. Vectors are small (one byte per dimension), so a whole book fits
 * comfortably and a brute-force scan answers in milliseconds.
 */

type RagMemory = {
  epoch: number;
  vectors: Map<string, { epoch: number; at: number; data: ScopeVectors }>;
  concepts: { epoch: number; at: number; data: ConceptIndex } | null;
};
const globalForRag = globalThis as unknown as { ragMemory?: RagMemory };
const memory: RagMemory = (globalForRag.ragMemory ??= {
  epoch: 0,
  vectors: new Map(),
  concepts: null,
});

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHED_SCOPES = 4;
const ID_SLICE = 400;
const PAGE = 4000;

/** Called after the index changes so cached vectors are read again. */
export const bumpRagEpoch = () => {
  memory.epoch++;
};

const fresh = (entry: { epoch: number; at: number } | null | undefined) =>
  !!entry &&
  entry.epoch === memory.epoch &&
  Date.now() - entry.at < CACHE_TTL_MS;

const slices = <T>(items: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

/** Prisma filter selecting the index entries inside a scope. */
export const chunkScope = (containerIds: string[] | null) =>
  containerIds ? { parentId: { in: containerIds } } : {};

/** Containers a scope covers; null for the whole library. */
export async function scopeContainerIds(
  scopeId: string | null,
): Promise<string[] | null> {
  return scopeId ? containerIdsUnder(scopeId) : null;
}

export type RagCoverage = {
  /** entities in the scope that can be indexed */
  items: number;
  /** of those, searchable with the current embedding model */
  embedded: number;
  /** embedded with another model: ignored by search until rebuilt */
  staleEmbedded: number;
  /** analysed for the knowledge graph */
  extracted: number;
  embedModel: string | null;
};

export async function ragCoverage(
  scopeId: string | null,
): Promise<RagCoverage> {
  const containerIds = await scopeContainerIds(scopeId);
  const config = getEmbedConfig();
  const model = config ? embedModelId(config) : null;
  const scope = chunkScope(containerIds);
  const [items, withVector, embedded, extracted] = await Promise.all([
    countChildren(containerIds),
    db.ragChunk.count({ where: { ...scope, dim: { gt: 0 } } }),
    model ? db.ragChunk.count({ where: { ...scope, model } }) : 0,
    db.ragChunk.count({ where: { ...scope, graphHash: { not: null } } }),
  ]);
  return {
    items,
    embedded,
    staleEmbedded: withVector - embedded,
    extracted,
    embedModel: model,
  };
}

/** True when anything in the scope has been indexed. */
export async function scopeHasIndex(containerIds: string[] | null) {
  const any = await db.ragChunk.findFirst({
    where: chunkScope(containerIds),
    select: { id: true },
  });
  return !!any;
}

export type ScopeVectors = {
  ids: string[];
  dim: number;
  /** row-major, `ids.length` × `dim` */
  matrix: Int8Array;
};

/** All vectors of a scope for one embedding model, cached in memory. */
export async function loadScopeVectors(
  scopeId: string | null,
  containerIds: string[] | null,
  model: string,
): Promise<ScopeVectors> {
  const cacheKey = `${scopeId ?? "library"}|${model}`;
  const cached = memory.vectors.get(cacheKey);
  if (cached && fresh(cached)) {
    cached.at = Date.now();
    return cached.data;
  }

  const ids: string[] = [];
  const rows: Int8Array[] = [];
  let dim = 0;
  // large `in` lists are split, and each part is read in pages
  const parts: (string[] | null)[] = containerIds
    ? slices(containerIds, ID_SLICE)
    : [null];
  for (const part of parts) {
    let cursor: string | undefined;
    for (;;) {
      const page = await db.ragChunk.findMany({
        where: { model, dim: { gt: 0 }, ...chunkScope(part) },
        select: { id: true, entityId: true, vector: true, dim: true },
        orderBy: { id: "asc" },
        take: PAGE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const row of page) {
        if (!row.vector) continue;
        dim ||= row.dim;
        if (row.vector.length !== dim) continue;
        ids.push(row.entityId);
        rows.push(fromBytes(row.vector));
      }
      if (page.length < PAGE) break;
      cursor = page[page.length - 1].id;
    }
  }
  const matrix = new Int8Array(rows.length * dim);
  rows.forEach((row, i) => matrix.set(row, i * dim));

  const data = { ids, dim, matrix };
  memory.vectors.set(cacheKey, { epoch: memory.epoch, at: Date.now(), data });
  // keep the most recently used scopes only
  const entries = [...memory.vectors.entries()].sort(
    (a, b) => b[1].at - a[1].at,
  );
  for (const [key] of entries.slice(MAX_CACHED_SCOPES))
    memory.vectors.delete(key);
  return data;
}

export type ConceptInfo = {
  key: string;
  kind: string;
  label: string;
  original: string;
  description: string;
  count: number;
  /** folded label and aliases, for matching against a question */
  names: string[];
};

export type ConceptIndex = {
  byKey: Map<string, ConceptInfo>;
  list: ConceptInfo[];
  /** vectors of the concepts embedded with `model`, aligned with `vectorKeys` */
  model: string;
  vectorKeys: string[];
  dim: number;
  matrix: Int8Array;
};

/** Every concept in the library, with vectors for the current model. */
export async function loadConcepts(
  model: string | null,
): Promise<ConceptIndex> {
  const cached = memory.concepts;
  if (cached && fresh(cached) && cached.data.model === (model ?? "")) {
    return cached.data;
  }
  const rows = await db.ragConcept.findMany();
  const byKey = new Map<string, ConceptInfo>();
  const vectorKeys: string[] = [];
  const vectors: Int8Array[] = [];
  let dim = 0;
  for (const row of rows) {
    byKey.set(row.key, {
      key: row.key,
      kind: row.kind,
      label: row.label,
      original: row.original ?? "",
      description: row.description,
      count: row.count,
      names: [
        ...new Set([row.label, ...row.aliases].map(fold).filter(Boolean)),
      ],
    });
    if (model && row.model === model && row.vector) {
      dim ||= row.vector.length;
      if (row.vector.length !== dim) continue;
      vectorKeys.push(row.key);
      vectors.push(fromBytes(row.vector));
    }
  }
  const matrix = new Int8Array(vectors.length * dim);
  vectors.forEach((v, i) => matrix.set(v, i * dim));
  const data: ConceptIndex = {
    byKey,
    list: [...byKey.values()],
    model: model ?? "",
    vectorKeys,
    dim,
    matrix,
  };
  memory.concepts = { epoch: memory.epoch, at: Date.now(), data };
  return data;
}
