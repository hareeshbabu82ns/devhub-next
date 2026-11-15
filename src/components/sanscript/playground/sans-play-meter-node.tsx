"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { DrumIcon } from "lucide-react";

import { useVerseMeter } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlayMeterData = SansPlayToolData;

export const defaultMeterNodeData: SansPlayMeterData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
};

/**
 * Syllable weights of each line of a verse: G for guru (heavy), L for laghu
 * (light). Lines end at a line break or a danda.
 */
function SansPlayMeterNode({ id, data }: NodeProps<Node<SansPlayMeterData>>) {
  const { scan, isLoading, error } = useVerseMeter();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    scan(data, {
      onSuccess: (lines) => {
        setEmpty(lines.length === 0);
        showResults(
          buildItemResults(
            id,
            lines.map((line, index) => ({
              kind: "text",
              label: line.text,
              index: lines.length > 1 ? index + 1 : undefined,
              subTitle: line.pattern,
              tags: [`${line.syllables} syllables`],
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
      title="Meter"
      icon={<DrumIcon />}
      text={data.text}
      placeholder="verse, lines divided by a danda..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "No syllables found" : null}
      onRun={onRun}
      onClear={clearResults}
      inputDelimiter=" । "
    >
      <SchemePair id={id} data={data} />
    </SansPlayToolNode>
  );
}

export default SansPlayMeterNode;
