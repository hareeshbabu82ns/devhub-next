"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DictionaryResults from "./DictionaryResults";
import { SearchToolBar } from "./search-toolbar";
import DictionaryFilters from "./DictionaryFilters";
import SavedSearchModal from "./SavedSearchModal";
import DictionaryExportModal from "./DictionaryExportModal";
import DictionaryComparison from "./DictionaryComparison";
import { DictionarySkipLinks, SkipLinkTarget } from "./DictionarySkipLinks";
import { ViewMode } from "../types";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useSavedSearches } from "@/hooks/use-saved-searches";
import { useSearchHistory } from "@/hooks/use-search-history";
import { FilterService } from "@/lib/dictionary/filter-service";
import { lookupDictionary } from "../lookup-actions";
import { useDictionaryUrlState } from "./use-dictionary-url-state";

const VIEW_MODE_STORAGE_KEY = "dictionary-view-mode";

interface DictionaryViewProps {
  asBrowse?: boolean;
}

const DictionaryView = ({ asBrowse }: DictionaryViewProps) => {
  const state = useDictionaryUrlState();
  const language = useLanguageAtomValue();

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonWord, setComparisonWord] = useState<string>("");

  // Load the view mode after hydration to avoid an SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode;
      if (stored === "compact" || stored === "card" || stored === "detailed") {
        setViewMode(stored);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // storage unavailable
    }
  }, []);

  const { createSavedSearch, isCreating } = useSavedSearches();
  const { addToHistory } = useSearchHistory();

  // Saved searches and history store the filter shape; keep origins and
  // mode in it so a restored search is complete.
  const savedFilters = {
    ...FilterService.createEmptyFilter(),
    origins: state.origins,
    mode: state.mode,
  } as any;

  // Export: every result of the current search (not just this page)
  const {
    data: exportData,
    refetch: refetchExportData,
    isFetching: isFetchingExportData,
  } = useQuery({
    queryKey: [
      "dictionaryExport",
      state.query,
      state.mode,
      state.origins,
      state.sort,
      state.order,
      language,
    ],
    queryFn: () =>
      lookupDictionary({
        query: state.query,
        mode: state.mode,
        origins: state.origins,
        sort: state.sort,
        sortOrder: state.order,
        language,
        limit: 10000,
        offset: 0,
      }),
    enabled: false,
  });

  // Compare: the same word across every dictionary
  const { data: comparisonData, refetch: refetchComparison } = useQuery({
    queryKey: ["dictionaryComparison", comparisonWord, language],
    queryFn: () =>
      comparisonWord
        ? lookupDictionary({
            query: comparisonWord,
            mode: "exact",
            origins: [],
            sort: "dictionary",
            language,
            limit: 100,
            offset: 0,
          })
        : Promise.resolve(null),
    enabled: false,
  });

  useEffect(() => {
    if (comparisonOpen && comparisonWord) refetchComparison();
  }, [comparisonOpen, comparisonWord, refetchComparison]);

  const handleCompare = useCallback((word: string) => {
    setComparisonWord(word);
    setComparisonOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    setExportModalOpen(true);
    refetchExportData();
  }, [refetchExportData]);

  const handleSaveSearch = () => {
    addToHistory(state.query, savedFilters);
    setSaveSearchModalOpen(true);
  };

  const handleSaveSearchSubmit = useCallback(
    (name: string) => {
      createSavedSearch({
        name,
        queryText: state.query,
        filters: savedFilters,
        sortBy: state.sortParam ?? undefined,
        sortOrder: state.order,
      } as any);
      setSaveSearchModalOpen(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.query, state.origins, state.mode, state.sortParam, state.order, createSavedSearch],
  );

  const handleSelectSearch = useCallback(
    (search: {
      queryText: string;
      filters?: Record<string, any>;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const f = search.filters ?? {};
      state.restore({
        query: search.queryText ?? "",
        mode: f.mode ?? f.searchMode,
        origins: Array.isArray(f.origins) ? f.origins : undefined,
        sort: search.sortBy ?? null,
        order: search.sortOrder ?? null,
      });
      addToHistory(search.queryText, search.filters);
    },
    [state, addToHistory],
  );

  return (
    <div className="dictionary-component flex flex-col w-full h-full">
      <DictionarySkipLinks />

      <SkipLinkTarget id="dictionary-main-content" as="main">
        <main className="flex flex-1 flex-col gap-4 focus:outline-none">
          <SkipLinkTarget id="dictionary-search">
            <SearchToolBar
              state={state}
              asBrowse={asBrowse}
              onOpenOptions={() => setOptionsOpen(true)}
              onSaveSearch={handleSaveSearch}
              onSelectSearch={handleSelectSearch}
              onExport={state.isBrowse && state.origins.length !== 1 ? undefined : handleExport}
            />
          </SkipLinkTarget>

          <SkipLinkTarget id="dictionary-results">
            <div className="min-h-[50vh]">
              <DictionaryResults
                state={state}
                asBrowse={asBrowse}
                viewMode={viewMode}
                onCompare={handleCompare}
              />
            </div>
          </SkipLinkTarget>

          <div id="dictionary-filters">
            <DictionaryFilters
              open={optionsOpen}
              onOpenChange={setOptionsOpen}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              state={state}
            />
          </div>
        </main>
      </SkipLinkTarget>

      <SavedSearchModal
        open={saveSearchModalOpen}
        onOpenChange={setSaveSearchModalOpen}
        searchData={{
          queryText: state.query,
          filters: savedFilters,
          sortBy: state.sort,
          sortOrder: state.order,
        }}
        onSave={handleSaveSearchSubmit}
        isSaving={isCreating}
      />

      <DictionaryExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        results={exportData?.results || []}
        totalResults={exportData?.total || 0}
        filters={savedFilters}
        isLoadingResults={isFetchingExportData}
      />

      <DictionaryComparison
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        word={comparisonWord}
        entries={comparisonData?.results || []}
      />
    </div>
  );
};

export default DictionaryView;
