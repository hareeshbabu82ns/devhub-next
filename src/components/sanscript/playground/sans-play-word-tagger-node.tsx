"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { TagIcon } from "lucide-react";

import { useLanguageTags } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayWordTaggerData = SansPlayToolData & {
  strictIO: boolean;
};

export const defaultWordTaggerNodeData: SansPlayWordTaggerData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  strictIO: false,
};

function SansPlayWordTaggerNode({
  id,
  data,
}: NodeProps<Node<SansPlayWordTaggerData>>) {
  const { getTags, isLoading, error } = useLanguageTags();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    getTags(data, {
      onSuccess: (tags) => {
        setEmpty(tags.length === 0);
        showResults(
          buildItemResults(
            id,
            tags.map((tag, index) => ({
              label: tag.word,
              tags: tag.tags,
              index: tags.length > 1 ? index + 1 : undefined,
            })),
            data.schemeTo,
          ),
        );
      },
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Word Tagger"
      icon={<TagIcon />}
      text={data.text}
      placeholder="word to analyse..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "No analysis found for this word" : null}
      onRun={onRun}
      onClear={clearResults}
      inputLimit={1}
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

export default SansPlayWordTaggerNode;
