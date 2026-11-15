"use client";

import React, { useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BrainCircuitIcon, ExternalLinkIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSentenceParse } from "@/hooks/use-sanskrit-utils";
import {
  TRANSLITERATION_SCHEME_LABELS,
  TRANSLITERATION_SCHEMES,
  TransliterationScheme,
} from "@/types/sanscript";
import {
  LimitSlider,
  NodeCheckbox,
  STRICT_HINT,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";
import { buildParseResults, parseEmptyMessage } from "./results";

export type SansPlayParserData = SansPlayToolData & {
  preSegmented: boolean;
  /** Sandhi splits to analyse */
  limit: number;
  /** Analyses per split */
  parseLimit: number;
  minCostOnly: boolean;
  unknownRootsTransitive: boolean;
  strictIO: boolean;
  /** Draw every possible relation between the words instead of the parses */
  showRelations: boolean;
  /** Also fetch links to Graphviz renderings of the results */
  diagrams: boolean;
  /** Script of the diagram labels; the output scheme when unset */
  diagramScheme?: TransliterationScheme;
};

/** Stands for "no diagram scheme of its own" in the select */
const OUTPUT_SCHEME = "OUTPUT";

export const defaultParserNodeData: SansPlayParserData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  preSegmented: false,
  limit: 2,
  parseLimit: 2,
  minCostOnly: false,
  unknownRootsTransitive: false,
  strictIO: false,
  showRelations: false,
  diagrams: false,
};

type Diagram = { label: string; url: string };

function SansPlayParserNode({ id, data }: NodeProps<Node<SansPlayParserData>>) {
  const { updateNodeData } = useReactFlow();
  const { parse, isLoading, error } = useSentenceParse();
  const { clearResults, showResults } = useToolNodeResults(id);
  const [empty, setEmpty] = useState<string | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);

  const onClear = () => {
    clearResults();
    setDiagrams([]);
    setEmpty(null);
  };

  const onRun = () => {
    onClear();
    parse(data, {
      onSuccess: (results) => {
        const relations = !!data.showRelations;
        const graph = buildParseResults(id, results, data.schemeTo, {
          relations,
        });
        setEmpty(
          graph.nodes.length === 0
            ? parseEmptyMessage(results, relations)
            : null,
        );
        showResults(graph);

        // Graphviz renderings the service prepared for this parse
        const links: Diagram[] = [];
        results.forEach((result, resultIndex) => {
          const prefix = results.length > 1 ? `${resultIndex + 1}: ` : "";
          if (result.splitDotURL) {
            links.push({ label: `${prefix}Relations`, url: result.splitDotURL });
          }
          // the canvas shows either the relations or the parses
          if (relations) return;
          result.analysis?.forEach((analysis, parseIndex) => {
            if (analysis.dotURL) {
              links.push({
                label: `${prefix}Parse ${parseIndex + 1}`,
                url: analysis.dotURL,
              });
            }
          });
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
      emptyMessage={empty}
      onRun={onRun}
      onClear={onClear}
    >
      <SchemePair id={id} data={data} />
      <LimitSlider
        id={id}
        limit={data.limit}
        label="Splits"
        title="Maximum number of sandhi splits to analyse"
      />
      <LimitSlider
        id={id}
        field="parseLimit"
        limit={data.parseLimit ?? 2}
        label="Parses"
        title="Maximum number of analyses per split"
      />
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
          field="minCostOnly"
          checked={!!data.minCostOnly}
          label="Best only"
          title="Per split, only the analyses that tie for the lowest cost"
        />
        <NodeCheckbox
          id={id}
          field="unknownRootsTransitive"
          checked={!!data.unknownRootsTransitive}
          label="Unlisted Roots"
          title="A verb whose root the dhatupatha does not list is taken as able to have an object (karma)"
        />
        <NodeCheckbox
          id={id}
          field="strictIO"
          checked={!!data.strictIO}
          label="Strict"
          title={STRICT_HINT}
        />
        <NodeCheckbox
          id={id}
          field="showRelations"
          checked={!!data.showRelations}
          label="Relations"
          title="Draw every relation that is possible between the words of each split instead of its parses. Works for a split that has no parse too"
        />
        <NodeCheckbox
          id={id}
          field="diagrams"
          checked={!!data.diagrams}
          label="Diagrams"
          title="Also get links to Graphviz renderings on image-charts.com (the sentence is part of the link)"
        />
      </div>
      {data.diagrams && (
        <Select
          value={data.diagramScheme ?? OUTPUT_SCHEME}
          onValueChange={(value) =>
            updateNodeData(id, {
              diagramScheme:
                value === OUTPUT_SCHEME
                  ? undefined
                  : (value as TransliterationScheme),
            })
          }
        >
          <SelectTrigger className="nodrag w-full" aria-label="Diagram script">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OUTPUT_SCHEME}>Diagrams in the output scheme</SelectItem>
            {TRANSLITERATION_SCHEMES.map((scheme) => (
              <SelectItem key={scheme} value={scheme}>
                Diagrams in {TRANSLITERATION_SCHEME_LABELS[scheme]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
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
