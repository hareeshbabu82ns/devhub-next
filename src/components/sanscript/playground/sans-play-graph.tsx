"use client";

import { Button } from "@/components/ui/button";
import { Background, ConnectionLineType, Controls, NodeOrigin, Panel, ReactFlow } from "@xyflow/react";

import '@xyflow/react/dist/style.css';
import SansPlayNode from "./sans-play-node";
import SansPlayEdge from "./sans-play-edge";
import useStore, { RFState } from "./sans-play-store";
import { useShallow } from "zustand/shallow";
import { useCallback } from "react";
import { useSentenceParse } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { transformSentenceParseToGraphData } from "./utils";


const selector = ( state: RFState ) => ( {
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  addChildNode: state.addChildNode,
  addChildNodes: state.addChildNodes,
} );

const nodeOrigin: NodeOrigin = [ 0.5, 0.5 ];
const connectionLineStyle = { stroke: 'var(--muted-foreground)', strokeWidth: 2 };
const defaultEdgeOptions = { style: connectionLineStyle, type: 'sansPlay' };

const nodeTypes = {
  sansPlay: SansPlayNode,
};

const edgeTypes = {
  sansPlay: SansPlayEdge,
};

export default function SanscriptPlayGraph() {
  const { nodes, edges, onNodesChange, onEdgesChange, addChildNode, addChildNodes } = useStore(
    useShallow( selector ),
  );
  const { parse, isLoading, error } = useSentenceParse();


  const onAddNode = useCallback( () => {
    // addChildNode( nodes[ 0 ], { x: 0, y: 0 } );
    async function parseAction() {
      parse( {
        text: "vāgvidāṃ varam", schemeFrom: TransliterationScheme.IAST,
        // text: "tapaḥsvādhyāyanirataṃ", schemeFrom: TransliterationScheme.IAST,
        schemeTo: TransliterationScheme.IAST, preSegmented: false, limit: 2
        // schemeTo: TransliterationScheme.IAST, preSegmented: false, limit: 2
      }, {
        onSuccess: ( data ) => {
          // console.log( data );
          const { nodes: newNodes, edges: newEdges } = transformSentenceParseToGraphData( "root", data );
          addChildNodes( "root", newNodes, newEdges );
        },
        onError: ( error ) => {
          console.error( error );
        }
      } );
    }
    return parseAction();
  }, [ addChildNode, nodes ] );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      // onConnectStart={onConnectStart}
      // onConnectEnd={onConnectEnd}
      nodeOrigin={nodeOrigin}
      connectionLineStyle={connectionLineStyle}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
    >
      {/* <Controls showInteractive={false} /> */}
      <Panel position="top-left">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onAddNode}>Add Node</Button>
        </div>
      </Panel>
      <Controls style={{ backgroundColor: 'white', color: 'black' }} showInteractive={false} />
      <Background />
    </ReactFlow>
  );
}