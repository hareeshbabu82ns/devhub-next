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
import { getLayoutedElements } from "./utils";


export type RFState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addChildNode: ( parentNode: Node, position: XYPosition ) => void;
  addChildNodes: ( parentNodeId: string, nodes: Node[], edges: Edge[] ) => void;
  updateNodeLabel: ( nodeId: string, label: string ) => void;
};

const useSansPlayStore = create<RFState>( ( set, get ) => ( {
  nodes: [
    {
      id: "root",
      type: "sansPlay",
      data: { label: "Splits" },
      position: { x: 0, y: 0 },
    },
    {
      id: "s1",
      type: "sansPlay",
      data: { label: "Split1" },
      position: { x: 0, y: 0 },
      parentId: "root",
    },
    {
      id: "s2",
      type: "sansPlay",
      data: { label: "Split2" },
      position: { x: 0, y: 0 },
      parentId: "root",
    },
  ],
  edges: [
    {
      id: "e1",
      source: "root",
      target: "s1",
      type: "smoothstep",
    },
    {
      id: "e2",
      source: "root",
      target: "s2",
      type: "smoothstep",
    },
  ],
  onNodesChange: ( changes: NodeChange[] ) => {
    set( {
      nodes: applyNodeChanges( changes, get().nodes ),
    } );
  },
  onEdgesChange: ( changes: EdgeChange[] ) => {
    set( {
      edges: applyEdgeChanges( changes, get().edges ),
    } );
  },
  addChildNode: ( parentNode: Node, position: XYPosition ) => {
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
      [ ...get().nodes, newNode ],
      [ ...get().edges, newEdge ],
    );

    set( {
      nodes: layoutedNodes,
      edges: layoutedEdges,
    } );
  },
  updateNodeLabel: ( nodeId: string, label: string ) => {
    set( {
      nodes: get().nodes.map( ( node ) => {
        if ( node.id === nodeId ) {
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
      } ),
    } );
  },
  addChildNodes: ( parentNodeId: string, nodes: Node[], edges: Edge[] ) => {
    // find the parent node
    const parentNode = get().nodes.find( ( node ) => node.id === parentNodeId );
    if ( !parentNode ) {
      console.error( `Parent node with id ${parentNodeId} not found` );
      return;
    }
    // find root nodes without parents from edges
    const rootNodes = get().nodes.filter( ( node ) => {
      return !get().edges.some( ( edge ) => edge.target === node.id );
    } );

    // Create new nodes and edges
    const newNodes = [ ...get().nodes, ...nodes ];
    const newEdges = [ ...get().edges, ...edges ];

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

    set( {
      nodes: layoutedNodes,
      edges: layoutedEdges,
    } );
  },
} ) );

export default useSansPlayStore;
