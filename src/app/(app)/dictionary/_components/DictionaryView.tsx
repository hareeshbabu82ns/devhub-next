"use client";

import { useState, useCallback } from "react";
import DictionaryResults from "./DictionaryResults";
import { SearchToolBar } from "./search-toolbar";
import DictionaryFilters from "./DictionaryFilters";
import DictionaryViewModeSelector from "./DictionaryViewModeSelector";
import SavedSearchModal from "./SavedSearchModal";
import { ViewMode } from "../types";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useReadLocalStorage } from "@/hooks/use-hydration-safe-storage";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";
import { useSavedSearches } from "@/hooks/use-saved-searches";
import { useSearchHistory } from "@/hooks/use-search-history";
import { useDictionaryFilters } from "@/hooks/use-dictionary-filters";

// import DictionaryItemList from "./DictionaryResults";

interface DictionaryViewProps {
  asBrowse?: boolean;
}

/**
 * T80: Integrated filter sidebar with toggle functionality
 * T87-T94: Integrated view mode selector with state management
 * T100-T102: Integrated saved searches with modal and restoration
 */
const DictionaryView = ({ asBrowse }: DictionaryViewProps) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);

  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const language = useLanguageAtomValue();
  const localOrigins =
    useReadLocalStorage<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  const { createSavedSearch, isCreating } = useSavedSearches();
  const { addToHistory } = useSearchHistory();
  const { filters } = useDictionaryFilters();

  // Get current search state
  const originParam = (
    searchParams.get("origins")?.split(",") ??
    localOrigins ??
    []
  ).filter((o) => o.trim().length > 0);
  const searchParam = searchParams.get("search") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "wordIndex";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";

  // T100: Handle opening save search modal
  const handleSaveSearch = () => {
    // T103: Add to search history
    addToHistory(searchParam, filters);
    setSaveSearchModalOpen(true);
  };

  // T100-T101: Handle saving search
  const handleSaveSearchSubmit = useCallback(
    (name: string) => {
      createSavedSearch({
        name,
        queryText: searchParam,
        filters: filters,
        sortBy: sortByParam,
        sortOrder: sortOrderParam,
      });
      setSaveSearchModalOpen(false);
    },
    [searchParam, filters, sortByParam, sortOrderParam, createSavedSearch],
  );

  // T102: Handle selecting a saved search to restore
  const handleSelectSearch = useCallback(
    (search: {
      queryText: string;
      filters?: Record<string, any>;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      // Update URL params to restore the search
      const updates: Record<string, string> = {
        search: search.queryText || "",
        offset: "0", // Reset to first page
      };

      if (search.sortBy) {
        updates.sortBy = search.sortBy;
      }

      if (search.sortOrder) {
        updates.sortOrder = search.sortOrder;
      }

      // TODO: T102: Also restore filters from search.filters
      // This would require integrating with the filter service to deserialize

      updateSearchParams(updates);

      // T103: Add to search history when selecting a saved search
      addToHistory(search.queryText, search.filters);
    },
    [updateSearchParams, addToHistory],
  );

  return (
    <main className="flex flex-1 flex-col gap-4 min-h-[calc(100vh_-_theme(spacing.20))]">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <SearchToolBar
            asBrowse={asBrowse}
            onFilterToggle={() => setFilterOpen(true)}
            onSaveSearch={handleSaveSearch}
            onSelectSearch={handleSelectSearch}
          />
        </div>

        {/* T87: View Mode Selector */}
        <DictionaryViewModeSelector value={viewMode} onChange={setViewMode} />
      </div>

      <DictionaryResults asBrowse={asBrowse} viewMode={viewMode} />

      {/* T74-T86: Advanced Filter Sidebar */}
      <DictionaryFilters open={filterOpen} onOpenChange={setFilterOpen} />

      {/* T101: Save Search Modal */}
      <SavedSearchModal
        open={saveSearchModalOpen}
        onOpenChange={setSaveSearchModalOpen}
        searchData={{
          queryText: searchParam,
          filters: filters,
          sortBy: sortByParam,
          sortOrder: sortOrderParam,
        }}
        onSave={handleSaveSearchSubmit}
        isSaving={isCreating}
      />
    </main>
  );
};

export default DictionaryView;
