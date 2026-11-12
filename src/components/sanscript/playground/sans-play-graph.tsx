"use client";

import { Button } from "@/components/ui/button";
import {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
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
import SansPlayTransliterateNode from "./sans-play-transliterate-node";
import SansPlaySegmenterNode from "./sans-play-segmenter-node";
import SansPlayPhoneticNode from "./sans-play-phonetic-node";
import SansPlayDictionaryNode from "./sans-play-dictionary-node";
import {
  AudioLinesIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  LanguagesIcon,
  MergeIcon,
  ScissorsIcon,
  SplitIcon,
  TagIcon,
  Trash2Icon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useSanscriptUtilsVersion } from "@/hooks/use-sanskrit-utils";
import {
  LANGUAGE_TRANS_SCHEME_MAP,
  TransliterationScheme,
} from "@/types/sanscript";
import DevTools from "@/components/graph/DevTools";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  addTypedNode: state.addTypedNode,
  clearAll: state.clearAll,
});

const nodeOrigin: NodeOrigin = [0.5, 0.5];
const connectionLineStyle = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 2,
};
const defaultEdgeOptions = { style: connectionLineStyle, type: "sansPlay" };

/**
 * One button per capability of the sanscript-utils service.
 * `schemes` says whether the node takes the app language as its scheme.
 */
const TOOLS: {
  key: string;
  title: string;
  icon: LucideIcon;
  schemes: "both" | "output" | "none";
}[] = [
  { key: "textInput", title: "Text", icon: TypeIcon, schemes: "none" },
  { key: "parser", title: "Sentence Parser", icon: BrainCircuitIcon, schemes: "both" },
  { key: "splitter", title: "Sandhi Splitter", icon: SplitIcon, schemes: "both" },
  { key: "joiner", title: "Sandhi Joiner", icon: MergeIcon, schemes: "both" },
  { key: "wordTagger", title: "Word Tagger", icon: TagIcon, schemes: "both" },
  { key: "segmenter", title: "Word Segmenter", icon: ScissorsIcon, schemes: "both" },
  { key: "transliterate", title: "Transliterate", icon: LanguagesIcon, schemes: "output" },
  { key: "phoneticSearch", title: "Phonetic Search", icon: AudioLinesIcon, schemes: "output" },
  { key: "dictionary", title: "Dictionary", icon: BookOpenIcon, schemes: "both" },
];

export default function SanscriptPlayGraph() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addTypedNode,
    clearAll,
  } = useStore(useShallow(selector));

  const language = useLanguageAtomValue();
  const schemeLanguage =
    LANGUAGE_TRANS_SCHEME_MAP[language] ?? TransliterationScheme.IAST;

  const service = useSanscriptUtilsVersion();

  // Memoize node types to prevent unnecessary re-renders
  const nodeTypes = useMemo(
    () => ({
      sansPlay: SansPlayNode,
      sentenceParse: SansPlayParserNode,
      sandhiSplit: SansPlaySplitterNode,
      sandhiJoin: SansPlayJoinerNode,
      wordTagger: SansPlayWordTaggerNode,
      transliterate: SansPlayTransliterateNode,
      segmenter: SansPlaySegmenterNode,
      phoneticSearch: SansPlayPhoneticNode,
      dictionary: SansPlayDictionaryNode,
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

  const addTool = (tool: (typeof TOOLS)[number]) => {
    const data =
      tool.schemes === "both"
        ? { schemeFrom: schemeLanguage, schemeTo: schemeLanguage }
        : tool.schemes === "output"
          ? { schemeTo: schemeLanguage }
          : {};
    addTypedNode(tool.key, { data });
  };

  const flowPanel = (
    <Panel
      position="top-left"
      className="flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2"
    >
      {TOOLS.map((tool) => (
        <Button
          key={tool.key}
          variant="outline"
          size="icon"
          onClick={() => addTool(tool)}
          title={`Add ${tool.title}`}
          aria-label={`Add ${tool.title}`}
        >
          <tool.icon />
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        onClick={clearAll}
        disabled={nodes.length === 0}
        title="Clear the playground"
        aria-label="Clear the playground"
      >
        <Trash2Icon />
      </Button>
    </Panel>
  );

  const statusPanel = (
    <Panel position="bottom-center" className="text-xs text-muted-foreground">
      {service.isPending ? (
        "Connecting to Sanskrit utils…"
      ) : service.isError ? (
        <span className="text-destructive">
          Sanskrit utils service is not reachable
        </span>
      ) : (
        `Sanskrit utils ${service.data}`
      )}
    </Panel>
  );

  const emptyHint = nodes.length === 0 && (
    <Panel
      position="top-center"
      className="mt-24 max-w-sm text-center text-sm text-muted-foreground"
    >
      Add a tool from the top left, type some text and press play. Drag from
      a result to another tool&apos;s left handle to feed it in.
    </Panel>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 200px)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        nodeOrigin={nodeOrigin}
        connectionLineStyle={connectionLineStyle}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        maxZoom={4}
        fitView
      >
        {flowPanel}
        {statusPanel}
        {emptyHint}
        <DevTools
          showChangeLogger={false}
          showNodeInspector={false}
          showViewportLogger={false}
        />
        <Controls
          style={{ backgroundColor: "white", color: "black" }}
          showInteractive={false}
        />
        <MiniMap zoomable pannable className="hidden sm:block" />
        <Background />
      </ReactFlow>
    </div>
  );
}
