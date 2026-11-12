import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodesChange,
  type OnEdgesChange,
  type XYPosition,
} from "@xyflow/react";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { nanoid } from "nanoid/non-secure";
import {
  LAYOUT,
  findClearOffset,
  layoutAll,
  layoutResults,
  rectOf,
  sizeOf,
  type Point,
} from "./layout";
import type { GraphData, SansPlayData } from "./results";
import { defaultSplitterNodeData } from "./sans-play-splitter-node";
import { defaultParserNodeData } from "./sans-play-parser-node";
import { defaultJoinerNodeData } from "./sans-play-joiner-node";
import { defaultWordTaggerNodeData } from "./sans-play-word-tagger-node";
import { defaultTransliterateNodeData } from "./sans-play-transliterate-node";
import { defaultSegmenterNodeData } from "./sans-play-segmenter-node";
import { defaultPhoneticNodeData } from "./sans-play-phonetic-node";
import { defaultDictionaryNodeData } from "./sans-play-dictionary-node";

export type NodeType =
  | "sentenceParse"
  | "sandhiSplit"
  | "sandhiJoin"
  | "wordTagger"
  | "transliterate"
  | "segmenter"
  | "phoneticSearch"
  | "dictionary"
  | "textInput"
  | "sansPlay";

interface NodeTypeConfig {
  type: NodeType;
  defaultData: Record<string, unknown>;
}

export interface TypedNodeParams {
  /** Where the middle of the new node should be, in flow coordinates */
  center?: XYPosition;
  data?: Record<string, unknown>;
}

// Node type configurations map
const nodeTypeConfigs: Record<string, NodeTypeConfig> = {
  parser: { type: "sentenceParse", defaultData: defaultParserNodeData },
  splitter: { type: "sandhiSplit", defaultData: defaultSplitterNodeData },
  joiner: { type: "sandhiJoin", defaultData: defaultJoinerNodeData },
  wordTagger: { type: "wordTagger", defaultData: defaultWordTaggerNodeData },
  transliterate: {
    type: "transliterate",
    defaultData: defaultTransliterateNodeData,
  },
  segmenter: { type: "segmenter", defaultData: defaultSegmenterNodeData },
  phoneticSearch: {
    type: "phoneticSearch",
    defaultData: defaultPhoneticNodeData,
  },
  dictionary: { type: "dictionary", defaultData: defaultDictionaryNodeData },
  textInput: { type: "textInput", defaultData: { text: "" } },
};

const ownerOf = (node: Node) =>
  (node.data as Partial<SansPlayData>).ownerId as string | undefined;

const moveTo = (nodes: Node[], positions: Map<string, Point>) =>
  nodes.map((node) =>
    positions.has(node.id)
      ? { ...node, position: positions.get(node.id)! }
      : node,
  );

/** Drops the result nodes of the given tools, and every edge left dangling */
function withoutResultsOf(
  owners: Set<string>,
  nodes: Node[],
  edges: Edge[],
): GraphData {
  const kept = nodes.filter((node) => !owners.has(ownerOf(node) ?? ""));
  const ids = new Set(kept.map((node) => node.id));
  return {
    nodes: kept,
    edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
  };
}

/** Results of `ownerId` laid out beside it, the rest of the canvas untouched */
function placeResults(ownerId: string, nodes: Node[], edges: Edge[]): Node[] {
  const owner = nodes.find((node) => node.id === ownerId);
  if (!owner) return nodes;
  const members = nodes.filter((node) => ownerOf(node) === ownerId);
  const others = nodes.filter(
    (node) => node.id !== ownerId && ownerOf(node) !== ownerId,
  );
  return moveTo(nodes, layoutResults(owner, members, edges, others));
}

