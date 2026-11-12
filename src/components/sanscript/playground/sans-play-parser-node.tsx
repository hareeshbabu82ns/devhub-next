"use client";

import React, { useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { BrainCircuitIcon, ExternalLinkIcon } from "lucide-react";

import { useSentenceParse } from "@/hooks/use-sanskrit-utils";
import { TransliterationScheme } from "@/types/sanscript";
import {
  LimitSlider,
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";
import { transformSentenceParseToGraphData } from "./utils";

export type SansPlayParserData = SansPlayToolData & {
  preSegmented: boolean;
  limit: number;
  strictIO: boolean;
};

export const defaultParserNodeData: SansPlayParserData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  preSegmented: false,
  limit: 2,
  strictIO: false,
};

type Diagram = { label: string; url: string };

function SansPlayParserNode({ id, data }: NodeProps<Node<SansPlayParserData>>) {
  const { parse, isLoading, error } = useSentenceParse();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState(false);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);

  const onClear = () => {
    clearResults();
    setDiagrams([]);
    setEmpty(false);
  };

  const onRun = () => {
    onClear();
    parse(data, {
      onSuccess: (results) => {
        const graph = transformSentenceParseToGraphData(id, results);
        setEmpty(graph.nodes.length === 0);
        showResults(graph);

        // Graphviz renderings the service prepared for this parse
        const links: Diagram[] = [];
        results.forEach((result, resultIndex) => {
          const prefix = results.length > 1 ? `${resultIndex + 1}: ` : "";
          if (result.splitDotURL) {
            links.push({ label: `${prefix}Splits`, url: result.splitDotURL });
          }
          result.parseDotURLs?.forEach((url, parseIndex) =>
            links.push({ label: `${prefix}Parse ${parseIndex + 1}`, url }),
          );
        });
        setDiagrams(links);
      },
    });
  };

  return (
    <SansPlayToolNode
      id={id}
      title="Sentence Parser"
      icon={<BrainCircuitIcon />}
      text={data.text}
      placeholder="sentence to parse..."
      isLoading={isLoading}
      error={error}
      emptyMessage={empty ? "No parse found for this sentence" : null}
      onRun={onRun}
      onClear={onClear}
    >
      <SchemePair id={id} data={data} />
      <LimitSlider id={id} limit={data.limit} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NodeCheckbox
          id={id}
          field="preSegmented"
          checked={!!data.preSegmented}
          label="Segmented"
          title="The words are already split and separated by spaces"
        />
        <NodeCheckbox
          id={id}
          field="strictIO"
          checked={!!data.strictIO}
          label="Strict"
          title="Strict input / output handling: rejects text the parser cannot read exactly"
        />
      </div>
      {diagrams.length > 0 && (
        <div
          className="flex flex-wrap gap-x-3 gap-y-1 text-xs"
          title="Opens the diagram on image-charts.com (the sentence is part of the link)"
        >
          <span className="text-muted-foreground">Diagrams:</span>
          {diagrams.map((diagram) => (
            <a
              key={diagram.label}
              href={diagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="nodrag inline-flex items-center gap-1 underline underline-offset-2"
            >
              {diagram.label}
              <ExternalLinkIcon className="size-3" />
            </a>
          ))}
        </div>
      )}
    </SansPlayToolNode>
  );
}

export default SansPlayParserNode;
