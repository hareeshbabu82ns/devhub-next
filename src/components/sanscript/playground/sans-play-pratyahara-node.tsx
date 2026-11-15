"use client";

import React from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { BracesIcon } from "lucide-react";

import { usePratyahara } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayPratyaharaData = SansPlayToolData & {
  longForm: boolean;
  withLongVowels: boolean;
};

export const defaultPratyaharaNodeData: SansPlayPratyaharaData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  longForm: true,
  withLongVowels: false,
};

/** The sounds a pratyahara such as ac, hal or jaś stands for */
function SansPlayPratyaharaNode({
  id,
  data,
}: NodeProps<Node<SansPlayPratyaharaData>>) {
  const { expand, isLoading, error } = usePratyahara();
  const { clearResults, showResults } = useToolNodeResults(id);

  const onRun = () => {
    clearResults();
    expand(
      { ...data, name: data.text.trim() },
      {
        onSuccess: (pratyahara) =>
          showResults(
            buildItemResults(
              id,
              pratyahara.varnas.map((varna, index) => ({
                label: varna,
                index: index + 1,
              })),
              data.schemeTo,
            ),
          ),
      },
    );
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Pratyahara"
      icon={<BracesIcon />}
      text={data.text}
      placeholder="pratyahara, e.g. ac, hal..."
      isLoading={isLoading}
      error={error}
      onRun={onRun}
      onClear={clearResults}
      inputLimit={1}
    >
      <SchemePair id={id} data={data} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NodeCheckbox
          id={id}
          field="longForm"
          checked={data.longForm ?? true}
          label="Long form"
          title="aṇ and iṇ can end at the first or the second ṇ of the Maheshvara sutras; on takes the second"
        />
        <NodeCheckbox
          id={id}
          field="withLongVowels"
          checked={!!data.withLongVowels}
          label="Long vowels"
          title="Include the long vowels alongside the short ones"
        />
      </div>
    </SansPlayToolNode>
  );
}

export default SansPlayPratyaharaNode;
