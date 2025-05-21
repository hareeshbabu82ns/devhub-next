"use client";

import { useEffect } from "react";
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
  ColorMode,
} from '@xyflow/react';
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";


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

// Transform parse results into graph data
function transformToGraphData( parseResult: SentenceParseResult ): GraphData {
  // Initialize data structure for the graph
  const graphData: GraphData = {
    nodes: [],
    edges: [],
  };

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
        position: { x: Math.random() * 800, y: Math.random() * 500 }, // Random position for demo
        // position: { x: 0, y: 0 }, // Centered position for demo
        data: { label: item.node.pada, ...item },
        style: {
          backgroundColor: item.predecessor ? 'var(--color-secondary)' : 'var(--color-primary)',
          color: item.predecessor ? 'var(--secondary-foreground)' : 'var(--primary-foreground)'
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
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

  return graphData;
}

export function SentenceParseGraphView( {
  parseResults,
  selectedResultIndex,
}: SentenceParseGraphViewProps ) {

  const { theme } = useTheme();

  const [ nodes, setNodes, onNodesChange ] = useNodesState<Node>( [] );
  const [ edges, setEdges, onEdgesChange ] = useEdgesState<Edge>( [] );

  // const onConnect = useCallback( ( params ) => setEdges( ( eds ) => addEdge( params, eds ) ), [ setEdges ] );


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
        // colorMode={( theme || 'system' ) as ColorMode}
        // onConnect={onConnect}
        fitView
      >
        <MiniMap style={{ backgroundColor: 'var(--color-bg-card)' }} />
        <Controls style={{ color: 'var(--secondary-foreground)' }} />
        <Background />
      </ReactFlow>
    </div>

  );
}