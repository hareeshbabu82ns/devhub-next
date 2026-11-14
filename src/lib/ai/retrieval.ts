import { db } from "@/lib/db";
import { annotationKind } from "@/lib/annotations";
import { ENTITY_TYPE_CODES, entityChildTypes } from "@/lib/entity-types";
import {
  isRelative,
  PositionRequest,
  RelativePosition,
  selectPositions,
  selectRelative,
} from "./positions";

type LangValue = { language: string; value: string };

export type Passage = {
  id: string;
  type: string;
  parentId: string | null;
  /** Human-readable location, e.g. "Ramayanam › Bala Kandam › Sarga 2 › 14". */
  reference: string;
  text: string;
  meaning: string;
  notes: string[];
};

/** Up to this many items a scope is given to the model whole, in order. */
export const FULL_CONTEXT_MAX_ITEMS = 120;
const RETRIEVED_PASSAGES = 24;
const PER_KEYWORD_LIMIT = 80;
const MAX_KEYWORDS = 6;
const MAX_FIELD_CHARS = 1500;

export const PASSAGE_SELECT = {
  id: true,
  type: true,
  order: true,
  parents: true,
  text: true,
  meaning: true,
} as const;
export type PassageRow = {
  id: string;
  type: string;
  order: number;
  parents: string[];
  text: LangValue[];
  meaning: LangValue[];
};

export const CONTAINER_TYPES = ENTITY_TYPE_CODES.filter(
  (t) => entityChildTypes(t).length > 0,
);

export const ROOT_TYPES = ["GOD", "AUTHOR"];

export const pickLanguage = (values: LangValue[], preferred: string[]) => {
  for (const language of preferred) {
    const hit = values.find((v) => v.language === language && v.value);
    if (hit) return hit.value;
  }
  return values.find((v) => v.value)?.value ?? "";
};

const clip = (value: string) =>
  value.length > MAX_FIELD_CHARS
    ? `${value.slice(0, MAX_FIELD_CHARS)}…`
    : value;

export const entityTitle = (text: LangValue[]) =>
  pickLanguage(text, ["ENG", "IAST", "SAN", "TEL"])
    .replace(/\s+/g, " ")
    .slice(0, 80);

/**
 * Ids of the entity and of every container beneath it (books, chapters...).
 * Verses are not listed — they are found as children of these containers.
 */
