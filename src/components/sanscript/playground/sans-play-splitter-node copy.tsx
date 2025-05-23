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
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { useSandhiSplits } from "@/hooks/use-sanskrit-utils";
import { transformSandhiSplitsToGraphData } from "./sandhi-utils";
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
import TextInputHandle from "@/components/graph/TextInputHandle";

export type SansPlaySplitterData = {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
  limit: number;
};

export const defaultSplitterNodeData: SansPlaySplitterData = {
  text: "తపఃస్వాధ్యాయనిరతం తపస్వీ వాగ్విదాం వరమ్",
  schemeFrom: TransliterationScheme.TELUGU,
  schemeTo: TransliterationScheme.IAST,
  limit: 1,
};

const selector = (state: RFState) => ({
  addChildNodes: state.addChildNodes,
  removeChildNodes: state.removeChildNodes,
});

function SansPlaySplitterNode({
  id,
  data,
}: NodeProps<Node<SansPlaySplitterData>>) {
  const { updateNodeData } = useReactFlow();
  const { split, isLoading, error } = useSandhiSplits();
  const { addChildNodes, removeChildNodes } = useSansPlayStore(
    useShallow(selector),
  );

  const onParse = useCallback(() => {
    async function parseAction() {
      removeChildNodes(id);
      split(data, {
        onSuccess: (data) => {
          console.log(data);
          const { nodes: newNodes, edges: newEdges } =
            transformSandhiSplitsToGraphData(id, data);
          addChildNodes(id, newNodes, newEdges);
        },
        onError: (error) => {
          console.error(error);
        },
      });
    }
    return parseAction();
  }, [id, data, split, addChildNodes, removeChildNodes]);

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
    <>
      <div className="shadow-md rounded-md border-1 border-stone-400 bg-card text-card-foreground relative">
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-full bg-card/90 rounded-md flex flex-row items-center justify-center gap-2">
            <Icons.spinner className="h-4 w-4 animate-spin" />
          </div>
        )}
        <div className="flex bg-muted text-sidebar-foreground px-2 rounded-t-md flex-row justify-between items-center">
          <div className="text-sm">Splitter</div>
          <div className="flex flex-row justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={onClear}>
              <Icons.clear className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onParse}>
              <Icons.play className={cn("size-3", error && "text-red-500")} />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2">
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
            </div>
          </div>
        </div>
      </div>
      <TextInputHandle id="text" onChange={onTargetChange} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export default SansPlaySplitterNode;
