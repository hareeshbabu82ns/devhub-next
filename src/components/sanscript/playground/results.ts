import type { Edge, MarkerType, Node } from "@xyflow/react";
import type {
  SentenceParseGraph,
  SentenceParseNode,
  SentenceParseResult,
  SplitPair,
  TransliterationScheme,
} from "@/types/sanscript";
import type { ResultKind } from "./layout";

/** Turns what the Sanskrit utils service returns into result nodes and edges */

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export type SansPlayData = {
  /** Shown on the node */
  label: string;
  kind: ResultKind;
  /** Tool node that produced this result */
  ownerId: string;
  /** What a connected tool receives; the label when absent */
  text?: string;
  /** 1-based position among its siblings */
  index?: number;
  /** Dictionary form of the word */
  root?: string;
  subTitle?: string;
  tags?: string[];
  /** Longer text, e.g. a dictionary entry (markdown) */
  description?: string;
  /** How the word relates to the word it hangs from */
  relation?: string;
  /** Script the label is written in */
  scheme?: TransliterationScheme;
};

export type ResultItem = Omit<SansPlayData, "ownerId" | "kind" | "scheme"> & {
  kind?: ResultKind;
};

let runCounter = 0;
/** Keeps node ids of separate runs apart */
const nextRunId = () => `r${Date.now().toString(36)}-${runCounter++}`;

function resultNode(id: string, data: SansPlayData): Node {
  return { id, type: "sansPlay", position: { x: 0, y: 0 }, data };
}

function link(source: string, target: string, label?: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: "sansPlay",
    selectable: false,
    data: label ? { label } : undefined,
    markerEnd: { type: "arrowclosed" as MarkerType },
  };
}

/** A flat list of results, each hanging directly off the tool */
export function buildItemResults(
  ownerId: string,
  items: ResultItem[],
  scheme?: TransliterationScheme,
): GraphData {
  const graph: GraphData = { nodes: [], edges: [] };
  const runId = nextRunId();
  items.forEach((item, position) => {
    if (!item.label) return;
    const id = `${runId}-${position}`;
    graph.nodes.push(
      resultNode(id, { kind: "word", ...item, ownerId, scheme }),
    );
    graph.edges.push(link(ownerId, id));
  });
  return graph;
}

/**
 * Sandhi splits: the words of each split in reading order. Several splits
 * each get a heading, which also feeds the whole split to a connected tool.
 */
export function buildSplitResults(
  ownerId: string,
  splits: string[][],
  scheme?: TransliterationScheme,
  /** Heading of the split at the given position */
  titleOf: (splitIndex: number) => string = (splitIndex) =>
    `Split ${splitIndex + 1}`,
): GraphData {
  const graph: GraphData = { nodes: [], edges: [] };
  const runId = nextRunId();
  const filled = splits.filter((words) => words?.length > 0);

  filled.forEach((words, splitIndex) => {
    let parent = ownerId;
    if (filled.length > 1) {
      parent = `${runId}-${splitIndex}`;
      graph.nodes.push(
        resultNode(parent, {
          kind: "group",
          label: titleOf(splitIndex),
          text: words.join(" "),
          ownerId,
          scheme,
        }),
      );
      graph.edges.push(link(ownerId, parent));
    }
    words.forEach((word, wordIndex) => {
      const id = `${runId}-${splitIndex}-${wordIndex}`;
      graph.nodes.push(
        resultNode(id, {
          kind: "word",
          label: word,
          index: wordIndex + 1,
          ownerId,
          scheme,
        }),
      );
      graph.edges.push(link(parent, id));
    });
  });
  return graph;
}

/**
 * Two-part decompositions of one word: each pair under its own heading, the
 * pairs whose parts are both known words marked with a tick.
 */
export function buildPairResults(
  ownerId: string,
  pairs: SplitPair[],
  scheme?: TransliterationScheme,
): GraphData {
  return buildSplitResults(
    ownerId,
    pairs.map((pair) => [pair.left, pair.right]),
    scheme,
    (pairIndex) => `Pair ${pairIndex + 1}${pairs[pairIndex].valid ? " ✓" : ""}`,
  );
}

const PARSE_STATUS_NOTES: Record<string, string> = {
  NO_PARSE: "no parse",
  TIMEOUT: "timed out",
};

/**
 * A split drawn from the relations that are possible between its words,
 * whether or not the parser found an analysis. Unlike a parse this is not a tree: every
 * reading of a word is a node of its own, and a reading has an edge from each
 * reading that could govern it.
 */
