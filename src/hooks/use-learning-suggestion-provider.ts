"use client";

import { useMemo, useCallback } from "react";
import { LearningSuggestionProvider } from "@/lib/sanscript/learning-suggestion-provider";

/**
 * Hook to create and manage a LearningSuggestionProvider instance
 *
 * Features:
 * - Memoized provider instance (created once per component mount)
 * - Records user selection for learning
 * - Provides usage statistics
 * - Client-side only (localStorage-based)
 *
 * @param options - Configuration options
 * @returns LearningSuggestionProvider instance with helper methods
 */
export function useLearningSuggestionProvider(options?: {
  storageKey?: string;
  maxSize?: number;
}) {
  const provider = useMemo(() => {
    return new LearningSuggestionProvider(
      options?.storageKey || "webime:learning",
      options?.maxSize || 1000,
    );
  }, [options?.storageKey, options?.maxSize]);

  // Helper to record usage
  const recordUsage = useCallback(
    (word: string) => {
      provider.recordUsage(word);
    },
    [provider],
  );

  // Helper to get stats
  const getStats = useCallback(() => {
    return provider.getUsageStats();
  }, [provider]);

  // Helper to clear history
  const clearHistory = useCallback(() => {
    provider.clearHistory();
  }, [provider]);

  // Helper to export history
  const exportHistory = useCallback(() => {
    return provider.exportHistory();
  }, [provider]);

  // Helper to import history
  const importHistory = useCallback(
    (json: string) => {
      provider.importHistory(json);
    },
    [provider],
  );

  return {
    provider,
    recordUsage,
    getStats,
    clearHistory,
    exportHistory,
    importHistory,
  };
}
