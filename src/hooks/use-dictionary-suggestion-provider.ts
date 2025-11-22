"use client";

import { useMemo } from "react";
import { DictionarySuggestionProvider } from "@/lib/sanscript/dictionary-suggestion-provider";

/**
 * Hook to create and manage a DictionarySuggestionProvider instance
 *
 * Features:
 * - Memoized provider instance (created once per component mount)
 * - Configurable cache size and TTL
 * - Client-side only (database queries)
 *
 * @param options - Configuration options
 * @returns DictionarySuggestionProvider instance
 */
export function useDictionarySuggestionProvider(options?: {
  cacheSize?: number;
  cacheTTL?: number;
}) {
  const provider = useMemo(() => {
    return new DictionarySuggestionProvider(
      options?.cacheSize || 100,
      options?.cacheTTL || 5 * 60 * 1000, // 5 minutes default
    );
  }, [options?.cacheSize, options?.cacheTTL]);

  return provider;
}
