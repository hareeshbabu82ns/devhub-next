"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { SplitIcon } from "lucide-react";

import { useSandhiSplits } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { transformSandhiSplitsToGraphData } from "./sandhi-utils";
import {
  LimitSlider,
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlaySplitterData = SansPlayToolData & {
  limit: number;
  strictIO: boolean;
};

export const defaultSplitterNodeData: SansPlaySplitterData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  limit: 1,
  strictIO: false,
};

function SansPlaySplitterNode({
  id,
  data,
}: NodeProps<Node<SansPlaySplitterData>>) {
  const { split, isLoading, error } = useSandhiSplits();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    split(data, {
      onSuccess: (splits) => {
        setEmpty(splits.length === 0);
        showResults(transformSandhiSplitsToGraphData(id, splits));
      },
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Sandhi Splitter"
      icon={<SplitIcon />}
      text={data.text}
      placeholder="sentence to split..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "No splits found" : null}
      onRun={onRun}
      onClear={clearResults}
    >
      <SchemePair id={id} data={data} />
      <div className="flex items-center gap-3">
        <LimitSlider id={id} limit={data.limit} />
        <NodeCheckbox
          id={id}
          field="strictIO"
          checked={!!data.strictIO}
          label="Strict"
          title="Strict input / output handling: rejects text the parser cannot read exactly"
        />
      </div>
    </SansPlayToolNode>
  );
}

export default SansPlaySplitterNode;
