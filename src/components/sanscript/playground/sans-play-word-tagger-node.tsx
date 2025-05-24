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
import TextInputHandle from "@/components/graph/TextInputHandle";
import { transformWordTaggerToGraphData } from "./sandhi-utils";

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

  const onDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

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
    <>
      <div className="shadow-md rounded-md border-1 border-stone-400 bg-card text-card-foreground relative">
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-full bg-card/90 rounded-md flex flex-row items-center justify-center gap-2">
            <Icons.spinner className="h-4 w-4 animate-spin" />
          </div>
        )}
        <div className="flex bg-muted text-sidebar-foreground px-2 rounded-t-md flex-row justify-between items-center">
          <div className="text-sm">WordTagger</div>
          <div className="flex flex-row justify-end">
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Icons.trash className="size-3 text-destructive" />
            </Button>
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
      </div>
      <TextInputHandle id="text" onChange={onTargetChange} limit={1} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export default SansPlayWordTaggerNode;
