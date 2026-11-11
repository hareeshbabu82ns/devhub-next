import { db } from "@/lib/db";
import { entityChildTypes } from "@/lib/entity-types";
import {
  childIds,
  countChildren,
  entityTitle,
  pickLanguage,
} from "../retrieval";
import { listContainers } from "./build";
import { mergeRelations } from "./retrieve";
import { conceptKindOf, plainText } from "./text";

/**
 * The graph behind the Universe view: the structure of a scope (books,
 * chapters, verses) joined to the characters, concepts, places and states
 * its knowledge index found.
 *
 * A browser cannot draw a hundred thousand verses, so the level of detail
 * follows the size of the scope: a chapter or a short book shows every
 * verse; a large book shows its chapters, with each chapter linked to what
 * its verses mention (weighted by how often). Opening a chapter then shows
 * its verses.
 */

export type UniverseNodeKind =
  | "container"
  | "verse"
  | "character"
  | "concept"
  | "place"
  | "state"
  | "event";

export type UniverseNode = {
  id: string;
  kind: UniverseNodeKind;
  label: string;
  /** entity type code, for containers and verses */
  entityType?: string;
  parentId?: string | null;
  depth?: number;
  /** the top-level section this belongs to, for colouring by section */
  group?: string;
  /** how many times it is mentioned in this scope (concepts) */
  count?: number;
  description?: string;
  original?: string;
};

export type UniverseLinkType =
  | "CONTAINS"
  | "NEXT"
  | "MENTIONS"
  | "DEFINES"
  | "DEPICTS"
  | "SPOKEN_BY"
  | "ADDRESSES"
  | "RELATED";

export type UniverseLink = {
  source: string;
  target: string;
  type: UniverseLinkType;
  weight: number;
  /** what the passage says, or the stated relation ("son of") */
  label?: string;
};

export type UniverseGraph = {
  scope: { id: string; title: string; type: string } | null;
  /** books/chapters above the scope, outermost first */
  path: { id: string; title: string }[];
  /** node to select on arrival (when the view was opened on a verse) */
  focus: string | null;
  nodes: UniverseNode[];
  links: UniverseLink[];
  /** hidden containers → the shown container that stands for them */
  rollup: Record<string, string>;
  detail: "verses" | "containers";
  stats: {
    containers: number;
    verses: number;
    /** entities of the scope with knowledge-graph data */
    extracted: number;
    concepts: number;
    /** concepts left out because the scope has more than can be drawn */
    conceptsHidden: number;
  };
};

const MAX_CONTAINERS = 600;
const MAX_VERSES = 1500;
const MAX_CONCEPTS = 250;
const MAX_MENTION_LINKS = 6000;
const ID_SLICE = 400;

