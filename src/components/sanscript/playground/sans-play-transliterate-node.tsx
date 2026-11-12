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
  useToolNodeResults,
} from "./sans-play-tool-node";
import { buildItemResults } from "./results";

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
          buildItemResults(
            id,
            [{ label: result, kind: "text", subTitle: data.schemeTo }],
            data.schemeTo,
          ),
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
