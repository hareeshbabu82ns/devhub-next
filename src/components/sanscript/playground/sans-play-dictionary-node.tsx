"use client";

import React, { useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BookOpenIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSanscriptDictionarySearch } from "@/hooks/use-sanskrit-utils";
import {
  SANSCRIPT_DICTIONARIES,
  SanscriptDictionary,
  TransliterationScheme,
} from "@/types/sanscript";
import {
  LimitSlider,
  NodeCheckbox,
  SansPlayToolData,
  SansPlayToolNode,
  SchemePair,
  useToolNodeResults,
} from "./sans-play-tool-node";
import { buildItemResults } from "./results";

const ALL_DICTIONARIES = "ALL";

export type SansPlayDictionaryData = SansPlayToolData & {
  limit: number;
  origin: SanscriptDictionary | typeof ALL_DICTIONARIES;
  searchOnlyKeys: boolean;
  startsWith: boolean;
  fuzzySearch: boolean;
};

export const defaultDictionaryNodeData: SansPlayDictionaryData = {
  text: "",
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  limit: 3,
  origin: ALL_DICTIONARIES,
  searchOnlyKeys: true,
  startsWith: true,
  fuzzySearch: false,
};

function SansPlayDictionaryNode({
  id,
  data,
}: NodeProps<Node<SansPlayDictionaryData>>) {
  const { updateNodeData } = useReactFlow();
  const { search, isLoading, error } = useSanscriptDictionarySearch();
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
        origin: data.origin === ALL_DICTIONARIES ? undefined : [data.origin],
        searchOnlyKeys: data.searchOnlyKeys,
        startsWith: data.startsWith,
        fuzzySearch: data.fuzzySearch,
        limit: data.limit,
      },
      {
        onSuccess: ({ total, results }) => {
          setSummary(
            total === 0
              ? "No dictionary entries found"
              : `Showing ${results.length} of ${total} entries`,
          );
          showResults(
            buildItemResults(
              id,
              results.map((item) => ({
                label: item.key,
                kind: "entry",
                subTitle: item.origin,
                description: item.description ?? undefined,
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
      title="Dictionary"
      icon={<BookOpenIcon />}
      text={data.text}
      placeholder="word to look up..."
      isLoading={isLoading}
      error={error}
      emptyMessage={summary}
      onRun={onRun}
      onClear={onClear}
      inputLimit={1}
    >
      <SchemePair id={id} data={data} />
      <Select
        value={data.origin}
        onValueChange={(origin) => updateNodeData(id, { origin })}
      >
        <SelectTrigger className="nodrag" aria-label="Dictionary">
          <SelectValue placeholder="Dictionary" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          <SelectItem value={ALL_DICTIONARIES}>All dictionaries</SelectItem>
          {SANSCRIPT_DICTIONARIES.map((dictionary) => (
            <SelectItem key={dictionary} value={dictionary}>
              {dictionary}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <LimitSlider id={id} limit={data.limit} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NodeCheckbox
          id={id}
          field="searchOnlyKeys"
          checked={!!data.searchOnlyKeys}
          label="Headwords only"
          title="Off: also search inside the descriptions"
        />
        <NodeCheckbox
          id={id}
          field="startsWith"
          checked={!!data.startsWith}
          label="Starts with"
        />
        <NodeCheckbox
          id={id}
          field="fuzzySearch"
          checked={!!data.fuzzySearch}
          label="Fuzzy"
        />
      </div>
    </SansPlayToolNode>
  );
}

export default SansPlayDictionaryNode;
