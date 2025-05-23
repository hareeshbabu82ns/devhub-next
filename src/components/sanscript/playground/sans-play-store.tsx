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
  MarkerType,
} from "@xyflow/react";
import { create } from "zustand";
import { nanoid } from "nanoid/non-secure";
import { getLayoutedElements, removeChildrenFromGraph } from "./utils";
import { defaultParserNodeData } from "./sans-play-parser-node";

export type RFState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addChildNode: (parentNode: Node, position: XYPosition) => void;
  addChildNodes: (parentNodeId: string, nodes: Node[], edges: Edge[]) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  removeChildNodes: (nodeId: string) => void;
  addSansPlayParserNode: ({
    parentId,
    position,
  }: {
    parentId?: string;
    position?: XYPosition;
  }) => void;
};

const useSansPlayStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
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
  removeChildNodes: (nodeId: string) => {
    const { nodes, edges } = get();
    const updatedGraph = removeChildrenFromGraph(nodeId, { nodes, edges });
    set({
      nodes: updatedGraph.nodes,
      edges: updatedGraph.edges,
    });
  },
  addSansPlayParserNode: ({
    parentId,
    position,
  }: {
    parentId?: string;
    position?: XYPosition;
  }) => {
    // find the parent node
    const parentNode = parentId
      ? get().nodes.find((node) => node.id === parentId)
      : undefined;

    const newNode = {
      id: nanoid(),
      type: "sentenceParse",
      data: { ...defaultParserNodeData },
      position: position || { x: 0, y: 0 },
      parentId,
    };

    const newEdge = {
      id: nanoid(),
      source: parentId || "",
      target: newNode.id,
      type: "smoothstep",
    };

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      [...get().nodes, newNode],
      parentId ? [...get().edges, newEdge] : [...get().edges],
    );

    set({
      nodes: layoutedNodes,
      edges: layoutedEdges,
    });
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

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      [...get().nodes, newNode],
      [...get().edges, newEdge],
    );

    set({
      nodes: layoutedNodes,
      edges: layoutedEdges,
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

    // Create a new edge for each new root nodes
    // rootNodes.forEach( ( rootNode ) => {
    //   const newEdge = {
    //     id: `${parentNode.id}-${rootNode.id}`,
    //     source: parentNode.id,
    //     target: rootNode.id,
    //     type: "smoothstep",
    //     data: { ...rootNode },
    //     markerEnd: { type: MarkerType.ArrowClosed },
    //   };
    //   newEdges.push( newEdge );
    // } );

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      newNodes,
      newEdges,
    );

    set({
      nodes: layoutedNodes,
      edges: layoutedEdges,
    });
  },
}));

export default useSansPlayStore;
