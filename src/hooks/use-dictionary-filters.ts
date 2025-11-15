/**
 * Dictionary Filters Hook
 * 
 * Tasks: T85-T87
 * Purpose: Filter panel state management with FilterService integration
 * Features: Validation, serialization/deserialization, URL sync
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FilterService } from "@/lib/dictionary/filter-service";
import { UserFilter, FilterValidationResult } from "@/lib/dictionary/types";

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
    value: UserFilter[K]
  ) => void;
  clearFilters: () => void;
  
  // Pending state (for Apply button pattern)
  pendingFilters: UserFilter;
  setPendingFilters: (filters: UserFilter) => void;
  updatePendingFilter: <K extends keyof UserFilter>(
    key: K,
    value: UserFilter[K]
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
  options: UseDictionaryFiltersOptions = {}
): UseDictionaryFiltersResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Initialize filters from URL or empty state
  const initialFilters = useMemo(() => {
    if (opts.syncWithUrl && searchParams) {
      return FilterService.deserializeFromUrl(searchParams);
    }
    return FilterService.createEmptyFilter();
  }, [opts.syncWithUrl]); // Only run on mount
  
  // Active filters (applied)
  const [filters, setFiltersState] = useState<UserFilter>(initialFilters);
  
  // Pending filters (not yet applied)
  const [pendingFilters, setPendingFilters] = useState<UserFilter>(initialFilters);
  
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
      
      // T87: Sync with URL if enabled
      if (opts.syncWithUrl) {
        const params = FilterService.serializeFilters(newFilters);
        const newUrl = params ? `${pathname}?${params}` : pathname;
        router.push(newUrl, { scroll: false });
      }
      
      // Trigger callback
      opts.onFiltersChange(newFilters);
    },
    [opts, router, pathname]
  );
  
  // Update single filter field
  const updateFilter = useCallback(
    <K extends keyof UserFilter>(key: K, value: UserFilter[K]) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
    },
    [filters, setFilters]
  );
  
  // Update pending filter (without applying)
  const updatePendingFilter = useCallback(
    <K extends keyof UserFilter>(key: K, value: UserFilter[K]) => {
      setPendingFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
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
  
  // Restore filters from URL on mount (only if URL changes externally)
  useEffect(() => {
    if (opts.syncWithUrl && searchParams) {
      const urlFilters = FilterService.deserializeFromUrl(searchParams);
      // Only update if different from current
      if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
        setFiltersState(urlFilters);
        setPendingFilters(urlFilters);
      }
    }
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
