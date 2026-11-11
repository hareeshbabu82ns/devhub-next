import { db } from "@/lib/db";

export type ReadingRef = {
  id: string;
  type: string;
  /** Parent to use in the URL of a verse page. */
  parentId: string | null;
  /** False when the neighbour lives under a different parent (next chapter). */
  sameParent: boolean;
};

// Books hang off these; reading never flows from one book into another.
const ROOT_TYPES = ["GOD", "AUTHOR"];
const MAX_FLOW_DEPTH = 8;

type FlowNode = { id: string; type: string; order: number; parents: string[] };
const FLOW_SELECT = { id: true, type: true, order: true, parents: true };

const adjacentSibling = async (
  node: FlowNode,
  direction: "next" | "prev",
): Promise<FlowNode | null> => {
  const parentId = node.parents[0];
  if (!parentId) return null;
  const forward = direction === "next";
  const cmp = forward ? "gt" : "lt";
  const sort = forward ? "asc" : "desc";
  // Siblings sharing an order are sequenced by id, so look there first. Both
  // lookups are single range scans on the (parents, order) index.
  const tied = await db.entity.findFirst({
    where: {
      parents: { has: parentId },
      order: node.order,
      id: { [cmp]: node.id },
    },
    orderBy: { id: sort },
    select: FLOW_SELECT,
  });
  if (tied) return tied;
  return db.entity.findFirst({
    where: { parents: { has: parentId }, order: { [cmp]: node.order } },
    orderBy: [{ order: sort }, { id: sort }],
    select: FLOW_SELECT,
  });
};

/**
 * The entity that follows (or precedes) `node` in reading order. When `node`
 * is the last of its parent this climbs to the parent's own neighbour and
 * comes back down to the same depth — the last verse of a chapter leads to
 * the first verse of the next chapter. The climb stops at the top of a book:
 * the last verse of one book does not lead into another book.
 */
const readingNeighbour = async (
  node: FlowNode,
  direction: "next" | "prev",
): Promise<ReadingRef | null> => {
  let current = node;
  let depth = 0;
  let found = await adjacentSibling(current, direction);

  while (!found) {
    const parentId = current.parents[0];
    if (!parentId || depth >= MAX_FLOW_DEPTH) return null;
    const parent = await db.entity.findUnique({
      where: { id: parentId },
      select: FLOW_SELECT,
    });
    if (!parent || ROOT_TYPES.includes(parent.type)) return null;
    // `parent` is the book itself when it has no parent or sits directly
    // under a deity / author; its siblings are other books.
    const grandParentId = parent.parents[0];
    const grandParent = grandParentId
      ? await db.entity.findUnique({
          where: { id: grandParentId },
          select: { type: true },
        })
      : null;
    if (!grandParent || ROOT_TYPES.includes(grandParent.type)) return null;
    current = parent;
    depth++;
    found = await adjacentSibling(current, direction);
  }

  const sort = direction === "next" ? "asc" : "desc";
  let result: FlowNode = found;
  for (; depth > 0; depth--) {
    const child: FlowNode | null = await db.entity.findFirst({
      where: { parents: { has: result.id } },
      orderBy: [{ order: sort }, { id: sort }],
      select: FLOW_SELECT,
    });
    if (!child) break; // an empty chapter: land on the chapter itself
    result = child;
  }
  return {
    id: result.id,
    type: result.type,
    parentId: result.parents[0] ?? null,
    sameParent: result.parents[0] === node.parents[0],
  };
};

/** Previous and next entity in reading order, crossing chapter boundaries. */
export async function getReadingNeighbours(
  entityId: string,
): Promise<{ prev: ReadingRef | null; next: ReadingRef | null }> {
  const node = await db.entity.findUnique({
    where: { id: entityId },
    select: FLOW_SELECT,
  });
  if (!node) return { prev: null, next: null };
  const [prev, next] = await Promise.all([
    readingNeighbour(node, "prev"),
    readingNeighbour(node, "next"),
  ]);
  return { prev, next };
}
