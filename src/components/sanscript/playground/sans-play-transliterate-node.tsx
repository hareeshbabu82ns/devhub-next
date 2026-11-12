"use client";

import React from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { LanguagesIcon } from "lucide-react";

import { useServiceTransliterate } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import {
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  transformItemsToGraphData,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayTransliterateData = SansPlayToolData;

export const defaultTransliterateNodeData: SansPlayTransliterateData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.DEVANAGARI,
};

function SansPlayTransliterateNode({
  id,
  data,
}: NodeProps<Node<SansPlayTransliterateData>>) {
  const { transliterate, isLoading, error } = useServiceTransliterate();
  const { clearResults, showResults } = useToolNodeResults(id);

  const onRun = () => {
    clearResults();
    transliterate(data, {
      onSuccess: (result) =>
        showResults(
          transformItemsToGraphData(id, [
            { label: result, subTitle: data.schemeTo },
          ]),
        ),
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Transliterate"
      icon={<LanguagesIcon />}
      text={data.text}
      placeholder="text to transliterate..."
      isLoading={isLoading}
      error={error}
      onRun={onRun}
      onClear={clearResults}
    >
      <SchemePair id={id} data={data} />
    </SansPlayToolNode>
  );
}

export default SansPlayTransliterateNode;
