import type { UniverseGraph, UniverseLink, UniverseLinkType } from "./universe";

/**
 * Graph arithmetic for the Universe view, kept free of React and three.js
 * so it can be unit-tested: neighbourhoods, shortest paths, and mapping an
 * AI answer's sources onto whatever the current level of detail shows.
 */

export type LinkFamily = "structure" | "reading" | "mentions" | "relations";

export const LINK_FAMILY: Record<UniverseLinkType, LinkFamily> = {
  CONTAINS: "structure",
  NEXT: "reading",
  MENTIONS: "mentions",
  DEFINES: "mentions",
  DEPICTS: "mentions",
  SPOKEN_BY: "mentions",
  ADDRESSES: "mentions",
  RELATED: "relations",
};

export const LINK_FAMILY_LABEL: Record<LinkFamily, string> = {
  structure: "Book structure",
  reading: "Reading order",
  mentions: "Mentions",
  relations: "Stated relations",
};

/** How a link reads from its source: "Chapter 2 —contains→ 47". */
export const LINK_VERB: Record<UniverseLinkType, [string, string]> = {
  CONTAINS: ["contains", "part of"],
  NEXT: ["followed by", "follows"],
  MENTIONS: ["mentions", "mentioned in"],
  DEFINES: ["teaches", "taught in"],
  DEPICTS: ["depicts", "depicted in"],
  SPOKEN_BY: ["spoken by", "speaks"],
  ADDRESSES: ["addressed to", "addressed in"],
  RELATED: ["", ""],
};

export const linkKey = (link: {
  source: string;
  target: string;
  type: string;
}) => `${link.source}|${link.type}|${link.target}`;

export type Neighbour = { id: string; link: UniverseLink; outgoing: boolean };

export type Adjacency = Map<string, Neighbour[]>;

export const buildAdjacency = (links: UniverseLink[]): Adjacency => {
  const adjacency: Adjacency = new Map();
  const add = (from: string, entry: Neighbour) => {
    const list = adjacency.get(from);
    if (list) list.push(entry);
    else adjacency.set(from, [entry]);
  };
  for (const link of links) {
    add(link.source, { id: link.target, link, outgoing: true });
    add(link.target, { id: link.source, link, outgoing: false });
  }
  return adjacency;
};

export type Emphasis = {
  nodes: Set<string>;
  links: Set<string>;
  /** a path gets heavier links and moving particles */
  path: boolean;
};

/** A node and everything directly connected to it. */
export const neighbourhood = (adjacency: Adjacency, id: string): Emphasis => {
  const nodes = new Set([id]);
  const links = new Set<string>();
  for (const n of adjacency.get(id) ?? []) {
    nodes.add(n.id);
    links.add(linkKey(n.link));
  }
  return { nodes, links, path: false };
};

/** A set of nodes and the links that run between them. */
export const induced = (
  links: UniverseLink[],
  ids: Iterable<string>,
): Emphasis => {
  const nodes = new Set(ids);
  const within = new Set<string>();
  for (const link of links) {
    if (
      link.type !== "NEXT" &&
      nodes.has(link.source) &&
      nodes.has(link.target)
    ) {
      within.add(linkKey(link));
    }
  }
  return { nodes, links: within, path: false };
};

/** Cost of crossing a link: a stated relation is a closer tie than sitting in the same chapter. */
const STEP_COST: Record<LinkFamily, number> = {
  relations: 1,
  mentions: 1.2,
  reading: 2.5,
  structure: 3,
};

export type PathStep = {
  id: string;
  via: UniverseLink | null;
  outgoing: boolean;
};

/**
 * Cheapest path between two nodes (Dijkstra over the undirected graph), or
 * null when they are not connected through the allowed link families.
 */
export const shortestPath = (
  adjacency: Adjacency,
  from: string,
  to: string,
  allowed: (family: LinkFamily) => boolean = () => true,
): PathStep[] | null => {
  if (from === to) return [{ id: from, via: null, outgoing: true }];
  const cost = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, Neighbour & { from: string }>();
  const settled = new Set<string>();
  // a small binary heap keyed by cost
  const heap: [number, string][] = [[0, from]];
  const push = (entry: [number, string]) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  while (heap.length > 0) {
    const [distance, id] = pop();
    if (settled.has(id)) continue;
    settled.add(id);
    if (id === to) break;
    for (const n of adjacency.get(id) ?? []) {
      const family = LINK_FAMILY[n.link.type];
      if (settled.has(n.id) || !allowed(family)) continue;
      const next = distance + STEP_COST[family];
      if (next < (cost.get(n.id) ?? Infinity)) {
        cost.set(n.id, next);
        previous.set(n.id, { ...n, from: id });
        push([next, n.id]);
      }
    }
  }
  if (!previous.has(to)) return null;

  const steps: PathStep[] = [];
  let cursor = to;
  while (cursor !== from) {
    const step = previous.get(cursor)!;
    steps.unshift({ id: cursor, via: step.link, outgoing: step.outgoing });
    cursor = step.from;
  }
  steps.unshift({ id: from, via: null, outgoing: true });
  return steps;
};

export const pathEmphasis = (steps: PathStep[]): Emphasis => ({
  nodes: new Set(steps.map((s) => s.id)),
  links: new Set(steps.filter((s) => s.via).map((s) => linkKey(s.via!))),
  path: true,
});

/**
 * Maps the sources of an AI answer onto nodes that are on screen. A verse
 * that is not drawn at this level of detail is represented by its chapter,
 * and a chapter that is rolled up by the section standing in for it.
 */
export const resolveSources = (
  graph: Pick<UniverseGraph, "nodes" | "rollup">,
  sources: { id: string; parentId?: string | null }[],
): string[] => {
  const present = new Set(graph.nodes.map((n) => n.id));
  const out = new Set<string>();
  for (const source of sources) {
    const candidates = [
      source.id,
      graph.rollup[source.id],
      source.parentId,
      source.parentId ? graph.rollup[source.parentId] : undefined,
    ];
    const hit = candidates.find((id): id is string => !!id && present.has(id));
    if (hit) out.add(hit);
  }
  return [...out];
};
