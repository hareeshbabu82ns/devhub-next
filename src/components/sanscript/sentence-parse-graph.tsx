"use client";

import { useCallback, useEffect } from "react";
import { SentenceParseResult } from "@/types/sanscript";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
  MarkerType,
  addEdge,
  ConnectionLineType,
} from '@xyflow/react';
import "@xyflow/react/dist/style.css";
import dagre from '@dagrejs/dagre';
import ParseGraphNode from "./ParseGraphNode";
import SentenceParseInputNode from "./SentenceParseInputNode";

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel( () => ( {} ) );

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = ( nodes: Node[], edges: Edge[], direction = 'TB' ) => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph( { rankdir: direction } );

  nodes.forEach( ( node ) => {
    dagreGraph.setNode( node.id, { width: nodeWidth, height: nodeHeight } );
  } );

  edges.forEach( ( edge ) => {
    dagreGraph.setEdge( edge.source, edge.target );
  } );

  dagre.layout( dagreGraph );

  const newNodes = nodes.map( ( node ) => {
    const nodeWithPosition = dagreGraph.node( node.id );
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  } );

  return { nodes: newNodes as Node[], edges };
};

// interface GraphNode {
//   id: string;
//   label: string;
//   root: string;
//   tags: string[];
//   color?: string;
// }

// interface GraphLink {
//   source: string;
//   target: string;
//   label: string;
// }

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface SentenceParseGraphViewProps {
  parseResults: SentenceParseResult[];
  selectedResultIndex: number;
}
const nodeTypes = {
  parseGraphNode: ParseGraphNode,
  sentenceParseInputNode: SentenceParseInputNode,
};

// Transform parse results into graph data
function transformToGraphData( parseResult: SentenceParseResult ): GraphData {
  // Initialize data structure for the graph
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

  // Test: add simple 'tapaḥsvādhyāyanirataṃ'
  graphData.nodes.push( {
    id: 'sentenceParseInputNode', data: { text: '' }, type: 'sentenceParseInputNode',
    position: { x: 0, y: 0 }
  } satisfies Node );

  // Process only the first analysis for simplicity
  if ( !parseResult.analysis || parseResult.analysis.length === 0 ) {
    return graphData;
  }

  const analysis = parseResult.analysis[ 0 ];
  if ( !analysis.graph || analysis.graph.length === 0 ) {
    return graphData;
  }

  // Add all nodes first
  analysis.graph.forEach( ( item ) => {
    if ( item.node && !graphData.nodes.some( ( n ) => n.id === item.node.pada ) ) {
      graphData.nodes.push( {
        id: item.node.pada,
        // position: { x: Math.random() * 800, y: Math.random() * 500 }, // Random position for demo
        position: { x: 0, y: 0 }, // Centered position for demo
        data: { label: item.node.pada, ...item },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
        type: 'parseGraphNode',
      } satisfies Node );
    }
  } );

  // Add edges (relationships)
  analysis.graph.forEach( ( item ) => {
    // Check for both relation (our type) and sambandha (from API)
    if ( item.predecessor ) {
      const relationLabel = item.relation || '';

      graphData.edges.push( {
        id: `${item.node.pada}-${item.predecessor.pada}`,
        source: item.node.pada,
        target: item.predecessor.pada,
        label: relationLabel,
        data: { ...item },
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      } satisfies Edge );
    }
  } );

  // return graphData;

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    graphData.nodes,
    graphData.edges,
  );
  const graphLayoutedData: GraphData = {
    nodes: layoutedNodes,
    edges: layoutedEdges,
  };
  return graphLayoutedData;
}

export function SentenceParseGraphView( {
  parseResults,
  selectedResultIndex,
}: SentenceParseGraphViewProps ) {

  const [ nodes, setNodes, onNodesChange ] = useNodesState<Node>( [] );
  const [ edges, setEdges, onEdgesChange ] = useEdgesState<Edge>( [] );

  // const onConnect = useCallback( ( params ) => setEdges( ( eds ) => addEdge( params, eds ) ), [ setEdges ] );

  const onConnect = useCallback(
    ( params: any ) =>
      setEdges( ( eds ) =>
        addEdge( { ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds ),
      ),
    [],
  );
  const onLayout = useCallback(
    ( direction: any ) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction,
      );

      setNodes( [ ...layoutedNodes ] );
      setEdges( [ ...layoutedEdges ] );
    },
    [ nodes, edges ],
  );

  // Transform data when parse results or selected index change
  useEffect( () => {
    if ( parseResults && parseResults.length > 0 &&
      parseResults[ selectedResultIndex ] ) {
      // console.log( "Processing parse results:", JSON.stringify( parseResults[ selectedResultIndex ], null, 2 ) );

      const data = transformToGraphData( parseResults[ selectedResultIndex ] );
      console.log( "Transformed graph data:", data );

      setNodes( data.nodes );
      setEdges( data.edges );
    } else if ( parseResults && parseResults.length === 0 ) {
      // For demo/development only
      console.log( "No parse results available" );
    }
  }, [ parseResults, selectedResultIndex ] );


  // If there's no data, show a placeholder message
  if ( !parseResults || parseResults.length === 0 ) {
    return <div className="text-center p-4">No parse results available</div>;
  }


  return (
    <div className="flex-1 flex flex-col space-y-2">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodeTypes={nodeTypes}
        // colorMode={( theme || 'system' ) as ColorMode}
        // onConnect={onConnect}
        fitView
      >
        {/* <MiniMap style={{ backgroundColor: 'var(--color-bg-card)' }} /> */}
        <Controls style={{ color: 'var(--secondary-foreground)' }} showInteractive={false} />
        <Background />
      </ReactFlow>
    </div>

  );
}