export type RFState = {
  nodes: Node[];
  edges: Edge[];
  /** Tools whose fresh results still wait to be measured and aligned */
  pendingLayout: string[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  /** Adds a tool; returns the id of the new node */
  addTypedNode: (
    nodeTypeKey: string,
    params: TypedNodeParams,
  ) => string | undefined;
  /** Replaces the results shown for a tool */
  setResults: (ownerId: string, graph: GraphData) => void;
  /** Removes the results shown for a tool */
  removeChildNodes: (ownerId: string) => void;
  /** Aligns freshly measured results; returns the nodes worth framing */
  layoutPending: () => string[];
  /** Re-arranges the whole canvas */
  tidy: () => void;
  /**
   * Adds a tool fed by the given node; returns the id of the new node.
   * `defaults` fill in what the source does not say (e.g. its script).
   */
  sendToTool: (
    sourceId: string,
    nodeTypeKey: string,
    defaults?: Record<string, unknown>,
  ) => string | undefined;
  /** The canvas as plain data, fit to be stored */
  snapshot: () => GraphData;
  /** Replaces the canvas with a stored one */
  loadGraph: (graph: GraphData) => void;
  selectNode: (nodeId: string | null) => void;
  clearAll: () => void;
};

/** True once every result waiting for alignment has a measured size */
export const selectLayoutReady = (state: RFState) =>
  state.pendingLayout.length > 0 &&
  state.nodes.every(
    (node) =>
      !state.pendingLayout.includes(ownerOf(node) ?? "") ||
      Boolean(node.measured?.width && node.measured?.height),
  );

export const createSansPlayStore = () =>
  createStore<RFState>()((set, get) => ({
  nodes: [],
  edges: [],
  pendingLayout: [],
  onConnect: (connection) => {
    const newEdge: Edge = {
      id: nanoid(),
      ...connection,
      type: connection.targetHandle === "text" ? "sansPlayDeletable" : "sansPlay",
    };
    set({ edges: [...get().edges, newEdge] });
  },
  onNodesChange: (changes: NodeChange[]) => {
    const nodes = applyNodeChanges(changes, get().nodes);
    const removed = new Set(
      changes.filter((c) => c.type === "remove").map((c) => c.id),
    );
    if (removed.size === 0) {
      set({ nodes });
      return;
    }
    // a tool takes its results with it
    set({
      ...withoutResultsOf(removed, nodes, get().edges),
      pendingLayout: get().pendingLayout.filter((id) => !removed.has(id)),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  addTypedNode: (nodeTypeKey, { center, data }) => {
    const config = nodeTypeConfigs[nodeTypeKey];
    if (!config) {
      console.error(`Node type configuration not found for key: ${nodeTypeKey}`);
      return undefined;
    }

    const newNode: Node = {
      id: nanoid(),
      type: config.type,
      data: { ...config.defaultData, ...data },
      position: { x: 0, y: 0 },
    };
    // centre it where asked, then slide down past anything already there
    const size = sizeOf(newNode);
    const position = {
      x: (center?.x ?? 0) - size.width / 2,
      y: (center?.y ?? 0) - size.height / 2,
    };
    position.y += findClearOffset(
      { ...position, ...size },
      get().nodes.map(rectOf),
      "down",
    );
    newNode.position = position;

    set({ nodes: [...get().nodes, newNode] });
    return newNode.id;
  },
  clearAll: () => set({ nodes: [], edges: [], pendingLayout: [] }),
  removeChildNodes: (ownerId) => {
    set({
      ...withoutResultsOf(new Set([ownerId]), get().nodes, get().edges),
      pendingLayout: get().pendingLayout.filter((id) => id !== ownerId),
    });
  },
  setResults: (ownerId, graph) => {
    const cleared = withoutResultsOf(
      new Set([ownerId]),
      get().nodes,
      get().edges,
    );
    const pendingLayout = get().pendingLayout.filter((id) => id !== ownerId);
    if (
      graph.nodes.length === 0 ||
      !cleared.nodes.some((node) => node.id === ownerId)
    ) {
      set({ ...cleared, pendingLayout });
      return;
    }

    // Placed from estimated sizes now; `layoutPending` aligns them properly
    // once the browser has measured the new nodes.
    const edges = [...cleared.edges, ...graph.edges];
    set({
      nodes: placeResults(ownerId, [...cleared.nodes, ...graph.nodes], edges),
      edges,
      pendingLayout: [...pendingLayout, ownerId],
    });
  },
  layoutPending: () => {
    const { pendingLayout, edges } = get();
    if (pendingLayout.length === 0) return [];
    let nodes = get().nodes;
    for (const ownerId of pendingLayout) {
      nodes = placeResults(ownerId, nodes, edges);
    }
    set({ nodes, pendingLayout: [] });
    return nodes
      .filter(
        (node) =>
          pendingLayout.includes(node.id) ||
          pendingLayout.includes(ownerOf(node) ?? ""),
      )
      .map((node) => node.id);
  },
  tidy: () => {
    const { nodes, edges } = get();
    set({ nodes: moveTo(nodes, layoutAll(nodes, edges)), pendingLayout: [] });
  },
  sendToTool: (sourceId, nodeTypeKey, defaults) => {
    const { nodes, edges } = get();
    const source = nodes.find((node) => node.id === sourceId);
    const config = nodeTypeConfigs[nodeTypeKey];
    if (!source || !config) return undefined;

    const sourceData = source.data as Partial<SansPlayData>;
    const scheme = sourceData.scheme;
    const text = sourceData.text ?? sourceData.label ?? "";
    const newNode: Node = {
      id: nanoid(),
      type: config.type,
      data: {
        ...config.defaultData,
        ...defaults,
        ...(scheme ? { schemeFrom: scheme } : {}),
        // tools that keep the script of their input keep it here as well
        ...(scheme && nodeTypeKey !== "transliterate" ? { schemeTo: scheme } : {}),
        text,
      },
      position: { x: 0, y: 0 },
    };

    // to the right of everything the source's tool produced, level with it
    const block = nodes.filter(
      (node) =>
        node.id === sourceId ||
        (sourceData.ownerId && ownerOf(node) === sourceData.ownerId),
    );
    const right = Math.max(
      ...block.map((node) => node.position.x + sizeOf(node).width),
    );
    const position = { x: right + LAYOUT.columnGap, y: source.position.y };
    position.y += findClearOffset(
      { ...position, ...sizeOf(newNode) },
      nodes.map(rectOf),
      "down",
    );
    newNode.position = position;

    set({
      nodes: [
        ...nodes.map((node) =>
          node.selected ? { ...node, selected: false } : node,
        ),
        newNode,
      ],
      edges: [
        ...edges,
        {
          id: nanoid(),
          source: sourceId,
          target: newNode.id,
          targetHandle: "text",
          type: "sansPlayDeletable",
        },
      ],
    });
    return newNode.id;
  },
  selectNode: (nodeId) => {
    set({
      nodes: get().nodes.map((node) =>
        Boolean(node.selected) === (node.id === nodeId)
          ? node
          : { ...node, selected: node.id === nodeId },
      ),
    });
  },
  snapshot: () => ({
    // only what describes the canvas: no measurements, no selection
    nodes: get().nodes.map(({ id, type, position, data }) => ({
      id,
      type,
      position,
      data,
    })),
    edges: get().edges.map(
      ({ id, source, target, sourceHandle, targetHandle, type, data, markerEnd, selectable }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
        type,
        data,
        markerEnd,
        selectable,
      }),
    ),
  }),
  loadGraph: (graph) => {
    const ids = new Set(graph.nodes.map((node) => node.id));
    set({
      nodes: graph.nodes,
      edges: graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
      pendingLayout: [],
    });
  },
}));

export type SansPlayStore = ReturnType<typeof createSansPlayStore>;

/**
 * The Sanskrit utils page keeps one canvas for the whole session; a playground
 * opened elsewhere (e.g. for a verse) provides its own store instead.
 */
const sharedStore = createSansPlayStore();

export const SansPlayStoreContext = createContext<SansPlayStore>(sharedStore);

export const useSansPlayStoreApi = () => useContext(SansPlayStoreContext);

export default function useSansPlayStore<T>(selector: (state: RFState) => T): T {
  return useStore(useContext(SansPlayStoreContext), selector);
}
