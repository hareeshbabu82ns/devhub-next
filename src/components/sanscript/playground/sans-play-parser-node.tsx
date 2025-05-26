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
import { useSentenceParse } from "@/hooks/use-sanskrit-utils";
import { transformSentenceParseToGraphData } from "./utils";
import useSansPlayStore, { RFState } from "./sans-play-store";
import { useShallow } from "zustand/shallow";
import { cn } from "@/lib/utils";
import {
  NodeHeader,
  NodeHeaderActions,
  NodeHeaderClearAction,
  NodeHeaderDeleteAction,
  NodeHeaderExecuteAction,
  NodeHeaderIcon,
  NodeHeaderTitle,
} from "@/components/graph/NodeHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import TextInputHandle from "@/components/graph/TextInputHandle";
import { BaseNode } from "@/components/graph/BaseNode";
import { BrainCircuitIcon } from "lucide-react";
import { NodeStatusIndicator } from "@/components/graph/NodeStatusIndicator";

export type SansPlayParserData = {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
  preSegmented: boolean;
  limit: number;
};

export const defaultParserNodeData: SansPlayParserData = {
  // text: "",
  text: "vāgvidāṃ varam",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  preSegmented: false,
  limit: 2,
};

const selector = (state: RFState) => ({
  addChildNodes: state.addChildNodes,
  removeChildNodes: state.removeChildNodes,
});

function SansPlayParserNode({ id, data }: NodeProps<Node<SansPlayParserData>>) {
  const { updateNodeData, fitView } = useReactFlow();
  const { parse, isLoading, error } = useSentenceParse();
  const { addChildNodes, removeChildNodes } = useSansPlayStore(
    useShallow(selector),
  );

  const onParse = useCallback(() => {
    async function parseAction() {
      removeChildNodes(id);
      parse(data, {
        onSuccess: (data) => {
          // console.log( data );
          const { nodes: newNodes, edges: newEdges } =
            transformSentenceParseToGraphData(id, data);
          addChildNodes(id, newNodes, newEdges);
          fitView();
        },
        onError: (error) => {
          console.error(error);
        },
      });
    }
    return parseAction();
  }, [id, data, parse, addChildNodes, removeChildNodes]);

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
            <BrainCircuitIcon />
          </NodeHeaderIcon>
          <NodeHeaderTitle>Parser</NodeHeaderTitle>
          <NodeHeaderActions>
            <NodeHeaderDeleteAction deleteChildren />
            <NodeHeaderClearAction onClick={onClear} />
            <NodeHeaderExecuteAction
              onClick={onParse}
              className={cn(error && "text-red-500")}
            />
          </NodeHeaderActions>
        </NodeHeader>
        <div className="flex flex-col gap-2 px-2 py-3">
          <div className="flex flex-col items-stretch gap-1">
            <Input
              onChange={(evt) => updateNodeData(id, { text: evt.target.value })}
              value={data.text}
              placeholder="sentence to parse..."
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
            <div className="flex justify-between items-center gap-2">
              <div className="flex justify-center items-center gap-2">
                {data.limit}
                <Input
                  id="limit"
                  type="range"
                  min="1"
                  max="10"
                  value={data.limit}
                  className="nodrag"
                  onChange={(e) =>
                    updateNodeData(id, { limit: Number(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preSegmented"
                  checked={data.preSegmented}
                  onCheckedChange={(checked) =>
                    updateNodeData(id, { preSegmented: !!checked })
                  }
                />
                <Label htmlFor="preSegmented">Segmented</Label>
              </div>
            </div>
          </div>
        </div>
        <TextInputHandle id="text" onChange={onTargetChange} />
        <Handle type="source" position={Position.Right} />
      </BaseNode>
    </NodeStatusIndicator>
  );
}

export default SansPlayParserNode;
