/**
 * Advanced React hook for optimized dictionary search with caching and debouncing
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchDictionary } from "@/app/(app)/dictionary/actions";
import {
  DictionarySearchParams,
  DictionarySearchResult,
  SearchOperation,
  SortField,
  SortOrder,
} from "@/app/(app)/dictionary/types";
import { useDebounce } from "@/hooks/use-debounce";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";

interface UseDictionarySearchOptions {
  dictFrom?: string[];
  language?: string;
  defaultLimit?: number;
  defaultSortBy?: SortField;
  defaultSortOrder?: SortOrder;
  debounceMs?: number;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface UseDictionarySearchResult {
  // Search state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  operation: SearchOperation;
  setOperation: (op: SearchOperation) => void;
  effectiveOperation: SearchOperation; // The actual operation being used (auto-browse aware)

  // Filters and sorting
  dictFrom: string[];
  setDictFrom: (dicts: string[]) => void;
  sortBy: SortField;
  setSortBy: (sort: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;

  // Pagination
  limit: number;
  setLimit: (limit: number) => void;
  offset: number;
  setOffset: (offset: number) => void;

  // Results
  data: DictionarySearchResult | undefined;
  results: any[];
  total: number;
  hasMore: boolean;

  // Status
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;

  // Actions
  refetch: () => void;
  loadMore: () => void;
  reset: () => void;
  clearSearch: () => void;
}

const DEFAULT_OPTIONS: Required<UseDictionarySearchOptions> = {
  dictFrom: [],
  language: "en",
  defaultLimit: 20,
  defaultSortBy: "wordIndex",
  defaultSortOrder: "asc",
  debounceMs: 300,
  enabled: true,
  staleTime: QUERY_STALE_TIME_LONG,
  cacheTime: QUERY_STALE_TIME_LONG,
};

export function useDictionarySearch(
  options: UseDictionarySearchOptions = {},
): UseDictionarySearchResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [operation, setOperation] = useState<SearchOperation>("REGEX");

  // Filters and sorting
  const [dictFrom, setDictFrom] = useState<string[]>(opts.dictFrom);
  const [sortBy, setSortBy] = useState<SortField>(opts.defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(opts.defaultSortOrder);

  // Pagination
  const [limit, setLimit] = useState(opts.defaultLimit);
  const [offset, setOffset] = useState(0);

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, opts.debounceMs);

  // Auto-determine effective operation based on search term
  const effectiveOperation = useMemo((): SearchOperation => {
    const trimmedTerm = debouncedSearchTerm.trim();
    if (trimmedTerm.length === 0) {
      return "BROWSE"; // Auto-browse when search term is empty
    }
    return operation; // Use user-selected operation when search term exists
  }, [debouncedSearchTerm, operation]);

  // Memoize search parameters
  const searchParams = useMemo(
    (): DictionarySearchParams => ({
      dictFrom,
      queryText: debouncedSearchTerm,
      queryOperation: effectiveOperation, // Use effective operation instead of raw operation
      language: opts.language,
      limit,
      offset,
      sortBy,
      sortOrder,
    }),
    [
      dictFrom,
      debouncedSearchTerm,
      effectiveOperation, // Changed from operation to effectiveOperation
      opts.language,
      limit,
      offset,
      sortBy,
      sortOrder,
    ],
  );

  // Create query key for caching
  const queryKey = useMemo(
    () => ["dictionary-search", searchParams],
    [searchParams],
  );

  // Main search query
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => searchDictionary(searchParams),
    enabled:
      opts.enabled && (debouncedSearchTerm.length > 0 || dictFrom.length > 0),
    staleTime: opts.staleTime,
    gcTime: opts.cacheTime,
    retry: (failureCount, error) => {
      // Don't retry validation errors
      if (error.message.includes("Invalid search parameters")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const queryClient = useQueryClient();

  // Reset offset when search parameters change (except pagination)
  useEffect(() => {
    if (offset > 0) {
      setOffset(0);
    }
  }, [debouncedSearchTerm, operation, dictFrom, sortBy, sortOrder]);

  // Actions
  const loadMore = useCallback(() => {
    if (data?.hasMore) {
      setOffset((prev) => prev + limit);
    }
  }, [data?.hasMore, limit]);

  const reset = useCallback(() => {
    setSearchTerm("");
    setOffset(0);
    setOperation("REGEX");
    setSortBy(opts.defaultSortBy);
    setSortOrder(opts.defaultSortOrder);
    setLimit(opts.defaultLimit);
  }, [opts.defaultSortBy, opts.defaultSortOrder, opts.defaultLimit]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setOffset(0);
  }, []);

  // Prefetch next page for better UX
  useEffect(() => {
    if (data?.hasMore && !isFetching) {
      const nextPageParams = {
        ...searchParams,
        offset: offset + limit,
      };

      const nextQueryKey = ["dictionary-search", nextPageParams];

      // Prefetch next page with lower priority
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => searchDictionary(nextPageParams),
        staleTime: opts.staleTime,
      });
    }
  }, [
    data?.hasMore,
    isFetching,
    queryClient,
    searchParams,
    offset,
    limit,
    opts.staleTime,
  ]);

  return {
    // Search state
    searchTerm,
    setSearchTerm,
    operation,
    setOperation,
    effectiveOperation, // Add the effective operation

    // Filters and sorting
    dictFrom,
    setDictFrom,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Pagination
    limit,
    setLimit,
    offset,
    setOffset,

    // Results
    data,
    results: data?.results || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,

    // Status
    isLoading,
    isError,
    error: error as Error | null,
    isFetching,

    // Actions
    refetch,
    loadMore,
    reset,
    clearSearch,
  };
}

// Helper hook for dictionary suggestions/autocomplete
export function useDictionarySuggestions(
  searchTerm: string,
  dictFrom: string[] = [],
  options: {
    enabled?: boolean;
    minLength?: number;
    limit?: number;
  } = {},
) {
  const { enabled = true, minLength = 2, limit = 10 } = options;

  const debouncedTerm = useDebounce(searchTerm, 200);

  return useQuery({
    queryKey: ["dictionary-suggestions", debouncedTerm, dictFrom],
    queryFn: () =>
      searchDictionary({
        dictFrom,
        queryText: debouncedTerm,
        queryOperation: "REGEX",
        language: "en",
        limit,
        offset: 0,
        sortBy: "wordIndex",
        sortOrder: "asc",
      }),
    enabled: enabled && debouncedTerm.length >= minLength,
    staleTime: QUERY_STALE_TIME_LONG,
    select: (data) => data.results.slice(0, limit),
  });
}

// Helper hook for popular/trending dictionary words
export function usePopularDictionaryWords(
  dictFrom: string[] = [],
  limit: number = 20,
) {
  return useQuery({
    queryKey: ["dictionary-popular", dictFrom, limit],
    queryFn: () =>
      searchDictionary({
        dictFrom,
        queryText: "",
        queryOperation: "BROWSE",
        language: "en",
        limit,
        offset: 0,
        sortBy: "wordIndex",
        sortOrder: "asc",
      }),
    staleTime: QUERY_STALE_TIME_LONG,
    select: (data) => data.results,
  });
}