function addPossibleRelations(
  graph: GraphData,
  ownerId: string,
  prefix: string,
  title: string,
  result: SentenceParseResult,
  scheme?: TransliterationScheme,
) {
  const rows = (result.possibleRelations ?? []).filter((row) => row?.node?.pada);
  if (rows.length === 0) return;

  const idOf = (node: SentenceParseNode) =>
    `${prefix}-${node.index ?? node.pada}-${node.root ?? ""}`;

  // one node per reading, its tags those of all its rows
  const readings = new Map<string, SansPlayData>();
  for (const { node } of rows) {
    const id = idOf(node);
    const reading = readings.get(id);
    if (reading) {
      reading.tags = [...new Set([...(reading.tags ?? []), ...(node.tags ?? [])])];
    } else {
      readings.set(id, {
        kind: "word",
        label: node.pada,
        index: node.index !== undefined ? node.index + 1 : undefined,
        root: node.root || undefined,
        tags: [...(node.tags ?? [])],
        ownerId,
        scheme,
      });
    }
  }

  // two readings can be related in more than one way: one edge names them all
  const relations = new Map<string, { source: string; target: string; names: string[] }>();
  for (const row of rows) {
    if (!row.predecessor) continue;
    const source = idOf(row.predecessor);
    const target = idOf(row.node);
    if (source === target || !readings.has(source)) continue;
    const key = `${source}->${target}`;
    if (!relations.has(key)) relations.set(key, { source, target, names: [] });
    const names = relations.get(key)!.names;
    if (row.relation && !names.includes(row.relation)) names.push(row.relation);
  }
  const governed = new Set([...relations.values()].map((r) => r.target));

  graph.nodes.push(
    resultNode(prefix, {
      kind: "group",
      label: title,
      subTitle: [
        "possible relations",
        PARSE_STATUS_NOTES[result.status ?? ""],
      ]
        .filter(Boolean)
        .join(" · "),
      text: (result.split ?? []).join(" "),
      ownerId,
      scheme,
    }),
  );
  graph.edges.push(link(ownerId, prefix));

  readings.forEach((data, id) => {
    graph.nodes.push(resultNode(id, data));
    // a reading nothing could govern hangs from the heading
    if (!governed.has(id)) graph.edges.push(link(prefix, id));
  });
  relations.forEach(({ source, target, names }) =>
    graph.edges.push(link(source, target, names.join(" / ") || undefined)),
  );
}

/** Why a parse came back without results, if it did */
export function parseEmptyMessage(
  results: SentenceParseResult[],
  relations = false,
): string {
  if (relations) return "No possible relations found for this sentence";
  return results.some((result) => result.status === "TIMEOUT")
    ? "The parser ran out of time on this sentence"
    : "No parse found for this sentence";
}

/**
 * Sentence parses as dependency trees: the main word of the sentence first,
 * each dependent to its right, the edge naming the relation between them.
 * Every parse is its own tree; several parses each get a heading.
 *
 * With `relations`, each split is instead drawn from the relations that are
 * possible between its words, which exist even for a split without a parse.
 */
export function buildParseResults(
  ownerId: string,
  results: SentenceParseResult[],
  scheme?: TransliterationScheme,
  { relations = false }: { relations?: boolean } = {},
): GraphData {
  const graph: GraphData = { nodes: [], edges: [] };
  const runId = nextRunId();

  if (relations) {
    results.forEach((result, resultIndex) =>
      addPossibleRelations(
        graph,
        ownerId,
        `${runId}-s${resultIndex}`,
        results.length > 1 ? `Split ${resultIndex + 1} · Relations` : "Relations",
        result,
        scheme,
      ),
    );
    return graph;
  }

  const parses: { title: string; cost?: number; items: SentenceParseGraph[] }[] =
    [];
  results.forEach((result, resultIndex) => {
    result.analysis?.forEach((analysis, analysisIndex) => {
      if (!analysis?.graph?.length) return;
      const parse = `Parse ${analysisIndex + 1}`;
      parses.push({
        title: results.length > 1 ? `Split ${resultIndex + 1} · ${parse}` : parse,
        cost: analysis.cost,
        items: analysis.graph,
      });
    });
  });

  parses.forEach(({ title, cost, items }, parseIndex) => {
    const prefix = `${runId}-${parseIndex}`;

    // an analysis has one entry per word, told apart by its place in the split
    const words = new Map<number, SentenceParseGraph>();
    items.forEach((item, itemIndex) => {
      if (!item?.node?.pada) return;
      const position = item.node.index ?? itemIndex;
      if (!words.has(position)) words.set(position, item);
    });
    const idOf = (position: number) => `${prefix}-${position}`;

    let top = ownerId;
    if (parses.length > 1) {
      top = prefix;
      graph.nodes.push(
        resultNode(top, {
          kind: "group",
          label: title,
          subTitle: cost !== undefined ? `cost ${cost}` : undefined,
          text: [...words.values()].map((item) => item.node.pada).join(" "),
          ownerId,
          scheme,
        }),
      );
      graph.edges.push(link(ownerId, top));
    }

    words.forEach((item, position) => {
      const id = idOf(position);
      const head = item.predecessor?.index;
      const parent =
        head !== undefined && head !== position && words.has(head)
          ? idOf(head)
          : undefined;
      const relation = parent ? item.relation || undefined : undefined;

      graph.nodes.push(
        resultNode(id, {
          kind: "word",
          label: item.node.pada,
          root: item.node.root || undefined,
          tags: item.node.tags ?? [],
          relation,
          ownerId,
          scheme,
        }),
      );
      graph.edges.push(link(parent ?? top, id, relation));
    });
  });
  return graph;
}
