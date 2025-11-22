/**
 * Search History Hook
 * 
 * Phase 7: User Story 4 (US4) - Saved Searches and Query History
 * Tasks: T103, T104, T108
 * 
 * Purpose: Track search history in localStorage for anonymous users
 * Features:
 * - Track last 20 queries with timestamps
 * - Persist to localStorage
 * - Retrieve history
 * - Clear history
 * - Automatic deduplication
 */

"use client";

import { useState, useEffect, useCallback } from "react";

const SEARCH_HISTORY_KEY = "dictionary-search-history";
const MAX_HISTORY_ITEMS = 20;

export interface SearchHistoryItem {
  queryText: string;
  filters?: Record<string, any>;
  timestamp: string; // ISO date string
}

/**
 * T103-T104: Hook for managing search history in localStorage
 * T108: Fallback for anonymous users (limit 50 searches, but showing last 20)
 */
export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setSearchHistory(parsed);
      }
    } catch (error) {
      console.error("Error loading search history:", error);
      setSearchHistory([]);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((history: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      setSearchHistory(history);
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  }, []);

  // Add a search to history
  const addToHistory = useCallback(
    (queryText: string, filters?: Record<string, any>) => {
      // Don't add empty searches
      if (!queryText || queryText.trim().length === 0) {
        return;
      }

      const newItem: SearchHistoryItem = {
        queryText,
        filters,
        timestamp: new Date().toISOString(),
      };

      // Remove duplicate entries (same query text)
      const filtered = searchHistory.filter(
        (item) => item.queryText !== queryText
      );

      // Add new item at the beginning
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

      saveHistory(updated);
    },
    [searchHistory, saveHistory]
  );

  // Clear all history
  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  }, []);

  // Remove a specific item from history
  const removeFromHistory = useCallback(
    (timestamp: string) => {
      const updated = searchHistory.filter(
        (item) => item.timestamp !== timestamp
      );
      saveHistory(updated);
    },
    [searchHistory, saveHistory]
  );

  // T109: Export history for migration to saved searches
  const exportHistory = useCallback(() => {
    return searchHistory.map((item) => ({
      name: `Search: ${item.queryText}`,
      queryText: item.queryText,
      filters: item.filters,
      sortBy: "relevance",
      sortOrder: "desc",
    }));
  }, [searchHistory]);

  return {
    searchHistory,
    addToHistory,
    clearHistory,
    removeFromHistory,
    exportHistory,
  };
}