const snippet = (value: string, max: number) => {
  const text = plainText(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const slices = <T>(items: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

const oid = (value: unknown) =>
  typeof value === "string"
    ? value
    : ((value as { $oid?: string } | null)?.$oid ?? "");

export async function buildUniverse(
  requestedId: string | null,
): Promise<UniverseGraph> {
  let scopeId = requestedId;
  let focus: string | null = null;
  let scope: UniverseGraph["scope"] = null;
  const path: UniverseGraph["path"] = [];

  if (scopeId) {
    let entity = await db.entity.findUnique({
      where: { id: scopeId },
      select: { id: true, type: true, text: true, parents: true },
    });
    if (!entity) throw new Error("The selected content no longer exists");
    // a verse is shown inside its chapter
    if (entityChildTypes(entity.type).length === 0 && entity.parents[0]) {
      focus = entity.id;
      scopeId = entity.parents[0];
      entity = await db.entity.findUnique({
        where: { id: scopeId },
        select: { id: true, type: true, text: true, parents: true },
      });
      if (!entity) throw new Error("The selected content no longer exists");
    }
    scope = {
      id: entity.id,
      type: entity.type,
      title: entityTitle(entity.text),
    };
    let cursor = entity.parents[0];
    for (let depth = 0; cursor && depth < 6; depth++) {
      const parent = await db.entity.findUnique({
        where: { id: cursor },
        select: { id: true, text: true, parents: true },
      });
      if (!parent) break;
      path.unshift({ id: parent.id, title: entityTitle(parent.text) });
      cursor = parent.parents[0];
    }
  }

  // ── structure ──────────────────────────────────────────────────────────
  const containers = await listContainers(scopeId);
  const allIds = containers.map((c) => c.id);
  const byId = new Map(containers.map((c) => [c.id, c]));

  // whole levels are shown, outermost first, while they fit
  const perDepth = new Map<number, number>();
  for (const c of containers)
    perDepth.set(c.depth, (perDepth.get(c.depth) ?? 0) + 1);
  let shownDepth = 0;
  let shownCount = 0;
  for (const depth of [...perDepth.keys()].sort((a, b) => a - b)) {
    const next = shownCount + perDepth.get(depth)!;
    if (depth > 1 && next > MAX_CONTAINERS) break;
    shownDepth = depth;
    shownCount = next;
  }
  const shown = (id: string) => (byId.get(id)?.depth ?? 99) <= shownDepth;
  const rollup: Record<string, string> = {};
  const standIn = (id: string) => {
    let cursor = byId.get(id);
    while (cursor && cursor.depth > shownDepth && cursor.parentId) {
      cursor = byId.get(cursor.parentId);
    }
    return cursor?.id ?? id;
  };
  const groupOf = (id: string) => {
    let cursor = byId.get(id);
    while (cursor && cursor.depth > 1 && cursor.parentId)
      cursor = byId.get(cursor.parentId);
    return cursor?.id ?? id;
  };

  const nodes: UniverseNode[] = [];
  const links: UniverseLink[] = [];
  for (const c of containers) {
    if (!shown(c.id)) {
      rollup[c.id] = standIn(c.id);
      continue;
    }
    nodes.push({
      id: c.id,
      kind: "container",
      label: c.title,
      entityType: c.type,
      parentId: c.parentId,
      depth: c.depth,
      group: groupOf(c.id),
    });
    if (c.parentId) {
      links.push({
        source: c.parentId,
        target: c.id,
        type: "CONTAINS",
        weight: 1,
      });
    }
  }

  const verseCount =
    allIds.length > 0 ? await countChildren(scopeId ? allIds : null, true) : 0;
  const showVerses =
    shownCount === containers.length &&
    verseCount > 0 &&
    verseCount <= MAX_VERSES;

  if (showVerses) {
    const verses = await db.entity.findMany({
      where: { id: { in: await childIds(allIds, true) } },
      select: {
        id: true,
        type: true,
        order: true,
        parents: true,
        text: true,
        meaning: true,
      },
    });
    const siblings = new Map<string, { id: string; order: number }[]>();
    for (const v of verses) {
      const parentId = v.parents.find((id) => byId.has(id)) ?? null;
      const meaning = pickLanguage(v.meaning, ["ENG", "TEL", "SAN"]);
      const text = pickLanguage(v.text, ["SAN", "TEL", "IAST", "ENG"]);
      nodes.push({
        id: v.id,
        kind: "verse",
        label: String(v.order + 1),
        entityType: v.type,
        parentId,
        group: parentId ? groupOf(parentId) : undefined,
        original: snippet(text, 160),
        description: snippet(meaning, 220),
      });
      if (!parentId) continue;
      links.push({
        source: parentId,
        target: v.id,
        type: "CONTAINS",
        weight: 1,
      });
      siblings.set(parentId, [
        ...(siblings.get(parentId) ?? []),
        { id: v.id, order: v.order },
      ]);
    }
    // reading order
    for (const list of siblings.values()) {
      list.sort((a, b) => a.order - b.order);
      for (let i = 1; i < list.length; i++) {
        links.push({
          source: list[i - 1].id,
          target: list[i].id,
          type: "NEXT",
          weight: 1,
        });
      }
    }
  }

  // ── what it is about ───────────────────────────────────────────────────
  type Mention = {
    source: string;
    key: string;
    type: UniverseLinkType;
    weight: number;
    label?: string;
  };
  const mentions: Mention[] = [];
  let extracted = 0;
  const idParts = scopeId ? slices(allIds, ID_SLICE) : [null];

  if (showVerses) {
    const present = new Set(nodes.map((n) => n.id));
    for (const part of idParts) {
      const chunks = await db.ragChunk.findMany({
        where: {
          graphHash: { not: null },
          ...(part ? { parentId: { in: part } } : {}),
        },
        select: { entityId: true, mentions: true },
      });
      extracted += chunks.length;
      for (const chunk of chunks) {
        if (!present.has(chunk.entityId)) continue;
        for (const m of chunk.mentions) {
          mentions.push({
            source: chunk.entityId,
            key: m.key,
            type: m.rel as UniverseLinkType,
            weight: 1,
            label: m.why ?? undefined,
          });
        }
      }
    }
  } else {
    // too many verses to draw: count mentions per chapter in the database
    const merged = new Map<string, Mention>();
    for (const part of idParts) {
      const match = {
        graphHash: { $ne: null },
        ...(part
          ? { parentId: { $in: part.map((id) => ({ $oid: id })) } }
          : {}),
      };
      const [rows, counted] = await Promise.all([
        db.ragChunk.aggregateRaw({
          pipeline: [
            { $match: match },
            { $unwind: "$mentions" },
            {
              $group: {
                _id: { p: "$parentId", k: "$mentions.key" },
                n: { $sum: 1 },
              },
            },
          ],
        }) as unknown as Promise<
          { _id: { p: unknown; k: string }; n: number }[]
        >,
        db.ragChunk.count({
          where: {
            graphHash: { not: null },
            ...(part ? { parentId: { in: part } } : {}),
          },
        }),
      ]);
      extracted += counted;
      for (const row of rows) {
        const source = standIn(oid(row._id.p));
        if (!byId.has(source)) continue;
        const id = `${source}|${row._id.k}`;
        const entry = merged.get(id);
        if (entry) entry.weight += row.n;
        else
          merged.set(id, {
            source,
            key: row._id.k,
            type: "MENTIONS",
            weight: row.n,
          });
      }
    }
    mentions.push(...merged.values());
  }

  // the most mentioned concepts of the scope
  const totals = new Map<string, number>();
  for (const m of mentions)
    totals.set(m.key, (totals.get(m.key) ?? 0) + m.weight);
  const keys = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CONCEPTS)
    .map(([key]) => key);
  const concepts = keys.length
    ? await db.ragConcept.findMany({
        where: { key: { in: keys } },
        select: {
          key: true,
          kind: true,
          label: true,
          original: true,
          description: true,
        },
      })
    : [];
  const conceptKeys = new Set(concepts.map((c) => c.key));
  for (const c of concepts) {
    nodes.push({
      id: c.key,
      kind: conceptKindOf(c.key),
      label: c.label,
      original: c.original ?? "",
      description: c.description,
      count: totals.get(c.key) ?? 0,
    });
  }
  mentions
    .filter((m) => conceptKeys.has(m.key))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_MENTION_LINKS)
    .forEach((m) =>
      links.push({
        source: m.source,
        target: m.key,
        type: m.type,
        weight: m.weight,
        label: m.label,
      }),
    );

  if (conceptKeys.size > 1) {
    const list = [...conceptKeys];
    const relations = await db.ragRelation.findMany({
      where: { from: { in: list }, to: { in: list } },
      select: { from: true, to: true, label: true, parentId: true },
      take: 5000,
    });
    const inScope = scopeId ? new Set(allIds) : null;
    for (const r of mergeRelations(
      relations.filter(
        (r) => !inScope || (!!r.parentId && inScope.has(r.parentId)),
      ),
    )) {
      links.push({
        source: r.from,
        target: r.to,
        type: "RELATED",
        weight: r.weight,
        label: r.label,
      });
    }
  }

  return {
    scope,
    path,
    focus,
    nodes,
    links,
    rollup,
    detail: showVerses ? "verses" : "containers",
    stats: {
      containers: containers.length,
      verses: verseCount,
      extracted,
      concepts: conceptKeys.size,
      conceptsHidden: Math.max(0, totals.size - conceptKeys.size),
    },
  };
}