export async function containerIdsUnder(entityId: string): Promise<string[]> {
  const all = [entityId];
  let frontier = [entityId];
  for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
    const children = await db.entity.findMany({
      where: { parents: { hasSome: frontier }, type: { in: CONTAINER_TYPES } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id).filter((id) => !all.includes(id));
    all.push(...frontier);
  }
  return all;
}

const leafFilter = (leavesOnly: boolean) =>
  leavesOnly ? { type: { $nin: CONTAINER_TYPES } } : {};

const inContainers = (containerIds: string[] | null) =>
  containerIds
    ? { parents: { $in: containerIds.map((id) => ({ $oid: id })) } }
    : {};

/**
 * How many entities sit directly inside the given containers (null: in the
 * whole library). Asked of the database directly: Prisma's list filters
 * (`has`, `hasSome`) do not use the index on `parents`, which costs seconds
 * on a large book.
 */
export async function countChildren(
  containerIds: string[] | null,
  leavesOnly = false,
): Promise<number> {
  if (containerIds?.length === 0) return 0;
  const result = (await db.entity.aggregateRaw({
    pipeline: [
      { $match: { ...inContainers(containerIds), ...leafFilter(leavesOnly) } },
      { $count: "n" },
    ],
  })) as unknown as { n: number }[];
  return result[0]?.n ?? 0;
}

/** Ids of the entities directly inside the given containers. */
export async function childIds(
  containerIds: string[],
  leavesOnly = false,
): Promise<string[]> {
  if (containerIds.length === 0) return [];
  const result = (await db.entity.aggregateRaw({
    pipeline: [
      { $match: { ...inContainers(containerIds), ...leafFilter(leavesOnly) } },
      { $project: { _id: 1 } },
    ],
  })) as unknown as { _id: { $oid: string } }[];
  return result.map((row) => row._id.$oid);
}

/** Builds "Book › Chapter › 14" style references for a set of rows. */
export async function withReferences(
  rows: PassageRow[],
  userId: string,
): Promise<Passage[]> {
  // titles of ancestors, fetched level by level for all rows at once
  const titles = new Map<string, { title: string; parent?: string }>();
  let pending = [...new Set(rows.map((r) => r.parents[0]).filter(Boolean))];
  for (let depth = 0; depth < 4 && pending.length > 0; depth++) {
    const ancestors = await db.entity.findMany({
      where: { id: { in: pending } },
      select: { id: true, type: true, text: true, parents: true },
    });
    for (const a of ancestors) {
      // the deity / author a book is filed under is not part of its reference
      if (ROOT_TYPES.includes(a.type)) continue;
      titles.set(a.id, { title: entityTitle(a.text), parent: a.parents[0] });
    }
    pending = [
      ...new Set(
        ancestors
          .map((a) => a.parents[0])
          .filter((id) => id && !titles.has(id)),
      ),
    ];
  }

  const annotations = await db.entityAnnotation.findMany({
    where: { entityId: { in: rows.map((r) => r.id) } },
    orderBy: { order: "asc" },
  });

  return rows.map((row) => {
    const path: string[] = [];
    let cursor = row.parents[0];
    for (let i = 0; cursor && titles.has(cursor) && i < 4; i++) {
      path.unshift(titles.get(cursor)!.title);
      cursor = titles.get(cursor)!.parent ?? "";
    }
    const isLeaf = entityChildTypes(row.type).length === 0;
    path.push(isLeaf ? String(row.order + 1) : entityTitle(row.text));
    return {
      id: row.id,
      type: row.type,
      parentId: row.parents[0] ?? null,
      reference: path.join(" › "),
      text: clip(pickLanguage(row.text, ["SAN", "TEL", "IAST", "ENG"])),
      meaning: clip(pickLanguage(row.meaning, ["ENG", "TEL", "SAN"])),
      notes: annotations
        .filter(
          (a) =>
            a.entityId === row.id &&
            (!annotationKind(a.kind)?.private || a.userId === userId),
        )
        .map((a) =>
          clip(
            `${annotationKind(a.kind)?.label ?? a.kind}${a.title ? ` (${a.title})` : ""}: ${a.text}`,
          ),
        ),
    };
  });
}

export type Scope = {
  /** null means the whole library */
  entity: { id: string; type: string; title: string } | null;
  /** Total items directly readable in this scope. */
  itemCount: number;
  /** Set when the scope is small enough to be read whole. */
  full: Passage[] | null;
  containerIds: string[] | null;
};

/** Resolves what "within this book / chapter / verse" covers. */
export async function resolveScope(
  entityId: string | null,
  userId: string,
): Promise<Scope> {
  if (!entityId) {
    return { entity: null, itemCount: -1, full: null, containerIds: null };
  }
  const entity = await db.entity.findUnique({
    where: { id: entityId },
    select: PASSAGE_SELECT,
  });
  if (!entity) throw new Error("The selected content no longer exists");
  const info = {
    id: entity.id,
    type: entity.type,
    title: entityTitle(entity.text),
  };

  // a single verse: the verse itself is the whole context
  if (entityChildTypes(entity.type).length === 0) {
    return {
      entity: info,
      itemCount: 1,
      full: await withReferences([entity], userId),
      containerIds: null,
    };
  }

  const containerIds = await containerIdsUnder(entityId);
  const itemCount = await countChildren(containerIds);
  if (itemCount > FULL_CONTEXT_MAX_ITEMS) {
    return { entity: info, itemCount, full: null, containerIds };
  }
  const rows = await db.entity.findMany({
    where: { id: { in: await childIds(containerIds) } },
    select: PASSAGE_SELECT,
  });
  // reading order: by container (in discovery order), then position
  const rank = new Map(containerIds.map((id, i) => [id, i]));
  rows.sort(
    (a, b) =>
      (rank.get(a.parents[0]) ?? 0) - (rank.get(b.parents[0]) ?? 0) ||
      a.order - b.order,
  );
  return {
    entity: info,
    itemCount,
    full: await withReferences(rows, userId),
    containerIds,
  };
}

/**
 * Finds the passages most relevant to a set of keywords inside a scope.
 * Text is stored in several scripts, so a keyword in Devanagari, Telugu,
 * IAST or plain English (against meanings) can all match.
 */
export async function searchPassages(
  keywords: string[],
  containerIds: string[] | null,
  userId: string,
): Promise<Passage[]> {
  const rows = await searchPassageRows(keywords, containerIds);
  return withReferences(
    rows.map((r) => r.row),
    userId,
  );
}

/** The keyword search behind `searchPassages`, with its match counts. */
export async function searchPassageRows(
  keywords: string[],
  containerIds: string[] | null,
  limit = RETRIEVED_PASSAGES,
): Promise<{ row: PassageRow; score: number }[]> {
  const terms = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))]
    .filter((k) => k.length >= 2)
    .slice(0, MAX_KEYWORDS);
  if (terms.length === 0) return [];

  const scope = containerIds ? { parents: { hasSome: containerIds } } : {};
  const perKeyword = await Promise.all(
    terms.map((term) => {
      const contains = { contains: term, mode: "insensitive" as const };
      return db.entity.findMany({
        where: {
          ...scope,
          OR: [
            { text: { some: { value: contains } } },
            { meaning: { some: { value: contains } } },
          ],
        },
        take: PER_KEYWORD_LIMIT,
        select: PASSAGE_SELECT,
      });
    }),
  );

  // rank by how many different keywords a passage matches
  const scored = new Map<string, { row: PassageRow; score: number }>();
  for (const rows of perKeyword) {
    for (const row of rows) {
      const entry = scored.get(row.id) ?? { row, score: 0 };
      entry.score++;
      scored.set(row.id, entry);
    }
  }
  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** The children of one container, in reading order. */
