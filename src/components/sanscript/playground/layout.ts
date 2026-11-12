import type { Edge, Node } from "@xyflow/react";

/**
 * Layout for the playground canvas. Everything flows left to right: a tool,
 * then its results, then whatever those results feed.
 *
 * Positions are top-left corners (React Flow's default node origin), so a
 * column stays left-aligned even while a node's real size is still unknown.
 */

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Rect = Point & Size;

export const LAYOUT = {
  /** Horizontal space between a node and its children */
  columnGap: 64,
  /** Same, when the connecting edges carry a label that has to fit */
  labelledColumnGap: 150,
  /** Vertical space between siblings */
  rowGap: 14,
  /** Vertical space between unrelated trees, and around obstacles */
  blockGap: 40,
};

/** Rendered width of each kind of result node; the node component uses these */
export const RESULT_WIDTH = {
  group: 150,
  word: 200,
  entry: 260,
  text: 260,
} as const;

export type ResultKind = keyof typeof RESULT_WIDTH;

const TOOL_SIZE: Size = { width: 300, height: 240 };
const TEXT_INPUT_SIZE: Size = { width: 200, height: 40 };

const lines = (text: string | undefined, perLine: number) =>
  Math.max(1, Math.ceil((text?.length ?? 0) / perLine));

/** Best guess at a node's size before the browser has measured it */
export function estimateNodeSize(node: Node): Size {
  if (node.type === "textInput") return TEXT_INPUT_SIZE;
  if (node.type !== "sansPlay") return TOOL_SIZE;

  const data = node.data as {
    kind?: ResultKind;
    label?: string;
    root?: string;
    subTitle?: string;
    tags?: string[];
    description?: string;
  };
  const kind = data.kind ?? "word";
  const width = RESULT_WIDTH[kind];
  if (kind === "group") return { width, height: 30 };

  let height = 18 + lines(data.label, kind === "word" ? 16 : 24) * 22;
  if (data.root || data.subTitle) height += 18;
  if (data.tags?.length) height += Math.ceil(Math.min(data.tags.length, 5) / 2) * 22;
  if (data.description) height += Math.min(3, lines(data.description, 40)) * 16 + 4;
  return { width, height };
}

/** Measured size when the node has been rendered, the estimate otherwise */
export function sizeOf(node: Node): Size {
  const estimate = estimateNodeSize(node);
  return {
    width: node.measured?.width ?? estimate.width,
    height: node.measured?.height ?? estimate.height,
  };
}

export const rectOf = (node: Node): Rect => ({ ...node.position, ...sizeOf(node) });

export function boundsOf(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((r) => r.x + r.width)) - x,
    height: Math.max(...rects.map((r) => r.y + r.height)) - y,
  };
}

const overlaps = (a: Rect, b: Rect, gap: number) =>
  a.x < b.x + b.width + gap &&
  b.x < a.x + a.width + gap &&
  a.y < b.y + b.height + gap &&
  b.y < a.y + a.height + gap;

function clearOffsetOneWay(
  block: Rect,
  obstacles: Rect[],
  gap: number,
  direction: 1 | -1,
): number {
  let dy = 0;
  // every pass moves the block past at least one obstacle
  for (let pass = 0; pass <= obstacles.length; pass++) {
    const moved = { ...block, y: block.y + dy };
    const hits = obstacles.filter((o) => overlaps(moved, o, gap));
    if (hits.length === 0) return dy;
    dy =
      direction === 1
        ? Math.max(...hits.map((o) => o.y + o.height + gap)) - block.y
        : Math.min(...hits.map((o) => o.y - gap - block.height)) - block.y;
  }
  return dy;
}

/**
 * Smallest vertical shift that moves `block` clear of every obstacle.
 * `direction` "down" only looks below; "nearest" also tries above.
 */
export function findClearOffset(
  block: Rect,
  obstacles: Rect[],
  direction: "down" | "nearest" = "nearest",
  gap = LAYOUT.blockGap,
): number {
  const down = clearOffsetOneWay(block, obstacles, gap, 1);
  if (direction === "down" || down === 0) return down;
  const up = clearOffsetOneWay(block, obstacles, gap, -1);
  return Math.abs(up) < down ? up : down;
}

const hasLabel = (edge: Edge) =>
  Boolean(edge.label || (edge.data as { label?: string } | undefined)?.label);

type Forest = {
  roots: string[];
  children: Map<string, string[]>;
  /** Nodes reached through an edge that carries a label */
  labelled: Set<string>;
};

/**
 * Reads the edges as a forest. A node with several incoming edges hangs under
 * the first parent that reaches it; cycles are cut the same way. Whatever is
 * not reachable from `roots` becomes a root itself (or a child of
 * `adoptUnder`, when given).
 */
