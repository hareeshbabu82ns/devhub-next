"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { AudioLinesIcon } from "lucide-react";

import { usePhoneticWordSearch } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import {
  LimitSlider,
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  transformItemsToGraphData,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayPhoneticData = SansPlayToolData & {
  limit: number;
  startsWith: boolean;
  endsWith: boolean;
};

export const defaultPhoneticNodeData: SansPlayPhoneticData = {
  text: "",
  schemeFrom: TransliterationScheme.ITRANS,
  schemeTo: TransliterationScheme.IAST,
  limit: 5,
  startsWith: true,
  endsWith: false,
};

function SansPlayPhoneticNode({
  id,
  data,
}: NodeProps<Node<SansPlayPhoneticData>>) {
  const { search, isLoading, error } = usePhoneticWordSearch();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [summary, setSummary] = useState<string | null>(null);

  const onClear = () => {
    clearResults();
    setSummary(null);
  };

  const onRun = () => {
    onClear();
    search(
      {
        search: data.text.trim(),
        searchScheme: data.schemeFrom,
        outputScheme: data.schemeTo,
        startsWith: data.startsWith,
        endsWith: data.endsWith,
        limit: data.limit,
      },
      {
        onSuccess: ({ total, results }) => {
          setSummary(
            total === 0
              ? "No similar sounding words"
              : `Showing ${results.length} of ${total} words`,
          );
          showResults(
            transformItemsToGraphData(
              id,
              results.map((item) => ({ label: item.word, subTitle: item.key })),
            ),
          );
        },
      },
    );
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Phonetic Search"
      icon={<AudioLinesIcon />}
      text={data.text}
      placeholder="word as it sounds, e.g. rama..."
      isLoading={isLoading}
      error={error}
      emptyMessage={summary}
      onRun={onRun}
      onClear={onClear}
      inputLimit={1}
    >
      <SchemePair id={id} data={data} />
      <LimitSlider id={id} limit={data.limit} max={25} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NodeCheckbox
          id={id}
          field="startsWith"
          checked={!!data.startsWith}
          label="Starts with"
        />
        <NodeCheckbox
          id={id}
          field="endsWith"
          checked={!!data.endsWith}
          label="Ends with"
        />
      </div>
    </SansPlayToolNode>
  );
}

export default SansPlayPhoneticNode;
