import type { Edge, MarkerType, Node } from "@xyflow/react";
import type {
  SentenceParseGraph,
  SentenceParseNode,
  SentenceParseResult,
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
          label: `Split ${splitIndex + 1}`,
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

const signature = (node: SentenceParseNode) =>
  `${node.pada}|${node.root ?? ""}|${(node.tags ?? []).join(",")}`;

/**
 * Sentence parses as dependency trees: the main word of the sentence first,
 * each dependent to its right, the edge naming the relation between them.
 * Every parse is its own tree; several parses each get a heading.
 */
export function buildParseResults(
  ownerId: string,
  results: SentenceParseResult[],
  scheme?: TransliterationScheme,
): GraphData {
  const graph: GraphData = { nodes: [], edges: [] };
  const runId = nextRunId();

  const parses: { title: string; items: SentenceParseGraph[] }[] = [];
  results.forEach((result, resultIndex) => {
    result.analysis?.forEach((analysis, analysisIndex) => {
      if (!analysis?.graph?.length) return;
      const parse = `Parse ${analysisIndex + 1}`;
      parses.push({
        title: results.length > 1 ? `Split ${resultIndex + 1} · ${parse}` : parse,
        items: analysis.graph,
      });
    });
  });

  parses.forEach(({ title, items }, parseIndex) => {
    const prefix = `${runId}-${parseIndex}`;

    // the service can list the same relation twice
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      if (!item?.node?.pada) return false;
      const key = [
        signature(item.node),
        item.predecessor ? signature(item.predecessor) : "",
        item.relation ?? "",
      ].join("||");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let top = ownerId;
    if (parses.length > 1) {
      top = prefix;
      graph.nodes.push(
        resultNode(top, {
          kind: "group",
          label: title,
          text: unique.map((item) => item.node.pada).join(" "),
          ownerId,
          scheme,
        }),
      );
      graph.edges.push(link(ownerId, top));
    }

    // A predecessor is given by value, so find its node by what it says;
    // the word alone is the fallback when the readings differ.
    const bySignature = new Map<string, string>();
    const byPada = new Map<string, string>();
    unique.forEach((item, itemIndex) => {
      const id = `${prefix}-${itemIndex}`;
      if (!bySignature.has(signature(item.node))) bySignature.set(signature(item.node), id);
      if (!byPada.has(item.node.pada)) byPada.set(item.node.pada, id);
    });

    unique.forEach((item, itemIndex) => {
      const id = `${prefix}-${itemIndex}`;
      const found = item.predecessor
        ? (bySignature.get(signature(item.predecessor)) ??
          byPada.get(item.predecessor.pada))
        : undefined;
      const parent = found && found !== id ? found : undefined;
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
