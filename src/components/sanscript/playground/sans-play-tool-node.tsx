"use client";

import React, { useCallback, type ReactNode } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid/non-secure";

import { BaseNode } from "@/components/graph/BaseNode";
import {
  NodeHeader,
  NodeHeaderActions,
  NodeHeaderClearAction,
  NodeHeaderDeleteAction,
  NodeHeaderExecuteAction,
  NodeHeaderIcon,
  NodeHeaderTitle,
} from "@/components/graph/NodeHeader";
import { NodeStatusIndicator } from "@/components/graph/NodeStatusIndicator";
import TextInputHandle from "@/components/graph/TextInputHandle";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TRANSLITERATION_SCHEME_LABELS,
  TRANSLITERATION_SCHEMES,
  TransliterationScheme,
} from "@/types/sanscript";
import useSansPlayStore from "./sans-play-store";
import { connectToParent, createNode, type GraphData } from "./utils";

/** Fields every tool node keeps in its data */
export type SansPlayToolData = {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
};

export function SchemeSelect({
  value,
  onChange,
  label,
}: {
  value: TransliterationScheme;
  onChange: (scheme: TransliterationScheme) => void;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as TransliterationScheme)}
    >
      <SelectTrigger className="nodrag min-w-0 flex-1" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {TRANSLITERATION_SCHEMES.map((scheme) => (
          <SelectItem key={scheme} value={scheme}>
            {TRANSLITERATION_SCHEME_LABELS[scheme]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Input scheme and output scheme side by side */
export function SchemePair({ id, data }: { id: string; data: SansPlayToolData }) {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="flex items-center gap-2">
      <SchemeSelect
        label="Input scheme"
        value={data.schemeFrom}
        onChange={(schemeFrom) => updateNodeData(id, { schemeFrom })}
      />
      <span className="text-muted-foreground" aria-hidden>
        →
      </span>
      <SchemeSelect
        label="Output scheme"
        value={data.schemeTo}
        onChange={(schemeTo) => updateNodeData(id, { schemeTo })}
      />
    </div>
  );
}

export function LimitSlider({
  id,
  limit,
  max = 10,
}: {
  id: string;
  limit: number;
  max?: number;
}) {
  const { updateNodeData } = useReactFlow();
  return (
    <label className="flex flex-1 items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground">
        Results {limit}
      </span>
      <Input
        type="range"
        min="1"
        max={max}
        value={limit}
        className="nodrag px-0"
        onChange={(e) => updateNodeData(id, { limit: Number(e.target.value) })}
      />
    </label>
  );
}

export function NodeCheckbox({
  id,
  field,
  checked,
  label,
  title,
}: {
  id: string;
  field: string;
  checked: boolean;
  label: string;
  title?: string;
}) {
  const { updateNodeData } = useReactFlow();
  const htmlId = `${id}-${field}`;
  return (
    <div className="flex items-center gap-1.5" title={title}>
      <Checkbox
        id={htmlId}
        className="nodrag"
        checked={checked}
        onCheckedChange={(value) => updateNodeData(id, { [field]: !!value })}
      />
      <Label htmlFor={htmlId} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}

/** Turn a flat list of results into child nodes hanging off `parentId` */
export function transformItemsToGraphData(
  parentId: string,
  items: {
    label: string;
    subTitle?: string;
    tags?: string[];
    description?: string;
  }[],
): GraphData {
  const graphData: GraphData = { nodes: [], edges: [] };
  const groupId = nanoid();
  items.forEach((item, index) => {
    if (!item.label) return;
    const node = createNode({ id: `${groupId}-${index}`, data: item });
    graphData.nodes.push(node);
    connectToParent({ graphData, parentId, targetId: node.id });
  });
  return graphData;
}

/** Shared add / clear handlers for a tool node's result nodes */
export function useToolNodeResults(id: string) {
  const addChildNodes = useSansPlayStore((state) => state.addChildNodes);
  const removeChildNodes = useSansPlayStore((state) => state.removeChildNodes);
  const { fitView } = useReactFlow();

  const clearResults = useCallback(
    () => removeChildNodes(id),
    [id, removeChildNodes],
  );
  const showResults = useCallback(
    (graph: GraphData) => {
      addChildNodes(id, graph.nodes, graph.edges);
      // wait for the new nodes to be measured before framing them
      setTimeout(() => fitView({ duration: 300 }), 50);
    },
    [id, addChildNodes, fitView],
  );
  return { clearResults, showResults };
}

interface SansPlayToolNodeProps {
  id: string;
  title: string;
  icon: ReactNode;
  text: string;
  placeholder: string;
  isLoading: boolean;
  error?: Error | null;
  /** Message shown when a run succeeded but produced nothing */
  emptyMessage?: string | null;
  onRun: () => void;
  onClear: () => void;
  /** Separator used when several nodes feed the text handle */
  inputDelimiter?: string;
  /** Max number of nodes that can feed the text handle (-1: unlimited) */
  inputLimit?: number;
  children?: ReactNode;
}

/**
 * Frame shared by every playground tool: header with run / clear / delete,
 * the text field (fed by typing or by connected nodes), the tool's own
 * options, and the outcome of the last run.
 */
export function SansPlayToolNode({
  id,
  title,
  icon,
  text,
  placeholder,
  isLoading,
  error,
  emptyMessage,
  onRun,
  onClear,
  inputDelimiter = " ",
  inputLimit = -1,
  children,
}: SansPlayToolNodeProps) {
  const { updateNodeData } = useReactFlow();

  const onConnectedText = useCallback(
    (value: string) => {
      if (value && value !== text) updateNodeData(id, { text: value });
    },
    [id, updateNodeData, text],
  );

  return (
    <NodeStatusIndicator
      status={isLoading ? "loading" : error ? "error" : "initial"}
    >
      <BaseNode className="w-[300px] p-0">
        <NodeHeader className="border-b rounded-t-md bg-muted text-sidebar-foreground">
          <NodeHeaderIcon>{icon}</NodeHeaderIcon>
          <NodeHeaderTitle>{title}</NodeHeaderTitle>
          <NodeHeaderActions>
            <NodeHeaderDeleteAction deleteChildren />
            <NodeHeaderClearAction onClick={onClear} />
            <NodeHeaderExecuteAction
              onClick={onRun}
              className={cn(error && "text-red-500")}
            />
          </NodeHeaderActions>
        </NodeHeader>
        <div className="flex flex-col gap-2 px-2 py-3">
          <Input
            onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
            onKeyDown={(evt) => {
              if (evt.key === "Enter" && text.trim() && !isLoading) onRun();
            }}
            value={text}
            placeholder={placeholder}
            aria-label={placeholder}
            type="search"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            maxLength={500}
            className="nodrag"
          />
          {children}
          {error && (
            <p className="break-words text-xs text-destructive">
              {error.message}
            </p>
          )}
          {!error && emptyMessage && (
            <p className="text-xs text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
        <TextInputHandle
          id="text"
          onChange={onConnectedText}
          delimiter={inputDelimiter}
          limit={inputLimit}
        />
        <Handle type="source" position={Position.Right} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}
