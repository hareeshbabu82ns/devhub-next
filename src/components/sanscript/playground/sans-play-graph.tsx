"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useShallow } from "zustand/shallow";
import { LayoutDashboardIcon, Trash2Icon } from "lucide-react";

import TextInputNode from "@/components/graph/TextInputNode";
import { Button } from "@/components/ui/button";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useSanscriptUtilsVersion } from "@/hooks/use-sanskrit-utils";
import { cn } from "@/lib/utils";
import {
  LANGUAGE_TRANS_SCHEME_MAP,
  TransliterationScheme,
} from "@/types/sanscript";
import SansPlayDeletableEdge from "./sans-play-deletable-edge";
import SansPlayDetails from "./sans-play-details";
import SansPlayDictionaryNode from "./sans-play-dictionary-node";
import SansPlayEdge from "./sans-play-edge";
import SansPlayJoinerNode from "./sans-play-joiner-node";
import SansPlayNode from "./sans-play-node";
import SansPlayParserNode from "./sans-play-parser-node";
import SansPlayPhoneticNode from "./sans-play-phonetic-node";
import SansPlaySegmenterNode from "./sans-play-segmenter-node";
import SansPlaySplitterNode from "./sans-play-splitter-node";
import useStore, { RFState, selectLayoutReady } from "./sans-play-store";
import { PlayTool, TOOLS, toolbarSchemes } from "./sans-play-tools";
import SansPlayTransliterateNode from "./sans-play-transliterate-node";
import SansPlayWordTaggerNode from "./sans-play-word-tagger-node";

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  addTypedNode: state.addTypedNode,
  sendToTool: state.sendToTool,
  layoutPending: state.layoutPending,
  tidy: state.tidy,
  clearAll: state.clearAll,
});

const connectionLineStyle = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 1.5,
};
const defaultEdgeOptions = { style: connectionLineStyle, type: "sansPlay" };

const nodeTypes = {
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
};

const edgeTypes = {
  sansPlay: SansPlayEdge,
  sansPlayDeletable: SansPlayDeletableEdge,
};

/** Nodes whose text a tool added from the toolbar can be fed with */
const FEEDING_TYPES = ["sansPlay", "textInput"];

const FIT = { duration: 300, padding: 0.15, maxZoom: 1 };

function PlayGraph({ className }: { className?: string }) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addTypedNode,
    sendToTool,
    layoutPending,
    tidy,
    clearAll,
  } = useStore(useShallow(selector));
  const layoutReady = useStore(selectLayoutReady);

  const { fitView, screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  // The theme is only known in the browser; start light like the server does
  const { resolvedTheme } = useTheme();
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  useEffect(
    () => setColorMode(resolvedTheme === "dark" ? "dark" : "light"),
    [resolvedTheme],
  );

  const language = useLanguageAtomValue();
  const schemeLanguage =
    LANGUAGE_TRANS_SCHEME_MAP[language] ?? TransliterationScheme.IAST;

  const service = useSanscriptUtilsVersion();

  /** Brings the given nodes into view once the flow has taken them in */
  const frame = useCallback(
    (ids?: string[]) => {
      setTimeout(
        () => fitView({ ...FIT, nodes: ids?.map((id) => ({ id })) }),
        50,
      );
    },
    [fitView],
  );

  // New results are placed from estimated sizes; as soon as the browser has
  // measured them, align them for real and bring them into view.
  useEffect(() => {
    if (!layoutReady) return;
    const ids = layoutPending();
    if (ids.length > 0) frame(ids);
  }, [layoutReady, layoutPending, frame]);

  const sendTo = (sourceId: string, tool: PlayTool) => {
    const newId = sendToTool(
      sourceId,
      tool.key,
      toolbarSchemes(tool, schemeLanguage),
    );
    if (newId) frame([sourceId, newId]);
  };

  const addTool = (tool: PlayTool) => {
    // with a result or a text selected, the new tool starts out fed by it
    const selected = nodes.filter((node) => node.selected);
    if (
      tool.key !== "textInput" &&
      selected.length === 1 &&
      FEEDING_TYPES.includes(selected[0].type ?? "")
    ) {
      sendTo(selected[0].id, tool);
      return;
    }

    const box = containerRef.current?.getBoundingClientRect();
    const center = box
      ? screenToFlowPosition({
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        })
      : undefined;
    addTypedNode(tool.key, {
      center,
      data: toolbarSchemes(tool, schemeLanguage),
    });
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
      <span className="h-6 w-px bg-border" aria-hidden />
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          tidy();
          frame();
        }}
        disabled={nodes.length < 2}
        title="Tidy up the layout"
        aria-label="Tidy up the layout"
      >
        <LayoutDashboardIcon />
      </Button>
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
      className="mt-28 max-w-sm text-center text-sm text-muted-foreground"
    >
      Add a tool from the top left, type some text and press play. Tap a
      result to see its details and send it on to another tool.
    </Panel>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        connectionLineStyle={connectionLineStyle}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Bezier}
        colorMode={colorMode}
        style={{ backgroundColor: "transparent" }}
        minZoom={0.2}
        maxZoom={4}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      >
        {flowPanel}
        {statusPanel}
        {emptyHint}
        <Controls showInteractive={false} />
        <MiniMap zoomable pannable className="hidden lg:block" />
        <Background />
      </ReactFlow>
      <SansPlayDetails
        onSendTo={(sourceId, toolKey) => {
          const tool = TOOLS.find((t) => t.key === toolKey);
          if (tool) sendTo(sourceId, tool);
        }}
      />
    </div>
  );
}

/**
 * The playground canvas. It works on the store found in
 * `SansPlayStoreContext`: the page-wide one unless a parent provides another.
 */
export default function SanscriptPlayGraph({
  className = "h-[calc(100dvh-200px)] min-h-[420px]",
}: {
  className?: string;
}) {
  return (
    <ReactFlowProvider>
      <PlayGraph className={className} />
    </ReactFlowProvider>
  );
}
