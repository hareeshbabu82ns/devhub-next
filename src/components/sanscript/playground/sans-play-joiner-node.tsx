"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { MergeIcon } from "lucide-react";

import { useSandhiJoins } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayJoinerData = SansPlayToolData & {
  strictIO: boolean;
};

export const defaultJoinerNodeData: SansPlayJoinerData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  strictIO: false,
};

/** Words may be separated by commas or, when there is no comma, by spaces */
export const splitWordsToJoin = (text: string): string[] =>
  text
    .split(text.includes(",") ? "," : /\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

function SansPlayJoinerNode({ id, data }: NodeProps<Node<SansPlayJoinerData>>) {
  const { join, isLoading, error } = useSandhiJoins();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    const words = splitWordsToJoin(data.text);
    if (words.length === 0) return;
    clearResults();
    setEmpty(false);
    join(
      { ...data, words },
      {
        onSuccess: (joins) => {
          setEmpty(joins.length === 0);
          showResults(
            buildItemResults(
              id,
              joins.map((label, index) => ({
                label,
                kind: "text",
                index: joins.length > 1 ? index + 1 : undefined,
              })),
              data.schemeTo,
            ),
          );
        },
      },
    );
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Sandhi Joiner"
      icon={<MergeIcon />}
      text={data.text}
      placeholder="words to join, comma separated..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "No joined form found" : null}
      onRun={onRun}
      onClear={clearResults}
      inputDelimiter=","
    >
      <SchemePair id={id} data={data} />
      <NodeCheckbox
        id={id}
        field="strictIO"
        checked={!!data.strictIO}
        label="Strict"
        title="Strict input / output handling: rejects text the parser cannot read exactly"
      />
    </SansPlayToolNode>
  );
}

export default SansPlayJoinerNode;
