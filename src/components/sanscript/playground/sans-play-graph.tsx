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
import { useMemo } from "react";
import SansPlayParserNode from "./sans-play-parser-node";
import TextInputNode from "@/components/graph/TextInputNode";
import SansPlayDeletableEdge from "./sans-play-deletable-edge";
import SansPlaySplitterNode from "./sans-play-splitter-node";
import SansPlayJoinerNode from "./sans-play-joiner-node";
import SansPlayWordTaggerNode from "./sans-play-word-tagger-node";
import { BrainCircuitIcon, MergeIcon, SplitIcon, TagIcon } from "lucide-react";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  onReconnect: state.onReconnect,
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

export default function SanscriptPlayGraph() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onReconnect,
    addSansPlayParserNode,
    addSandhiSplitterNode,
    addSandhiJoinerNode,
    addWordTaggerNode,
  } = useStore(useShallow(selector));

  // Memoize node types to prevent unnecessary re-renders
  const nodeTypes = useMemo(
    () => ({
      sansPlay: SansPlayNode,
      sentenceParse: SansPlayParserNode,
      sandhiSplit: SansPlaySplitterNode,
      sandhiJoin: SansPlayJoinerNode,
      wordTagger: SansPlayWordTaggerNode,
      textInput: TextInputNode,
    }),
    [],
  );

  // Memoize edge types to prevent unnecessary re-renders
  const edgeTypes = useMemo(
    () => ({
      sansPlay: SansPlayEdge,
      sansPlayDeletable: SansPlayDeletableEdge,
    }),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onConnect={onConnect}
      // onReconnect={onReconnect}
      nodeOrigin={nodeOrigin}
      connectionLineStyle={connectionLineStyle}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
    >
      <Panel position="top-left">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => addSansPlayParserNode({})}
            title="Parser"
          >
            <BrainCircuitIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => addSandhiSplitterNode({})}
            title="Splitter"
          >
            <SplitIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => addSandhiJoinerNode({})}
            title="Joiner"
          >
            <MergeIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => addWordTaggerNode({})}
            title="Word Tagger"
          >
            <TagIcon />
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
