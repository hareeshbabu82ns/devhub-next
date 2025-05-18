import { useCallback, useEffect } from "react";

// Key constants to make code more readable
export const KEYS = {
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ENTER: "Enter",
  ESCAPE: "Escape",
  SPACE: " ",
  TAB: "Tab",
  BACKSPACE: "Backspace",
  DELETE: "Delete",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
  HOME: "Home",
  END: "End",
  CONTROL: "Ctrl",
  ALT: "Alt",
  SHIFT: "Shift",
  META: "Meta", // Command key on Mac
  COMMAND: "Command", // Command key on Mac
};

// Key modifiers
export const MODIFIERS = {
  CTRL: "ctrlKey",
  ALT: "altKey",
  SHIFT: "shiftKey",
  META: "metaKey", // Command key on Mac
};

/**
 * Represents a keyboard handler function
 * @param e - Keyboard event object
 * @returns Optional boolean indicating whether the event was handled:
 * - true: Event was handled, stop propagation
 * - undefined/void/other: Allow event to propagate
 */
export type KeyHandler = (e: KeyboardEvent) => boolean | void;

/**
 * Maps key combinations to handler functions
 *
 * Handlers can return:
 * - true: Event was handled, will stop propagation
 * - false/undefined/void: Allow event to continue propagating
 */
export type KeyHandlerMap = Record<string, KeyHandler>;

interface KeyboardNavigationOptions {
  /**
   * Map of key combinations to handler functions
   * @example { 'ArrowLeft': () => handlePrevious(), 'ArrowRight': () => handleNext() }
   */
  keyMap: KeyHandlerMap;

  /**
   * Whether keyboard navigation should be enabled
   */
  enabled?: boolean;

  /**
   * Skip handling when focus is on specific element types
   * Default: true (skips when focus is on input fields and textareas)
   */
  skipOnFormElements?: boolean;

  /**
   * Whether to prevent default browser behavior when a key is handled
   * Default: true
   */
  preventDefault?: boolean;
}

/**
 * Hook for handling keyboard navigation with customizable key mappings
 *
 * @param options - Configuration options for keyboard navigation
 * @returns Object containing navigation state
 *
 * @example
 * ```tsx
 * const { isEnabled } = useKeyboardNavigation({
 *   keyMap: {
 *     // Stop propagation for navigation keys
 *     [KEYS.ARROW_LEFT]: () => {
 *       handlePrevious();
 *       return true; // Stop propagation
 *     },
 *
 *     // Allow propagation for other keys
 *     [KEYS.ARROW_RIGHT]: () => {
 *       handleNext();
 *       // No return = allow propagation
 *     },
 *
 *     // Event handling with event object
 *     'Shift+Enter': (e) => {
 *       handleSpecialAction(e);
 *       return true; // Stop propagation
 *     },
 *   }
 * });
 * ```
 */
export function useKeyboardNavigation({
  keyMap,
  enabled = true,
  skipOnFormElements = true,
  preventDefault = true,
}: KeyboardNavigationOptions) {
  /**
   * Parses a key combination string into key and modifiers
   * @param keyCombination - A key combination like 'Shift+Enter'
   * @returns Object with key name and modifier flags
   */
  const parseKeyCombination = useCallback((keyCombination: string) => {
    const parts = keyCombination.split("+");
    const key = parts.pop() || "";

    const modifiers = {
      ctrlKey: parts.includes("Ctrl") || parts.includes("Control"),
      altKey: parts.includes("Alt"),
      shiftKey: parts.includes("Shift"),
      metaKey: parts.includes("Meta") || parts.includes("Command"),
    };

    return { key, modifiers };
  }, []);

  /**
   * Checks if an event matches a key combination
   * @param e - Keyboard event
   * @param keyCombination - Key combination to check
   * @returns Whether the event matches the key combination
   */
  const matchesKeyCombination = useCallback(
    (e: KeyboardEvent, keyCombination: string) => {
      // If it's a simple key (no modifiers)
      if (!keyCombination.includes("+")) {
        // Ensure no modifiers are pressed when we expect a simple key
        return (
          e.key === keyCombination &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.shiftKey &&
          !e.metaKey
        );
      }

      const { key, modifiers } = parseKeyCombination(keyCombination);

      return (
        e.key === key &&
        e.ctrlKey === modifiers.ctrlKey &&
        e.altKey === modifiers.altKey &&
        e.shiftKey === modifiers.shiftKey &&
        e.metaKey === modifiers.metaKey
      );
    },
    [parseKeyCombination],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if focused on form elements when skipOnFormElements is true
      if (
        skipOnFormElements &&
        (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement)
      ) {
        return;
      }

      // Check each key combination in the map
      for (const [keyCombination, handler] of Object.entries(keyMap)) {
        if (matchesKeyCombination(e, keyCombination)) {
          if (preventDefault) {
            e.preventDefault();
          }

          // Call the handler and check its return value
          const wasHandled = handler(e);

          // If the handler returns true explicitly, stop propagation
          if (wasHandled === true) {
            e.stopPropagation();
          }

          // Exit the loop since we found a matching key combination
          return;
        }
      }
    },
    [
      keyMap,
      enabled,
      skipOnFormElements,
      preventDefault,
      matchesKeyCombination,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    isEnabled: enabled,
  };
}

export default useKeyboardNavigation;