function buildForest(
  ids: string[],
  edges: Edge[],
  roots: string[],
  adoptUnder?: string,
): Forest {
  const known = new Set(ids);
  const outgoing = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge);
  }

  const forest: Forest = { roots: [], children: new Map(), labelled: new Set() };
  const seen = new Set<string>();

  const grow = (root: string) => {
    seen.add(root);
    const queue = [root];
    while (queue.length) {
      const id = queue.shift()!;
      for (const edge of outgoing.get(id) ?? []) {
        if (seen.has(edge.target)) continue;
        seen.add(edge.target);
        if (!forest.children.has(id)) forest.children.set(id, []);
        forest.children.get(id)!.push(edge.target);
        if (hasLabel(edge)) forest.labelled.add(edge.target);
        queue.push(edge.target);
      }
    }
  };

  for (const root of roots) {
    if (seen.has(root) || !known.has(root)) continue;
    forest.roots.push(root);
    grow(root);
  }
  for (const id of ids) {
    if (seen.has(id)) continue;
    if (adoptUnder && known.has(adoptUnder)) {
      if (!forest.children.has(adoptUnder)) forest.children.set(adoptUnder, []);
      forest.children.get(adoptUnder)!.push(id);
    } else {
      forest.roots.push(id);
    }
    grow(id);
  }
  return forest;
}

/**
 * Tidy tree, left to right: each depth is a left-aligned column as wide as
 * its widest node, and every parent is centred on its children.
 * Returns the height of the laid out tree.
 */
function placeTree(
  root: string,
  forest: Forest,
  sizes: Map<string, Size>,
  origin: Point,
  out: Map<string, Point>,
): number {
  const kids = (id: string) => forest.children.get(id) ?? [];
  const size = (id: string) => sizes.get(id)!;

  // column metrics per depth
  const columnWidth: number[] = [];
  const columnLabelled: boolean[] = [];
  const depthOf = new Map<string, number>();
  const walk = (id: string, depth: number) => {
    depthOf.set(id, depth);
    columnWidth[depth] = Math.max(columnWidth[depth] ?? 0, size(id).width);
    if (forest.labelled.has(id)) columnLabelled[depth] = true;
    kids(id).forEach((child) => walk(child, depth + 1));
  };
  walk(root, 0);

  const columnX: number[] = [origin.x];
  for (let depth = 1; depth < columnWidth.length; depth++) {
    const gap = columnLabelled[depth] ? LAYOUT.labelledColumnGap : LAYOUT.columnGap;
    columnX[depth] = columnX[depth - 1] + columnWidth[depth - 1] + gap;
  }

  const heights = new Map<string, number>();
  const childrenHeight = (id: string) =>
    kids(id).reduce((sum, child) => sum + subtreeHeight(child), 0) +
    LAYOUT.rowGap * Math.max(0, kids(id).length - 1);
  const subtreeHeight = (id: string): number => {
    if (!heights.has(id)) {
      heights.set(id, Math.max(size(id).height, childrenHeight(id)));
    }
    return heights.get(id)!;
  };

  const place = (id: string, top: number) => {
    const height = subtreeHeight(id);
    out.set(id, {
      x: columnX[depthOf.get(id)!],
      y: top + (height - size(id).height) / 2,
    });
    let childTop = top + (height - childrenHeight(id)) / 2;
    for (const child of kids(id)) {
      place(child, childTop);
      childTop += subtreeHeight(child) + LAYOUT.rowGap;
    }
  };
  place(root, origin.y);
  return subtreeHeight(root);
}

/**
 * Positions the results of one tool to its right, vertically centred on it,
 * without touching anything else on the canvas. When the results would cover
 * other nodes they slide up or down to the nearest free space.
 */
export function layoutResults(
  owner: Node,
  members: Node[],
  edges: Edge[],
  others: Node[],
): Map<string, Point> {
  const positions = new Map<string, Point>();
  if (members.length === 0) return positions;

  const sizes = new Map<string, Size>([owner, ...members].map((n) => [n.id, sizeOf(n)]));
  const ids = [owner.id, ...members.map((n) => n.id)];
  const forest = buildForest(ids, edges, [owner.id], owner.id);

  // lay out from a zero origin, then move the tree so the owner stays put
  const height = placeTree(owner.id, forest, sizes, { x: 0, y: 0 }, positions);
  const ownerSize = sizes.get(owner.id)!;
  const dx = owner.position.x;
  const dy = owner.position.y + ownerSize.height / 2 - height / 2;
  positions.delete(owner.id);
  for (const point of positions.values()) {
    point.x += dx;
    point.y += dy;
  }

  const block = boundsOf(
    members.map((n) => ({ ...positions.get(n.id)!, ...sizes.get(n.id)! })),
  )!;
  const shift = findClearOffset(block, others.map(rectOf));
  if (shift !== 0) for (const point of positions.values()) point.y += shift;
  return positions;
}

/**
 * Tidies the whole canvas: every chain of tools and results becomes one tree,
 * and the trees are stacked top to bottom in the order they already appear.
 */
export function layoutAll(nodes: Node[], edges: Edge[]): Map<string, Point> {
  const positions = new Map<string, Point>();
  if (nodes.length === 0) return positions;

  const ids = new Set(nodes.map((n) => n.id));
  const fed = new Set(
    edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => e.target),
  );
  const byPosition = [...nodes].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
  );
  const roots = byPosition.filter((n) => !fed.has(n.id)).map((n) => n.id);
  const forest = buildForest(
    byPosition.map((n) => n.id),
    edges,
    roots,
  );
  const sizes = new Map<string, Size>(nodes.map((n) => [n.id, sizeOf(n)]));

  let top = 0;
  for (const root of forest.roots) {
    top += placeTree(root, forest, sizes, { x: 0, y: top }, positions) + LAYOUT.blockGap;
  }
  return positions;
}
