/**
 * useKeyboardShortcut - Global keyboard shortcut hook
 * 
 * Task: T112 [US7]
 * Purpose: Handle global keyboard shortcuts (like Ctrl/Cmd+Shift+D for dictionary popup)
 * 
 * Features:
 * - Cross-platform support (Ctrl on Windows/Linux, Cmd on Mac)
 * - Customizable shortcut combinations
 * - Global event listener
 */

"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

interface UseKeyboardShortcutOptions {
  shortcut: KeyboardShortcut;
  onTrigger: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling global keyboard shortcuts
 * @param options Configuration for the keyboard shortcut
 * 
 * @example
 * ```tsx
 * useKeyboardShortcut({
 *   shortcut: { key: 'D', ctrl: true, shift: true, meta: true },
 *   onTrigger: () => openPopup(),
 *   enabled: true
 * });
 * ```
 */
export function useKeyboardShortcut({
  shortcut,
  onTrigger,
  enabled = true,
}: UseKeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      // Check modifiers (ctrl or meta for cross-platform support)
      const ctrlMatches = shortcut.ctrl ? event.ctrlKey : true;
      const metaMatches = shortcut.meta ? event.metaKey : true;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;

      // On Mac, use Meta (Cmd) instead of Ctrl
      const isMac = typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.platform);
      const modifierMatches = isMac 
        ? (metaMatches && shiftMatches && altMatches)
        : (ctrlMatches && shiftMatches && altMatches);

      if (keyMatches && modifierMatches) {
        event.preventDefault();
        event.stopPropagation();
        onTrigger();
      }
    },
    [shortcut, onTrigger, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

export default useKeyboardShortcut;
