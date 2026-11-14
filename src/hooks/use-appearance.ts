"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  APPEARANCE_DEFAULTS,
  APPEARANCE_STORAGE_PREFIX,
  type AppearanceKey,
} from "@/config/themes";

const EVENT = "devhub-appearance-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: AppearanceKey): string {
  try {
    return (
      localStorage.getItem(APPEARANCE_STORAGE_PREFIX + key) ??
      APPEARANCE_DEFAULTS[key]
    );
  } catch {
    return APPEARANCE_DEFAULTS[key];
  }
}

/**
 * One appearance choice (paper / board / accent): persisted in localStorage
 * and mirrored to a `data-*` attribute on <html>, which the CSS keys off.
 */
export function useAppearance(key: AppearanceKey) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => APPEARANCE_DEFAULTS[key],
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(APPEARANCE_STORAGE_PREFIX + key, next);
      } catch {
        // Private mode: still apply for this page view.
      }
      document.documentElement.setAttribute(`data-${key}`, next);
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, setValue] as const;
}

export const APPEARANCE_CHANGE_EVENT = EVENT;