async function orderedChildren(
  containerId: string,
  leaves: boolean,
): Promise<{ id: string; order: number }[]> {
  const rows = (await db.entity.aggregateRaw({
    pipeline: [
      {
        $match: {
          parents: { $in: [{ $oid: containerId }] },
          type: leaves ? { $nin: CONTAINER_TYPES } : { $in: CONTAINER_TYPES },
        },
      },
      { $sort: { order: 1 } },
      { $project: { _id: 1, order: 1 } },
    ],
  })) as unknown as { _id: { $oid: string }; order?: number }[];
  return rows.map((row) => ({
    id: row._id.$oid,
    order: Number(row.order ?? 0),
  }));
}

export type PositionalPassages = {
  passages: Passage[];
  /** how many verses the section they were read from holds, when known */
  total: number | null;
  /** more were asked for than can be given to the model at once */
  truncated: boolean;
};

/** What earlier turns of a chat read, for "the next 10" and "those verses". */
export type PreviousSources = {
  /** passages of the latest turn that had any */
  last: string[];
  /** passages of the latest turn that read verses by position */
  positional: string[];
};

/** Reads the given verses, in the order given. */
async function readVerses(ids: string[], userId: string): Promise<Passage[]> {
  const rows = (await db.entity.findMany({
    where: { id: { in: ids } },
    select: PASSAGE_SELECT,
  })) as PassageRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return withReferences(
    ids
      .map((id) => byId.get(id))
      .filter(
        (row): row is PassageRow =>
          !!row && entityChildTypes(row.type).length === 0,
      ),
    userId,
  );
}

/**
 * Follows chapter numbers down from a scope, counting in reading order:
 * [2, 5] in a book is the 5th chapter of its 2nd part (-1: the last one). Null when the scope has no
 * such chapter — the numbers then say something else, or the scope already
 * is that chapter.
 */
export async function narrowScope(
  scopeId: string,
  path: number[],
): Promise<string | null> {
  let containerId = scopeId;
  for (const n of path) {
    const containers = await orderedChildren(containerId, false);
    // counted in reading order: stored `order` starts at 0 in some books
    // and at 1 in others
    const picked = containers[n === -1 ? containers.length - 1 : n - 1];
    if (!picked) return null;
    containerId = picked.id;
  }
  return containerId;
}

/** "The next 10", "the previous verse", "the rest", "those verses". */
async function relativePassages(
  request: RelativePosition,
  previous: PreviousSources,
  userId: string,
): Promise<PositionalPassages | null> {
  if (request.kind === "same") {
    if (previous.last.length === 0) return null;
    const passages = await readVerses(
      previous.last.slice(0, FULL_CONTEXT_MAX_ITEMS),
      userId,
    );
    return passages.length > 0
      ? { passages, total: null, truncated: false }
      : null;
  }
  const read = previous.positional;
  if (read.length === 0) return null;
  // the section the earlier verses ended (or, going back, began) in
  const edge = await db.entity.findUnique({
    where: {
      id: request.kind === "previous" ? read[0] : read[read.length - 1],
    },
    select: { parents: true },
  });
  if (!edge?.parents[0]) return null;
  const leaves = await orderedChildren(edge.parents[0], true);
  const picked = selectRelative(
    leaves,
    new Set(read),
    request,
    FULL_CONTEXT_MAX_ITEMS,
  );
  if (!picked) return null;
  return {
    passages: await readVerses(
      picked.items.map((item) => item.id),
      userId,
    ),
    total: leaves.length,
    truncated: picked.truncated,
  };
}

/**
 * Reads verses by where they are in a scope ("the first 10", "verses 5 to
 * 12", "the next 10") rather than by what they say. In a scope that holds
 * chapters rather than verses, "first" and "last" are read from its first /
 * last chapter; verse numbers are ambiguous there, so null is returned. Null
 * also when the scope has no such verses, or there is nothing earlier for
 * "next" to follow. No passages at all means the earlier verses were already
 * at the edge of their section.
 */
export async function positionalPassages(
  scopeId: string,
  request: PositionRequest,
  userId: string,
  previous?: PreviousSources,
): Promise<PositionalPassages | null> {
  if (isRelative(request)) {
    return previous ? relativePassages(request, previous, userId) : null;
  }
  let containerId = scopeId;
  for (let depth = 0; depth < 5; depth++) {
    const leaves = await orderedChildren(containerId, true);
    if (leaves.length > 0) {
      const picked = selectPositions(leaves, request, FULL_CONTEXT_MAX_ITEMS);
      if (picked.items.length === 0) return null;
      return {
        passages: await readVerses(
          picked.items.map((item) => item.id),
          userId,
        ),
        total: leaves.length,
        truncated: picked.truncated,
      };
    }
    if (request.kind === "numbers") return null;
    const containers = await orderedChildren(containerId, false);
    if (containers.length === 0) return null;
    containerId = (
      request.kind === "first"
        ? containers[0]
        : containers[containers.length - 1]
    ).id;
  }
  return null;
}
