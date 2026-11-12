"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { ScissorsIcon } from "lucide-react";

import { usePreSegmentedSplits } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import {
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  transformItemsToGraphData,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlaySegmenterData = SansPlayToolData & {
  strictIO: boolean;
};

export const defaultSegmenterNodeData: SansPlaySegmenterData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  strictIO: false,
};

/**
 * For a sentence whose words are already separated by spaces: returns each
 * word in its standalone form (final sandhi undone, e.g. grāmaṃ -> grāmam).
 */
function SansPlaySegmenterNode({
  id,
  data,
}: NodeProps<Node<SansPlaySegmenterData>>) {
  const { segment, isLoading, error } = usePreSegmentedSplits();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    segment(data, {
      onSuccess: (words) => {
        setEmpty(words.length === 0);
        showResults(
          transformItemsToGraphData(
            id,
            words.map((word, index) => ({
              label: word,
              subTitle: `${index + 1}`,
            })),
          ),
        );
      },
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Word Segmenter"
      icon={<ScissorsIcon />}
      text={data.text}
      placeholder="words separated by spaces..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "No words returned" : null}
      onRun={onRun}
      onClear={clearResults}
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

export default SansPlaySegmenterNode;
