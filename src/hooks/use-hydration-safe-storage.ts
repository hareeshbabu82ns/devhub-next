"use client";

import { useEffect, useState } from "react";

/**
 * A hydration-safe hook for reading from localStorage
 * This prevents hydration mismatches by returning undefined/fallback on the server
 * and only reading from localStorage after hydration is complete.
 *
 * @param key - The localStorage key to read from
 * @param fallback - Fallback value to use during SSR and if localStorage is empty
 * @returns The value from localStorage or the fallback value
 */
export function useHydrationSafeLocalStorage<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This effect only runs on the client after hydration
    setIsHydrated(true);

    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setValue(JSON.parse(item));
      } else {
        setValue(fallback);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setValue(fallback);
    }
  }, [key, fallback]);

  // Return fallback until hydrated, then return actual value
  return isHydrated ? value : fallback;
}

/**
 * A hydration-safe hook for reading from localStorage with null as default
 * This is useful when you need to distinguish between "not loaded yet" and "empty"
 *
 * @param key - The localStorage key to read from
 * @returns The value from localStorage, null if empty, or undefined if not hydrated yet
 */
export function useHydrationSafeLocalStorageWithNull<T>(
  key: string,
): T | null | undefined {
  const [value, setValue] = useState<T | null | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This effect only runs on the client after hydration
    setIsHydrated(true);

    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setValue(JSON.parse(item));
      } else {
        setValue(null);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setValue(null);
    }
  }, [key]);

  // Return undefined until hydrated, then return actual value or null
  return isHydrated ? value : undefined;
}

/**
 * A simplified version that matches the useReadLocalStorage API from usehooks-ts
 * but with hydration safety
 *
 * @param key - The localStorage key to read from
 * @returns The value from localStorage or null if not found/not hydrated
 */
export function useReadLocalStorageHydrationSafe<T>(key: string): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setValue(null);
    }
  }, [key]);

  return value;
}
