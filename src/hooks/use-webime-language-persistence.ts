"use client";

import { useCallback, useEffect, useState } from "react";
import { LANGUAGE_TO_TRANSLITERATION_DDLB } from "@/app/(app)/sanscript/_components/utils";
import { getAnalyticsManager } from "@/lib/sanscript/language-analytics";

/**
 * Hook for persisting WebIME language selection to localStorage with SSR-safe hydration
 *
 * Features:
 * - SSR-safe: Returns null initially, loads from localStorage after client hydration
 * - Language validation: Verifies stored language exists in LANGUAGE_TO_TRANSLITERATION_DDLB
 * - Configurable storage keys: Support context-specific keys like "webimeLanguage:dictionary"
 * - Fallback chain: stored language → prop language → "NONE" default
 * - Auto-save: Debounced localStorage write (200ms) on language change
 *
 * @param propLanguage - Language provided via component prop (optional)
 * @param storageKey - localStorage key for persistence (default: "webimeLanguage")
 * @returns { language, setLanguage, isLanguagePersisted }
 */
export function useWebIMELanguagePersistence(
  propLanguage?: string,
  storageKey: string = "webimeLanguage",
) {
  // Start with null to avoid hydration mismatch
  const [language, setLanguageState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLanguagePersisted, setIsLanguagePersisted] = useState(false);
  const [userHasSelectedLanguage, setUserHasSelectedLanguage] = useState(false);

  // Load from localStorage after hydration with migration support
  useEffect(() => {
    setIsHydrated(true);

    try {
      let storedLanguage = localStorage.getItem(storageKey);

      // Migration logic: Check for old "webimeLanguage" key if using a context-specific key
      if (
        !storedLanguage &&
        storageKey !== "webimeLanguage" &&
        storageKey.startsWith("webimeLanguage:")
      ) {
        const oldKey = "webimeLanguage";
        const oldLanguage = localStorage.getItem(oldKey);

        if (oldLanguage && LANGUAGE_TO_TRANSLITERATION_DDLB[oldLanguage]) {
          console.log(
            `Migrating language preference from "${oldKey}" to "${storageKey}"`,
          );
          // Migrate to new key
          localStorage.setItem(storageKey, oldLanguage);
          storedLanguage = oldLanguage;

          // Optionally remove old key (commented out to preserve for other contexts)
          // localStorage.removeItem(oldKey);
        }
      }

      if (storedLanguage) {
        // Validate stored language exists in available options
        if (LANGUAGE_TO_TRANSLITERATION_DDLB[storedLanguage]) {
          setLanguageState(storedLanguage);
          setIsLanguagePersisted(true);
          return;
        } else {
          // Invalid stored language, clear it
          console.warn(
            `Invalid stored language "${storedLanguage}" for key "${storageKey}". Clearing.`,
          );
          localStorage.removeItem(storageKey);
        }
      }

      // Fallback chain: no valid stored language → use prop or default
      const fallbackLanguage = propLanguage || "NONE";
      setLanguageState(fallbackLanguage);
      setIsLanguagePersisted(false);
    } catch (error) {
      console.error(`Error reading localStorage key "${storageKey}":`, error);
      // Fallback on error
      setLanguageState(propLanguage || "NONE");
      setIsLanguagePersisted(false);
    }
  }, [storageKey, propLanguage]);

  // Sync with prop changes (only if user hasn't manually selected)
  useEffect(() => {
    if (
      isHydrated &&
      propLanguage !== undefined &&
      propLanguage !== language &&
      !userHasSelectedLanguage
    ) {
      setLanguageState(propLanguage);
      setIsLanguagePersisted(false);
    }
  }, [propLanguage, language, isHydrated, userHasSelectedLanguage]);

  // Debounced auto-save to localStorage
  const setLanguage = useCallback(
    (newLanguage: string) => {
      setLanguageState(newLanguage);
      setUserHasSelectedLanguage(true);
      setIsLanguagePersisted(true);

      // Record analytics (extract context from storage key)
      const context = storageKey.includes(":")
        ? storageKey.split(":")[1]
        : undefined;
      const analyticsManager = getAnalyticsManager();
      analyticsManager.recordUsage(newLanguage, context);

      // Debounced write to avoid excessive localStorage writes
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, newLanguage);
        } catch (error) {
          console.error(
            `Error writing to localStorage key "${storageKey}":`,
            error,
          );
        }
      }, 200);

      // Store timeout ID for potential cleanup
      return () => clearTimeout(timeoutId);
    },
    [storageKey],
  );

  // Clear persisted language (reset to default)
  const resetLanguage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      const defaultLanguage = propLanguage || "NONE";
      setLanguageState(defaultLanguage);
      setIsLanguagePersisted(false);
      setUserHasSelectedLanguage(false);
    } catch (error) {
      console.error(`Error removing localStorage key "${storageKey}":`, error);
    }
  }, [storageKey, propLanguage]);

  return {
    language: language || propLanguage || "NONE", // Return fallback until hydrated
    setLanguage,
    resetLanguage,
    isLanguagePersisted,
    isHydrated,
    userHasSelectedLanguage,
    setUserHasSelectedLanguage,
  };
}

/**
 * Storage key helper for context-specific namespacing
 */
export const WEBIME_STORAGE_KEYS = {
  DEFAULT: "webimeLanguage",
  DICTIONARY: "webimeLanguage:dictionary",
  ENTITY: "webimeLanguage:entity",
  SANSCRIPT: "webimeLanguage:sanscript",
} as const;
