"use client";

import React, { useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { SquareSplitHorizontalIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSandhiSplitPairs } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import { buildPairResults } from "./results";
import {
  NodeCheckbox,
  STRICT_HINT,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";

export type SansPlaySplitPairsData = SansPlayToolData & {
  strictIO: boolean;
  validOnly: boolean;
  /** Only cut at this letter (0-based, in SLP1 letters); every one when unset */
  position?: number;
};

export const defaultSplitPairsNodeData: SansPlaySplitPairsData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  strictIO: false,
  // the rules alone give dozens of pairs for a word: too many for a canvas
  validOnly: true,
};

/**
 * Two-part sandhi decompositions of a single word, straight from the sandhi
 * rules (tasminniti -> tasmin + iti).
 */
function SansPlaySplitPairsNode({
  id,
  data,
}: NodeProps<Node<SansPlaySplitPairsData>>) {
  const { updateNodeData } = useReactFlow();
  const { splitPairs, isLoading, error } = useSandhiSplitPairs();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);

  const onRun = () => {
    clearResults();
    setEmpty(false);
    splitPairs(data, {
      onSuccess: (pairs) => {
        setEmpty(pairs.length === 0);
        showResults(buildPairResults(id, pairs, data.schemeTo));
      },
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Split Pairs"
      icon={<SquareSplitHorizontalIcon />}
      text={data.text}
      placeholder="word to cut in two..."
      isLoading={isLoading}
      error={error}
      emptyMessage={
        empty
          ? data.validOnly
            ? "No pair of known words found"
            : "No pairs found"
          : null
      }
      onRun={onRun}
      onClear={clearResults}
      inputLimit={1}
    >
      <SchemePair id={id} data={data} />
      <label
        className="flex items-center gap-2 text-sm"
        title="Only cut at this letter (0-based, counted in SLP1 letters). Empty: every position"
      >
        <span className="shrink-0 text-muted-foreground">Cut at letter</span>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="any"
          value={data.position ?? ""}
          className="nodrag"
          onChange={(e) =>
            updateNodeData(id, {
              position:
                e.target.value === ""
                  ? undefined
                  : Math.max(0, Math.floor(Number(e.target.value)) || 0),
            })
          }
        />
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NodeCheckbox
          id={id}
          field="validOnly"
          checked={!!data.validOnly}
          label="Known words only"
          title="Only pairs whose two parts are both words the lexicon knows"
        />
        <NodeCheckbox
          id={id}
          field="strictIO"
          checked={!!data.strictIO}
          label="Strict"
          title={STRICT_HINT}
        />
      </div>
    </SansPlayToolNode>
  );
}

export default SansPlaySplitPairsNode;
