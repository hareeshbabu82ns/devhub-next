/**
 * DictionaryResultsContainer - Logic Layer
 *
 * Task: T092-T093, T89 (view mode management)
 * Purpose: Container component managing state, hooks, and event handlers
 * Responsibilities:
 * - All React hooks (useState, useQuery, custom hooks)
 * - Event handlers and callbacks
 * - URL parameter parsing and state management
 * - Data fetching coordination
 * - Pagination logic
 * - Touch device detection
 * - View mode management (T89)
 *
 * This component delegates ALL rendering to DictionaryResultsList (presentation layer)
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadLocalStorage } from "@/hooks/use-hydration-safe-storage";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";
import { useQuery } from "@tanstack/react-query";
import { searchDictionary } from "../actions";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DictionaryResultsList } from "./DictionaryResultsList";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { ViewMode } from "../types";
import { useDictionaryFilters } from "@/hooks/use-dictionary-filters";

interface DictionaryResultsContainerProps {
  asBrowse?: boolean;
  viewMode?: ViewMode;
  onCompare?: (word: string) => void; // T148
}

/**
 * T092: Container component for dictionary results
 * Manages all state, hooks, and business logic
 * T89: Added view mode support
 */
export function DictionaryResultsContainer({
  asBrowse,
  viewMode = "card",
  onCompare, // T148
}: DictionaryResultsContainerProps) {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  const { filters } = useDictionaryFilters();

  // Get configuration from atoms
  const language = useLanguageAtomValue();
  const textSize = useTextSizeAtomValue();
  const limit = parseInt(useQueryLimitAtomValue());

  // Parse URL parameters
  const localOrigins =
    useReadLocalStorage<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  const originParam = useMemo(() => {
    const urlOrigins = searchParams.get("origins")?.split(",").filter(Boolean);
    if (urlOrigins && urlOrigins.length > 0) return urlOrigins;
    if (filters.origins.length > 0) return filters.origins;
    return localOrigins.filter(Boolean);
  }, [searchParams, filters.origins, localOrigins]);

  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "wordIndex";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";
  const page = parseInt(searchParams.get("offset") || "0", 10);

  // T093: Data fetching - keeping direct useQuery for now since the hook
  // doesn't match our URL-based state management pattern exactly
  // TODO: Future enhancement - create a URL-synchronized version of useDictionarySearch
  const { data, isFetching, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "dictionaryItems",
      originParam,
      searchParam,
      ftsParam,
      sortByParam,
      sortOrderParam,
      language,
      limit,
      page,
    ],
    queryFn: async () => {
      const response = await searchDictionary({
        dictFrom: originParam,
        queryText: searchParam,
        queryOperation: ftsParam === "x" ? "FULL_TEXT_SEARCH" : "REGEX",
        sortBy: sortByParam as any,
        sortOrder: sortOrderParam as any,
        language,
        limit,
        offset: page * limit,
      });
      return response;
    },
    enabled:
      originParam.length > 0 ||
      (originParam.length > 0 && searchParam.length > 0) ||
      (searchParam.length > 0 && ftsParam === "x"),
    staleTime: QUERY_STALE_TIME_LONG,
  });

  const currentPage = page + 1;
  const results = data?.results || [];
  const total = data?.total || 0;

  // T093: Event handlers (moved from presentation layer)
  const handlePageChange = (newPage: number) => {
    const offset = newPage - 1;
    updateSearchParams({ offset: offset.toString() });
  };

  const handleNextPage = () => {
    const newPage = page + 1;
    updateSearchParams({ offset: newPage.toString() });
  };

  const handlePrevPage = () => {
    const newPage = Math.max(0, page - 1);
    updateSearchParams({ offset: newPage.toString() });
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleCopyDescription = (description: string) => {
    navigator.clipboard.writeText(description);
  };

  const handleEditItem = (itemId: string) => {
    router.push(`/dictionary/${itemId}/edit`);
  };

  // Delegate all rendering to presentation layer
  return (
    <DictionaryResultsList
      results={results}
      total={total}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      error={error}
      currentPage={currentPage}
      limit={limit}
      language={language}
      textSize={textSize}
      isTouchDevice={isTouchDevice}
      asBrowse={asBrowse}
      originParam={originParam}
      searchTerm={searchParam}
      viewMode={viewMode}
      onPageChange={handlePageChange}
      onNextPage={handleNextPage}
      onPrevPage={handlePrevPage}
      onRefresh={handleRefresh}
      onCopyDescription={handleCopyDescription}
      onEditItem={handleEditItem}
      onCompare={onCompare} // T148 - pass through from parent
    />
  );
}

export default DictionaryResultsContainer;
