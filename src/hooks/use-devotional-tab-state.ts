/**
 * useDevotionalTabState - URL state management for devotional quick access tabs
 *
 * Task: T002 [PH2]
 * Purpose: Handle URL-based tab navigation with search params for deep linking
 *
 * Features:
 * - Parse and sync tab state from URL parameters
 * - Support tab, day, and page state
 * - Clean up params when switching tabs (e.g., remove 'day' when not on daily tab)
 * - Use replace navigation to avoid polluting browser history
 */

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { QuickAccessCategory } from "@/lib/quick-access-constants";

export type DevotionalTabValue = "everyday" | "daily" | "bookmarks";

export interface DevotionalTabState {
  tab: DevotionalTabValue;
  day?: QuickAccessCategory;
  page?: number;
}

export function useDevotionalTabState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const currentState = useMemo<DevotionalTabState>(() => {
    const tab = (searchParams.get("tab") as DevotionalTabValue) || "everyday";
    const dayParam = searchParams.get("day");
    const day = dayParam?.toUpperCase() as QuickAccessCategory | undefined;
    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : undefined;

    return { tab, day, page };
  }, [searchParams]);

  // Update URL with new state
  const updateTabState = useCallback(
    (updates: Partial<DevotionalTabState>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update tab
      if (updates.tab !== undefined) {
        params.set("tab", updates.tab);

        // Clear day param if switching away from daily tab
        if (updates.tab !== "daily") {
          params.delete("day");
        }

        // Reset page on tab change unless explicitly preserved
        if (updates.page === undefined) {
          params.delete("page");
        }
      }

      // Update day (only for daily tab)
      if (updates.day !== undefined) {
        if (currentState.tab === "daily" || updates.tab === "daily") {
          params.set("day", updates.day.toLowerCase());
        }
      } else if (updates.day === null) {
        // Explicitly clear day param
        params.delete("day");
      }

      // Update page
      if (updates.page !== undefined && updates.page > 1) {
        params.set("page", updates.page.toString());
      } else if (updates.page === 1 || updates.page === undefined) {
        params.delete("page");
      }

      // Use replace to avoid polluting browser history on programmatic changes
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  return {
    currentState,
    updateTabState,
  };
}
