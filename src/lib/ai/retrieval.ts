import { db } from "@/lib/db";
import { annotationKind } from "@/lib/annotations";
import { ENTITY_TYPE_CODES, entityChildTypes } from "@/lib/entity-types";

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

const PASSAGE_SELECT = {
  id: true,
  type: true,
  order: true,
  parents: true,
  text: true,
  meaning: true,
} as const;
type Row = {
  id: string;
  type: string;
  order: number;
  parents: string[];
  text: LangValue[];
  meaning: LangValue[];
};

const CONTAINER_TYPES = ENTITY_TYPE_CODES.filter(
  (t) => entityChildTypes(t).length > 0,
);

const ROOT_TYPES = ["GOD", "AUTHOR"];

const pick = (values: LangValue[], preferred: string[]) => {
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

const title = (text: LangValue[]) =>
  pick(text, ["ENG", "IAST", "SAN", "TEL"]).replace(/\s+/g, " ").slice(0, 80);

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

/** Builds "Book › Chapter › 14" style references for a set of rows. */
async function withReferences(
  rows: Row[],
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
      titles.set(a.id, { title: title(a.text), parent: a.parents[0] });
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
    path.push(isLeaf ? String(row.order + 1) : title(row.text));
    return {
      id: row.id,
      type: row.type,
      parentId: row.parents[0] ?? null,
      reference: path.join(" › "),
      text: clip(pick(row.text, ["SAN", "TEL", "IAST", "ENG"])),
      meaning: clip(pick(row.meaning, ["ENG", "TEL", "SAN"])),
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
  const info = { id: entity.id, type: entity.type, title: title(entity.text) };

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
  const where = { parents: { hasSome: containerIds } };
  const itemCount = await db.entity.count({ where });
  if (itemCount > FULL_CONTEXT_MAX_ITEMS) {
    return { entity: info, itemCount, full: null, containerIds };
  }
  const rows = await db.entity.findMany({ where, select: PASSAGE_SELECT });
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
  const scored = new Map<string, { row: Row; score: number }>();
  for (const rows of perKeyword) {
    for (const row of rows) {
      const entry = scored.get(row.id) ?? { row, score: 0 };
      entry.score++;
      scored.set(row.id, entry);
    }
  }
  const best = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVED_PASSAGES)
    .map((s) => s.row);
  return withReferences(best, userId);
}
