/**
 * DictionaryResultsContainer - data and state for the results area.
 *
 * - No search, no single dictionary  → dictionary catalog to browse
 * - No search, one dictionary        → letter strip + paged entries
 * - A search                         → per-dictionary counts + results
 */

"use client";

import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { DictionaryResultsList } from "./DictionaryResultsList";
import { DictionaryBrowseBar } from "./DictionaryBrowseBar";
import { DictionaryFacets } from "./DictionaryFacets";
import { DictionaryCatalog } from "./DictionaryCatalog";
import { ViewMode } from "../types";
import { lookupDictionary } from "../lookup-actions";
import { DictionaryUrlStateApi } from "./use-dictionary-url-state";

interface DictionaryResultsContainerProps {
  state: DictionaryUrlStateApi;
  asBrowse?: boolean;
  viewMode?: ViewMode;
  onCompare?: (word: string) => void;
}

export function DictionaryResultsContainer({
  state,
  asBrowse,
  viewMode = "card",
  onCompare,
}: DictionaryResultsContainerProps) {
  const router = useRouter();
  const isTouchDevice = useMediaQuery("(pointer: coarse)");
  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();
  const limit = parseInt(useQueryLimitAtomValue()) || 20;

  const { query, mode, origins, sort, sortParam, order, page, isBrowse } = state;
  const showCatalog = isBrowse && origins.length !== 1;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      "dictionaryLookup",
      query,
      mode,
      origins,
      sort,
      order,
      language,
      limit,
      page,
    ],
    queryFn: () =>
      lookupDictionary({
        query,
        mode,
        origins,
        sort,
        sortOrder: order,
        language,
        limit,
        offset: page * limit,
      }),
    enabled: !showCatalog,
    staleTime: QUERY_STALE_TIME_LONG,
    placeholderData: keepPreviousData,
  });

  if (showCatalog) {
    return (
      <DictionaryCatalog
        origins={origins}
        onBrowse={(code) => state.browseTo(code, 0)}
      />
    );
  }

  const results = data?.results ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-3">
      {isBrowse ? (
        <DictionaryBrowseBar
          origin={origins[0]}
          language={language}
          limit={limit}
          total={data?.browse ? total : undefined}
          onLocate={(p, id) => state.browseTo(origins[0], p, id)}
        />
      ) : (
        <DictionaryFacets
          query={query}
          mode={mode}
          origins={origins}
          onSelect={state.setOrigins}
        />
      )}

      <DictionaryResultsList
        results={results}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        currentPage={page + 1}
        limit={limit}
        language={language}
        textSize={textSize}
        isTouchDevice={isTouchDevice}
        asBrowse={asBrowse}
        searchTerm={query}
        viewMode={viewMode}
        requestedMode={mode}
        effectiveMode={data?.mode ?? mode}
        fellBack={data?.fellBack ?? false}
        isBrowse={isBrowse}
        sort={sort}
        sortIsDefault={sortParam === null}
        focusId={state.focus}
        onSortChange={(s) => state.setSort(s, order)}
        onModeChange={state.setMode}
        onPageChange={(p) => state.setPage(p - 1)}
        onNextPage={() => state.setPage(page + 1)}
        onPrevPage={() => state.setPage(Math.max(0, page - 1))}
        onRefresh={() => refetch()}
        onCopyDescription={(d) => navigator.clipboard.writeText(d)}
        onEditItem={(id) => router.push(`/dictionary/${id}/edit`)}
        onCompare={onCompare}
      />
    </div>
  );
}

export default DictionaryResultsContainer;
