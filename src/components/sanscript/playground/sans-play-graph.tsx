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
import SansPlayParserNode from "./sans-play-parser-node";
import TextInputNode from "@/components/graph/TextInputNode";
import SansPlayDeletableEdge from "./sans-play-deletable-edge";
import SansPlaySplitterNode from "./sans-play-splitter-node";
import SansPlayJoinerNode from "./sans-play-joiner-node";
import SansPlayWordTaggerNode from "./sans-play-word-tagger-node";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  addChildNode: state.addChildNode,
  addChildNodes: state.addChildNodes,
  removeChildNodes: state.removeChildNodes,
  addSansPlayParserNode: state.addSansPlayParserNode,
  addSandhiSplitterNode: state.addSandhiSplitterNode,
  addSandhiJoinerNode: state.addSandhiJoinerNode,
  addWordTaggerNode: state.addWordTaggerNode,
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
  sandhiSplit: SansPlaySplitterNode,
  sandhiJoin: SansPlayJoinerNode,
  wordTagger: SansPlayWordTaggerNode,
  textInput: TextInputNode,
};

const edgeTypes = {
  sansPlay: SansPlayEdge,
  sansPlayDeletable: SansPlayDeletableEdge,
};

export default function SanscriptPlayGraph() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addSansPlayParserNode,
    addSandhiSplitterNode,
    addSandhiJoinerNode,
    addWordTaggerNode,
  } = useStore(useShallow(selector));

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onConnect={onConnect}
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
          <Button variant="outline" onClick={() => addSandhiSplitterNode({})}>
            Splitter
          </Button>
          <Button variant="outline" onClick={() => addSandhiJoinerNode({})}>
            Joiner
          </Button>
          <Button variant="outline" onClick={() => addWordTaggerNode({})}>
            WordTags
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
