"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { SproutIcon } from "lucide-react";

import { useDhatuLookup } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayDhatuData = SansPlayToolData;

export const defaultDhatuNodeData: SansPlayDhatuData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
};

/** Dhatupatha entries of a verbal root: meaning, class, pada, present form */
function SansPlayDhatuNode({ id, data }: NodeProps<Node<SansPlayDhatuData>>) {
  const { lookup, isLoading, error } = useDhatuLookup();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    lookup(
      { ...data, dhatu: data.text.trim() },
      {
        onSuccess: (dhatus) => {
          setEmpty(dhatus.length === 0);
          showResults(
            buildItemResults(
              id,
              dhatus.map((dhatu, index) => ({
                kind: "entry",
                label: dhatu.dhatu,
                index: dhatus.length > 1 ? index + 1 : undefined,
                subTitle: `${dhatu.mulaDhatu} · ${dhatu.artha}`,
                tags: [
                  dhatu.gana,
                  dhatu.pada,
                  dhatu.karmakatva,
                  ...(dhatu.dvikarmaka ? ["dvikarmaka"] : []),
                  dhatu.ittva,
                ].filter(Boolean),
                description: `**${dhatu.rupa}** (third person singular present) — ${dhatu.artha}`,
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
      title="Dhatu"
      icon={<SproutIcon />}
      text={data.text}
      placeholder="verbal root, e.g. gam..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "The dhatupatha has no such root" : null}
      onRun={onRun}
      onClear={clearResults}
      inputLimit={1}
    >
      <SchemePair id={id} data={data} />
    </SansPlayToolNode>
  );
}

export default SansPlayDhatuNode;
