"use client";

import { useMemo } from "react";
import { StaticSuggestionProvider } from "@/lib/sanscript/static-suggestion-provider";

/**
 * Hook to create and manage a StaticSuggestionProvider instance
 *
 * Features:
 * - Memoized provider instance (created once per component mount)
 * - Preloaded with default Sanskrit/Telugu word lists
 * - No database dependency (fully client-side)
 *
 * @returns StaticSuggestionProvider instance
 */
export function useStaticSuggestionProvider() {
  const provider = useMemo(() => {
    return new StaticSuggestionProvider();
  }, []);

  return provider;
}
