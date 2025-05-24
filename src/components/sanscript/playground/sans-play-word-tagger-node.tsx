"use client";

import React, { useCallback } from "react";
import {
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { TransliterationScheme } from "@/types/sanscript";
import { Input } from "@/components/ui/input";
import { useLanguageTags } from "@/hooks/use-sanskrit-utils";
import useSansPlayStore, { RFState } from "./sans-play-store";
import { useShallow } from "zustand/shallow";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NodeHeader,
  NodeHeaderActions,
  NodeHeaderClearAction,
  NodeHeaderDeleteAction,
  NodeHeaderExecuteAction,
  NodeHeaderIcon,
  NodeHeaderTitle,
} from "@/components/graph/NodeHeader";
import TextInputHandle from "@/components/graph/TextInputHandle";
import { transformWordTaggerToGraphData } from "./sandhi-utils";
import { BaseNode } from "@/components/graph/BaseNode";
import { TagIcon } from "lucide-react";
import { NodeStatusIndicator } from "@/components/graph/NodeStatusIndicator";

export type SansPlayWordTaggerData = {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
};

export const defaultWordTaggerNodeData: SansPlayWordTaggerData = {
  // text: "",
  text: "వాగ్విదాం",
  schemeFrom: TransliterationScheme.TELUGU,
  schemeTo: TransliterationScheme.TELUGU,
};

const selector = (state: RFState) => ({
  addChildNodes: state.addChildNodes,
  removeChildNodes: state.removeChildNodes,
});

function SansPlayWordTaggerNode({
  id,
  data,
}: NodeProps<Node<SansPlayWordTaggerData>>) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const { getTags, isLoading, error } = useLanguageTags();
  const { addChildNodes, removeChildNodes } = useSansPlayStore(
    useShallow(selector),
  );

  const onParse = useCallback(() => {
    async function parseAction() {
      removeChildNodes(id);
      getTags(data, {
        onSuccess: (data) => {
          // console.log(data);
          const { nodes: newNodes, edges: newEdges } =
            transformWordTaggerToGraphData(id, data, { tagsAsNodes: false });
          addChildNodes(id, newNodes, newEdges);
        },
        onError: (error) => {
          console.error(error);
        },
      });
    }
    return parseAction();
  }, [id, data, getTags, addChildNodes, removeChildNodes]);

  const onClear = useCallback(() => {
    removeChildNodes(id);
  }, [id, removeChildNodes]);

  const onTargetChange = useCallback(
    (value: string) => {
      if (value && value !== data.text) {
        updateNodeData(id, { text: value });
      }
    },
    [id, updateNodeData, data.text],
  );

  return (
    <NodeStatusIndicator
      status={isLoading ? "loading" : error ? "error" : "initial"}
    >
      <BaseNode className="p-0 min-w-[300px]">
        <NodeHeader className="border-b rounded-t-md bg-muted text-sidebar-foreground">
          <NodeHeaderIcon>
            <TagIcon />
          </NodeHeaderIcon>
          <NodeHeaderTitle>WordTagger</NodeHeaderTitle>
          <NodeHeaderActions>
            <NodeHeaderDeleteAction deleteChildren />
            <NodeHeaderClearAction onClick={onClear} />
            <NodeHeaderExecuteAction
              onClick={onParse}
              className={cn(error && "text-red-500")}
            />
          </NodeHeaderActions>
        </NodeHeader>
        <div className="flex flex-col gap-2 p-2">
          <div className="flex flex-col items-stretch gap-1">
            <Input
              onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
              value={data.text}
              placeholder="sentence to split..."
              type="search"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              maxLength={100}
              className="nodrag"
            />
            <div className="flex justify-between items-center gap-2">
              <Select
                value={data.schemeFrom}
                onValueChange={(val) =>
                  updateNodeData(id, {
                    schemeFrom: val as TransliterationScheme,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={data.schemeTo}
                onValueChange={(val) =>
                  updateNodeData(id, { schemeTo: val as TransliterationScheme })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TransliterationScheme).map((scheme) => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <TextInputHandle id="text" onChange={onTargetChange} limit={1} />
        <Handle type="source" position={Position.Right} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default SansPlayWordTaggerNode;
