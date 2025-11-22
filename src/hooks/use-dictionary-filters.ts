/**
 * Dictionary Filters Hook
 *
 * Tasks: T85-T87, T223
 * Purpose: Filter panel state management with FilterService integration
 * Features: Validation, serialization/deserialization, URL sync, localStorage persistence
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FilterService } from "@/lib/dictionary/filter-service";
import {
  UserFilter,
  FilterValidationResult,
  SearchMode,
} from "@/lib/dictionary/types";

// localStorage keys for filter persistence
const FILTERS_STORAGE_KEY = "dictionaryFilters";

interface UseDictionaryFiltersOptions {
  syncWithUrl?: boolean;
  onFiltersChange?: (filters: UserFilter) => void;
}

interface UseDictionaryFiltersResult {
  // Filter state
  filters: UserFilter;
  setFilters: (filters: UserFilter) => void;
  updateFilter: <K extends keyof UserFilter>(
    key: K,
    value: UserFilter[K],
  ) => void;
  clearFilters: () => void;

  // Pending state (for Apply button pattern)
  pendingFilters: UserFilter;
  setPendingFilters: (filters: UserFilter) => void;
  updatePendingFilter: <K extends keyof UserFilter>(
    key: K,
    value: UserFilter[K],
  ) => void;
  applyFilters: () => void;
  discardPendingFilters: () => void;
  hasPendingChanges: boolean;

  // Validation
  validation: FilterValidationResult;
  isValid: boolean;

  // Helpers
  isEmpty: boolean;
  serialized: string;
}

const DEFAULT_OPTIONS: Required<UseDictionaryFiltersOptions> = {
  syncWithUrl: true,
  onFiltersChange: () => {},
};

/**
 * T85-T87: Filter management hook
 * Integrates FilterService for validation and serialization
 */
export function useDictionaryFilters(
  options: UseDictionaryFiltersOptions = {},
): UseDictionaryFiltersResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Load filters from localStorage
  const loadFiltersFromStorage = useCallback(() => {
    if (typeof window === "undefined") return null;

    try {
      // Try to load complete filters object first (new approach)
      const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (storedFilters) {
        const parsed = JSON.parse(storedFilters);
        // Convert date strings back to Date objects
        if (parsed.dateRange) {
          if (parsed.dateRange.start) {
            parsed.dateRange.start = new Date(parsed.dateRange.start);
          }
          if (parsed.dateRange.end) {
            parsed.dateRange.end = new Date(parsed.dateRange.end);
          }
        }
        return parsed as UserFilter;
      }
    } catch (error) {
      console.error("Failed to read filters from localStorage:", error);
    }
    return null;
  }, []);

  // Initialize filters from URL or localStorage
  // Priority hierarchy: URL params override localStorage, but localStorage fills in missing values
  const initialFilters = useMemo(() => {
    // On server-side, just return empty filter (will be hydrated on client)
    if (typeof window === "undefined") {
      return FilterService.createEmptyFilter();
    }

    // First, try to load from localStorage
    const storedFilters = loadFiltersFromStorage();

    if (opts.syncWithUrl && searchParams && searchParams.toString()) {
      // URL has params - deserialize them, using localStorage as defaults for missing values
      console.log("Search Params:", searchParams);
      return FilterService.deserializeFromUrl(
        searchParams,
        storedFilters || undefined,
      );
    } else {
      // No URL params - use localStorage or defaults
      return storedFilters || FilterService.createEmptyFilter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - don't include loadFiltersFromStorage to avoid re-runs

  // Active filters (applied)
  const [filters, setFiltersState] = useState<UserFilter>(initialFilters);

  // Pending filters (not yet applied)
  const [pendingFilters, setPendingFilters] =
    useState<UserFilter>(initialFilters);

  // Track if this is the first mount (to skip useEffect on initial hydration)
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Check if there are pending changes
  const hasPendingChanges = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(pendingFilters);
  }, [filters, pendingFilters]);

  // T86: Validate filters using FilterService
  const validation = useMemo(() => {
    return FilterService.validateFilters(pendingFilters);
  }, [pendingFilters]);

  const isValid = validation.isValid;

  // Check if filters are empty
  const isEmpty = useMemo(() => {
    return FilterService.isEmptyFilter(filters);
  }, [filters]);

  // T87: Serialize filters for URL
  const serialized = useMemo(() => {
    return FilterService.serializeFilters(filters);
  }, [filters]);

  // Update filters and sync with URL
  const setFilters = useCallback(
    (newFilters: UserFilter) => {
      setFiltersState(newFilters);
      setPendingFilters(newFilters);

      // Persist all filters to localStorage
      if (typeof window !== "undefined") {
        try {
          // Store complete filters object
          localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(newFilters));
        } catch (error) {
          console.error("Failed to save filters to localStorage:", error);
        }
      }

      // T87: Sync with URL if enabled
      if (opts.syncWithUrl) {
        const params = FilterService.serializeFilters(newFilters);
        const newUrl = params ? `${pathname}?${params}` : pathname;
        router.push(newUrl, { scroll: false });
      }

      // Trigger callback
      opts.onFiltersChange(newFilters);
    },
    [opts, router, pathname],
  );

  // Update single filter field
  const updateFilter = useCallback(
    <K extends keyof UserFilter>(key: K, value: UserFilter[K]) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
    },
    [filters, setFilters],
  );

  // Update pending filter (without applying)
  const updatePendingFilter = useCallback(
    <K extends keyof UserFilter>(key: K, value: UserFilter[K]) => {
      setPendingFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Apply pending filters
  const applyFilters = useCallback(() => {
    if (isValid) {
      setFilters(pendingFilters);
    }
  }, [pendingFilters, isValid, setFilters]);

  // Discard pending changes
  const discardPendingFilters = useCallback(() => {
    setPendingFilters(filters);
  }, [filters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const emptyFilters = FilterService.createEmptyFilter();
    setFilters(emptyFilters);
  }, [setFilters]);

  // Hydration effect: Load from localStorage on client-side mount
  useEffect(() => {
    if (isInitialMount) {
      // On first client-side mount, load from localStorage and URL
      const storedFilters = loadFiltersFromStorage();

      if (opts.syncWithUrl && searchParams && searchParams.toString()) {
        // URL has params - use them with localStorage defaults
        const urlFilters = FilterService.deserializeFromUrl(
          searchParams,
          storedFilters || undefined,
        );
        setFiltersState(urlFilters);
        setPendingFilters(urlFilters);
      } else if (storedFilters) {
        // No URL params - use localStorage
        setFiltersState(storedFilters);
        setPendingFilters(storedFilters);
      }

      setIsInitialMount(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Restore filters from URL when URL changes (not on initial mount)
  useEffect(() => {
    if (!isInitialMount && opts.syncWithUrl && searchParams) {
      // Load localStorage as defaults to preserve non-URL filter values (e.g., sortBy, searchMode)
      const storedFilters = loadFiltersFromStorage();
      const urlFilters = FilterService.deserializeFromUrl(
        searchParams,
        storedFilters || undefined,
      );
      // Only update if different from current
      if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
        setFiltersState(urlFilters);
        setPendingFilters(urlFilters);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]); // Only react to URL changes

  return {
    // Filter state
    filters,
    setFilters,
    updateFilter,
    clearFilters,

    // Pending state
    pendingFilters,
    setPendingFilters,
    updatePendingFilter,
    applyFilters,
    discardPendingFilters,
    hasPendingChanges,

    // Validation
    validation,
    isValid,

    // Helpers
    isEmpty,
    serialized,
  };
}
