import {
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodesChange,
  type OnEdgesChange,
  type XYPosition,
  reconnectEdge,
  Connection,
} from "@xyflow/react";
import { create } from "zustand";
import { nanoid } from "nanoid/non-secure";
import { getLayoutedElements, removeChildrenFromGraph } from "./utils";
import { defaultSplitterNodeData } from "./sans-play-splitter-node";
import { defaultParserNodeData } from "./sans-play-parser-node";
import { defaultJoinerNodeData } from "./sans-play-joiner-node";
import { defaultWordTaggerNodeData } from "./sans-play-word-tagger-node";

export type NodeType =
  | "sentenceParse"
  | "sandhiSplit"
  | "sandhiJoin"
  | "wordTagger"
  | "sansPlay";

interface NodeTypeConfig {
  type: NodeType;
  defaultData: any;
}

export interface TypedNodeParams {
  parentId?: string;
  position?: XYPosition;
  data?: Record<string, any>;
}

// Node type configurations map
const nodeTypeConfigs: Record<string, NodeTypeConfig> = {
  parser: {
    type: "sentenceParse",
    defaultData: defaultParserNodeData,
  },
  splitter: {
    type: "sandhiSplit",
    defaultData: defaultSplitterNodeData,
  },
  joiner: {
    type: "sandhiJoin",
    defaultData: defaultJoinerNodeData,
  },
  wordTagger: {
    type: "wordTagger",
    defaultData: defaultWordTaggerNodeData,
  },
};

export type RFState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: any) => void;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  addChildNode: (parentNode: Node, position: XYPosition) => void;
  addChildNodes: (parentNodeId: string, nodes: Node[], edges: Edge[]) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  removeChildNodes: (nodeId: string) => void;
  addTypedNode: (nodeTypeKey: string, params: TypedNodeParams) => void;
  addSansPlayParserNode: ({ parentId, position }: TypedNodeParams) => void;
  addSandhiSplitterNode: ({ parentId, position }: TypedNodeParams) => void;
  addSandhiJoinerNode: ({ parentId, position }: TypedNodeParams) => void;
  addWordTaggerNode: ({ parentId, position }: TypedNodeParams) => void;
};

const useSansPlayStore = create<RFState>((set, get) => ({
  nodes: [
    // {
    //   id: nanoid(),
    //   type: "sentenceParse",
    //   data: defaultParserNodeData,
    //   position: { x: 0, y: -500 },
    // },
    // {
    //   id: nanoid(),
    //   type: "sandhiSplit",
    //   data: defaultSplitterNodeData,
    //   position: { x: 0, y: -300 },
    // },
    // {
    //   id: nanoid(),
    //   type: "sandhiJoin",
    //   data: defaultJoinerNodeData,
    //   position: { x: 0, y: -100 },
    // },
    // {
    //   id: nanoid(),
    //   type: "wordTagger",
    //   data: defaultWordTaggerNodeData,
    //   position: { x: 0, y: 100 },
    // },
  ],
  edges: [],
  onConnect: (params: any) => {
    // console.log("onConnect", params);
    const newEdge = {
      id: nanoid(),
      ...params,
      type: params.targetHandle === "text" ? "sansPlayDeletable" : "smoothstep",
    };
    set({
      edges: [...get().edges, newEdge],
    });
  },
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onReconnect: (oldEdge: Edge, newConnection: Connection) => {
    set({
      edges: reconnectEdge(oldEdge, newConnection, get().edges),
    });
  },
  // Generic method for adding typed nodes
  addTypedNode: (
    nodeTypeKey: string,
    { parentId, position, data }: TypedNodeParams,
  ) => {
    const config = nodeTypeConfigs[nodeTypeKey];
    if (!config) {
      console.error(
        `Node type configuration not found for key: ${nodeTypeKey}`,
      );
      return;
    }

    const newNode = {
      id: nanoid(),
      type: config.type,
      data: { ...config.defaultData, ...data },
      position: position || { x: 0, y: 0 },
      parentId,
    };

    // Only create edge if parentId is provided
    const newEdges = parentId
      ? [
          {
            id: nanoid(),
            source: parentId,
            target: newNode.id,
            type: "smoothstep",
          },
        ]
      : [];

    // // Layout elements
    // const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    //   [...get().nodes, newNode],
    //   [...get().edges, ...newEdges],
    // );

    // // Update state once with all changes
    // set({
    //   nodes: layoutedNodes,
    //   edges: layoutedEdges,
    // });

    set({
      nodes: [...get().nodes, newNode],
      edges: [...get().edges, ...newEdges],
    });
  },
  removeChildNodes: (nodeId: string) => {
    const { nodes, edges } = get();
    const updatedGraph = removeChildrenFromGraph(nodeId, { nodes, edges });
    set({
      nodes: updatedGraph.nodes,
      edges: updatedGraph.edges,
    });
  },
  addWordTaggerNode: (params: TypedNodeParams) => {
    get().addTypedNode("wordTagger", params);
  },
  addSandhiJoinerNode: (params: TypedNodeParams) => {
    get().addTypedNode("joiner", params);
  },
  addSandhiSplitterNode: (params: TypedNodeParams) => {
    get().addTypedNode("splitter", params);
  },
  addSansPlayParserNode: (params: TypedNodeParams) => {
    get().addTypedNode("parser", params);
  },
  addChildNode: (parentNode: Node, position: XYPosition) => {
    const newNode = {
      id: nanoid(),
      type: "sansPlay",
      data: { label: "New Node" },
      position,
      parentId: parentNode.id,
    };

    const newEdge = {
      id: nanoid(),
      source: parentNode.id,
      target: newNode.id,
      type: "smoothstep",
    };

    // const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    //   [...get().nodes, newNode],
    //   [...get().edges, newEdge],
    // );

    // set({
    //   nodes: layoutedNodes,
    //   edges: layoutedEdges,
    // });
    set({
      nodes: [...get().nodes, newNode],
      edges: [...get().edges, newEdge],
    });
  },
  updateNodeLabel: (nodeId: string, label: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // Create a completely new node object to ensure React Flow detects the change
          return {
            ...node,
            data: {
              ...node.data,
              label,
            },
          };
        }

        return node;
      }),
    });
  },
  addChildNodes: (parentNodeId: string, nodes: Node[], edges: Edge[]) => {
    // find the parent node
    const parentNode = get().nodes.find((node) => node.id === parentNodeId);
    if (!parentNode) {
      console.error(`Parent node with id ${parentNodeId} not found`);
      return;
    }
    // find root nodes without parents from edges
    const rootNodes = get().nodes.filter((node) => {
      return !get().edges.some((edge) => edge.target === node.id);
    });

    // Create new nodes and edges
    const newNodes = [...get().nodes, ...nodes];
    const newEdges = [...get().edges, ...edges];

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges,
    );

    set({
      nodes: layoutedNodes,
      edges: layoutedEdges,
    });
    // set({
    //   nodes: [...newNodes],
    //   edges: [...newEdges],
    // });
  },
}));

export default useSansPlayStore;
