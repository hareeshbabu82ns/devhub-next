/**
 * useKeyboardShortcuts - Generic keyboard shortcut handler for multiple shortcuts
 *
 * Task: T003 [PH2]
 * Purpose: Handle multiple keyboard shortcuts with conflict detection
 *
 * Features:
 * - Register multiple shortcuts at once
 * - Conflict detection and warning
 * - Conditional enabling/disabling
 * - Support for simple key combinations without complex modifiers
 */

"use client";

import { useEffect, useCallback, useRef } from "react";

export interface ShortcutConfig {
  key: string;
  handler: () => void;
  description?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutConfig[];
  enabled?: boolean;
  ignoreWhenInputFocused?: boolean;
}

/**
 * Hook for handling multiple keyboard shortcuts
 * @param options Configuration for keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 't', handler: () => jumpToToday(), description: 'Jump to today' },
 *     { key: 's', handler: () => openSearch(), description: 'Open search' },
 *     { key: 'ArrowLeft', handler: () => previousDay(), description: 'Previous day' },
 *     { key: 'ArrowRight', handler: () => nextDay(), description: 'Next day' }
 *   ],
 *   enabled: true,
 *   ignoreWhenInputFocused: true
 * });
 * ```
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  ignoreWhenInputFocused = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Detect conflicts on mount
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const keyMap = new Map<string, ShortcutConfig[]>();

      shortcuts.forEach((shortcut) => {
        const key = `${shortcut.key}-${shortcut.ctrlKey || false}-${shortcut.metaKey || false}-${shortcut.shiftKey || false}-${shortcut.altKey || false}`;
        const existing = keyMap.get(key) || [];
        existing.push(shortcut);
        keyMap.set(key, existing);
      });

      keyMap.forEach((configs, key) => {
        if (configs.length > 1) {
          console.warn(
            `[useKeyboardShortcuts] Conflict detected for key combination: ${key}`,
            configs.map((c) => c.description || c.handler.name),
          );
        }
      });
    }
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if focus is on an input element
      if (ignoreWhenInputFocused) {
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (isInput) return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : true;
        const metaMatches = shortcut.metaKey ? event.metaKey : true;
        const shiftMatches = shortcut.shiftKey ? event.shiftKey : true;
        const altMatches = shortcut.altKey ? event.altKey : true;

        return (
          keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches
        );
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        matchingShortcut.handler();
      }
    },
    [enabled, ignoreWhenInputFocused],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

export default useKeyboardShortcuts;
