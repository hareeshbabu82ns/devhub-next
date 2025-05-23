"use client";

import { Button } from "@/components/ui/button";
import {
  Background,
  ConnectionLineType,
  Controls,
  NodeOrigin,
  Panel,
  ReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import SansPlayNode from "./sans-play-node";
import SansPlayEdge from "./sans-play-edge";
import useStore, { RFState } from "./sans-play-store";
import { useShallow } from "zustand/shallow";
import { useCallback } from "react";
import { useSentenceParse } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { transformSentenceParseToGraphData } from "./utils";
import SansPlayParserNode from "./sans-play-parser-node";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  addChildNode: state.addChildNode,
  addChildNodes: state.addChildNodes,
  removeChildNodes: state.removeChildNodes,
  addSansPlayParserNode: state.addSansPlayParserNode,
});

const nodeOrigin: NodeOrigin = [0.5, 0.5];
const connectionLineStyle = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 2,
};
const defaultEdgeOptions = { style: connectionLineStyle, type: "sansPlay" };

const nodeTypes = {
  sansPlay: SansPlayNode,
  sentenceParse: SansPlayParserNode,
};

const edgeTypes = {
  sansPlay: SansPlayEdge,
};

export default function SanscriptPlayGraph() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    removeChildNodes,
    addSansPlayParserNode,
  } = useStore(useShallow(selector));

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
          <Button variant="outline" onClick={() => addSansPlayParserNode({})}>
            Parser
          </Button>
          <Button variant="outline" onClick={() => removeChildNodes("root")}>
            Remove Children
          </Button>
        </div>
      </Panel>
      <Controls
        style={{ backgroundColor: "white", color: "black" }}
        showInteractive={false}
      />
      <Background />
    </ReactFlow>
  );
}
