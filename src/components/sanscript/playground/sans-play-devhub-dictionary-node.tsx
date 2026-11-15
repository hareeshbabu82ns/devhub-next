"use client";

import React, { useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { useMutation } from "@tanstack/react-query";
import { LibraryIcon } from "lucide-react";

import { lookupDictionary } from "@/app/(app)/dictionary/lookup-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { DICTIONARY_CATALOG } from "@/lib/dictionary/dictionary-catalog";
import { MATCH_MODES, type MatchMode } from "@/lib/dictionary/lookup-query";
import type { LookupSort } from "@/lib/dictionary/lookup-service";
import {
  LANGUAGE_TRANS_SCHEME_MAP,
  TransliterationScheme,
} from "@/types/sanscript";
import { buildItemResults } from "./results";
import {
  LimitSlider,
  SansPlayToolData,
  SansPlayToolNode,
  useToolNodeResults,
} from "./sans-play-tool-node";

const ALL_DICTIONARIES = "ALL";

const MODE_LABELS: Record<MatchMode, string> = {
  smart: "Smart match",
  exact: "Exact word",
  prefix: "Starts with",
  suffix: "Ends with",
  contains: "Contains",
  meaning: "In the meanings",
};

const SORT_LABELS: Record<LookupSort, string> = {
  relevance: "Best match first",
  dictionary: "Dictionary order",
  alphabetical: "Alphabetical",
};

export type SansPlayDevhubDictionaryData = SansPlayToolData & {
  limit: number;
  /** Code of one dictionary of the catalog, or all of them */
  origin: string;
  mode: MatchMode;
  sort: LookupSort;
};

export const defaultDevhubDictionaryNodeData: SansPlayDevhubDictionaryData = {
  text: "",
  // the lookup reads any script; entries come back in the app's language
  schemeFrom: TransliterationScheme.IAST,
  schemeTo: TransliterationScheme.IAST,
  limit: 3,
  origin: ALL_DICTIONARIES,
  mode: "smart",
  sort: "relevance",
};

/**
 * Looks a word up in the dictionaries imported into this app (the
 * `DictionaryWord` collection), the same lookup the Dictionary page uses.
 * The text can be in any script; entries are shown in the app's language.
 */
function SansPlayDevhubDictionaryNode({
  id,
  data,
}: NodeProps<Node<SansPlayDevhubDictionaryData>>) {
  const { updateNodeData } = useReactFlow();
  const language = useLanguageAtomValue();
  const { mutate, isPending, error } = useMutation({
    mutationFn: lookupDictionary,
  });
  const { clearResults, showResults } = useToolNodeResults(id);
  const [summary, setSummary] = useState<string | null>(null);

  const onClear = () => {
    clearResults();
    setSummary(null);
  };

  const onRun = () => {
    const query = data.text.trim();
    if (!query) return;
    onClear();
    mutate(
      {
        query,
        mode: data.mode ?? "smart",
        origins: data.origin === ALL_DICTIONARIES ? [] : [data.origin],
        sort: data.sort ?? "relevance",
        language,
        limit: data.limit,
        offset: 0,
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
                label: item.word,
                kind: "entry",
                subTitle: item.origin,
                description: item.description || undefined,
              })),
              LANGUAGE_TRANS_SCHEME_MAP[language],
            ),
          );
        },
      },
    );
  };

  return (
    <SansPlayToolNode
      id={id}
      title="DevHub Dictionary"
      icon={<LibraryIcon />}
      text={data.text}
      placeholder="word to look up, in any script..."
      isLoading={isPending}
      error={error}
      emptyMessage={summary}
      onRun={onRun}
      onClear={onClear}
      inputLimit={1}
    >
      <Select
        value={data.origin}
        onValueChange={(origin) => updateNodeData(id, { origin })}
      >
        <SelectTrigger className="nodrag w-full" aria-label="Dictionary">
          <SelectValue placeholder="Dictionary" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          <SelectItem value={ALL_DICTIONARIES}>All dictionaries</SelectItem>
          {DICTIONARY_CATALOG.map((dictionary) => (
            <SelectItem key={dictionary.code} value={dictionary.code}>
              {dictionary.short}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Select
          value={data.mode ?? "smart"}
          onValueChange={(mode) => updateNodeData(id, { mode })}
        >
          <SelectTrigger className="nodrag min-w-0 flex-1" aria-label="Match">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MATCH_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={data.sort ?? "relevance"}
          onValueChange={(sort) => updateNodeData(id, { sort })}
        >
          <SelectTrigger className="nodrag min-w-0 flex-1" aria-label="Order">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as LookupSort[]).map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <LimitSlider id={id} limit={data.limit} />
    </SansPlayToolNode>
  );
}

export default SansPlayDevhubDictionaryNode;
