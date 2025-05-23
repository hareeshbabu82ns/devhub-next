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
import { useSentenceParse } from "@/hooks/use-sanskrit-utils";
import { transformSentenceParseToGraphData } from "./utils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import TextInputHandle from "@/components/graph/TextInputHandle";

export type SansPlayParserData = {
  text: string;
  schemeFrom: TransliterationScheme;
  schemeTo: TransliterationScheme;
  preSegmented: boolean;
  limit: number;
};

export const defaultParserNodeData: SansPlayParserData = {
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
  const { updateNodeData } = useReactFlow();
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
    <>
      <div className="p-2 shadow-md rounded-md border-1 border-stone-400 bg-card text-card-foreground flex flex-col gap-2 relative">
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-full bg-card/90 flex flex-row items-center justify-center gap-2">
            <Icons.spinner className="h-4 w-4 animate-spin" />
          </div>
        )}
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
            <Input
              id="limit"
              type="number"
              min="1"
              max="10"
              value={data.limit}
              onChange={(e) =>
                updateNodeData(id, { limit: Number(e.target.value) })
              }
            />

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
        <div className="flex flex-row justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onClear}>
            <Icons.clear className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onParse}>
            <Icons.play className={cn("h-4 w-4", error && "text-red-500")} />
          </Button>
        </div>
      </div>
      <TextInputHandle id="text" onChange={onTargetChange} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export default SansPlayParserNode;
