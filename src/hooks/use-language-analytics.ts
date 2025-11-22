/**
 * Hook for Language Analytics
 *
 * React hook wrapper for LanguageAnalyticsManager
 */

import { useEffect, useState, useCallback } from "react";
import {
  getAnalyticsManager,
  type LanguageAnalytics,
  type LanguageUsageEntry,
} from "@/lib/sanscript/language-analytics";

/**
 * Hook for tracking and analyzing language usage
 */
export function useLanguageAnalytics() {
  const [analytics, setAnalytics] = useState<LanguageAnalytics | null>(null);
  const [manager] = useState(() => getAnalyticsManager());

  // Load analytics on mount
  useEffect(() => {
    setAnalytics(manager.getAnalytics());
  }, [manager]);

  /**
   * Record a language usage event
   */
  const recordUsage = useCallback(
    (language: string, context?: string) => {
      manager.recordUsage(language, context);
      setAnalytics(manager.getAnalytics());
    },
    [manager],
  );

  /**
   * Get usage stats for a specific language
   */
  const getLanguageStats = useCallback(
    (language: string): LanguageUsageEntry | undefined => {
      return manager.getLanguageStats(language);
    },
    [manager],
  );

  /**
   * Get top N most used languages
   */
  const getTopLanguages = useCallback(
    (n: number = 5): LanguageUsageEntry[] => {
      return manager.getTopLanguages(n);
    },
    [manager],
  );

  /**
   * Get recent languages
   */
  const getRecentLanguages = useCallback(
    (exclude?: string, limit: number = 5): string[] => {
      return manager.getRecentLanguages(exclude, limit);
    },
    [manager],
  );

  /**
   * Clear all analytics
   */
  const clearAnalytics = useCallback(() => {
    manager.clearAnalytics();
    setAnalytics(manager.getAnalytics());
  }, [manager]);

  /**
   * Export analytics as JSON
   */
  const exportAnalytics = useCallback((): string => {
    return manager.exportAnalytics();
  }, [manager]);

  /**
   * Import analytics from JSON
   */
  const importAnalytics = useCallback(
    (json: string): boolean => {
      const success = manager.importAnalytics(json);
      if (success) {
        setAnalytics(manager.getAnalytics());
      }
      return success;
    },
    [manager],
  );

  return {
    analytics,
    recordUsage,
    getLanguageStats,
    getTopLanguages,
    getRecentLanguages,
    clearAnalytics,
    exportAnalytics,
    importAnalytics,
  };
}
