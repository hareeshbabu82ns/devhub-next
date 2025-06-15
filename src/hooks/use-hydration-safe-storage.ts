"use client";

import { useEffect, useState } from "react";

/**
 * A hydration-safe hook for reading from localStorage with fallback value
 * This prevents hydration mismatches by returning undefined/fallback on the server
 * and only reading from localStorage after hydration is complete.
 *
 * @param key - The localStorage key to read from
 * @param fallback - Fallback value to use during SSR and if localStorage is empty
 * @returns The value from localStorage or the fallback value
 */
export function useReadLocalStorageWithFallback<T>(
  key: string,
  fallback: T,
): T {
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
export function useReadLocalStorage<T>(key: string): T | null {
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

/**
 * A hydration-safe hook for writing to localStorage
 * This provides a safe way to write to localStorage that handles:
 * - SSR/hydration safety
 * - Error handling
 * - Type safety
 * - Automatic JSON serialization
 *
 * @param key - The localStorage key to write to
 * @param initialValue - Initial value to use during SSR and as fallback
 * @returns A tuple with [value, setValue, removeValue, isHydrated]
 */
export function useHydrationSafeLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void, () => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize value from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);

    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const parsedValue = JSON.parse(item);
        setStoredValue(parsedValue);
      } else {
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  // Function to update localStorage and state
  const setValue = (value: T) => {
    try {
      // Update state immediately for optimistic UI
      setStoredValue(value);

      // Only write to localStorage if we're on the client
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      // Revert state on error
      setStoredValue(storedValue);
    }
  };

  // Function to remove the key from localStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue);

      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue, isHydrated];
}

/**
 * A simplified hydration-safe localStorage writer hook
 * This is a write-only version that doesn't manage state internally
 *
 * @returns A function to safely write to localStorage
 */
export function useLocalStorageWriter(): {
  writeToStorage: <T>(key: string, value: T) => void;
  removeFromStorage: (key: string) => void;
  isClient: boolean;
} {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const writeToStorage = <T>(key: string, value: T) => {
    if (!isClient) {
      console.warn("Attempted to write to localStorage before hydration");
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  };

  const removeFromStorage = (key: string) => {
    if (!isClient) {
      console.warn("Attempted to remove from localStorage before hydration");
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return {
    writeToStorage,
    removeFromStorage,
    isClient,
  };
}

/**
 * A complete localStorage hook with read and write capabilities
 * This combines reading and writing with full hydration safety
 *
 * @param key - The localStorage key
 * @param defaultValue - Default value to use during SSR and if localStorage is empty
 * @returns Object with value, setValue, removeValue, and hydration status
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue, removeValue, isHydrated] =
    useHydrationSafeLocalStorage(key, defaultValue);

  return {
    value,
    setValue,
    removeValue,
    isHydrated,
    isReady: isHydrated,
  };
}

/**
 * Hook for localStorage operations with additional utilities
 * Provides more granular control over localStorage operations
 *
 * @param key - The localStorage key
 * @param options - Configuration options
 * @returns Object with localStorage operations and state
 */
export function useLocalStorageState<T>(
  key: string,
  options: {
    defaultValue: T;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  },
) {
  const {
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    setIsHydrated(true);
    setError(null);

    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const value = deserialize(item);
        setStoredValue(value);
      } else {
        setStoredValue(defaultValue);
      }
    } catch (err) {
      const errorMessage = `Error reading localStorage key "${key}": ${err}`;
      console.warn(errorMessage);
      setError(errorMessage);
      setStoredValue(defaultValue);
    }
  }, [key, defaultValue, deserialize]);

  const setValue = (value: T | ((prevValue: T) => T)) => {
    try {
      setError(null);

      // Handle function updates
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (err) {
      const errorMessage = `Error writing to localStorage key "${key}": ${err}`;
      console.error(errorMessage);
      setError(errorMessage);
    }
  };

  const removeValue = () => {
    try {
      setError(null);
      setStoredValue(defaultValue);

      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch (err) {
      const errorMessage = `Error removing localStorage key "${key}": ${err}`;
      console.error(errorMessage);
      setError(errorMessage);
    }
  };

  return {
    value: storedValue,
    setValue,
    removeValue,
    isHydrated,
    error,
    hasError: error !== null,
  };
}
