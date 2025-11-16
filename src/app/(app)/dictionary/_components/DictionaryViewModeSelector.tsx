/**
 * DictionaryViewModeSelector - View Mode Toggle
 *
 * Phase 6: User Story 3 (US3) - Rich Content Viewing Modes
 * Tasks: T87-T96
 *
 * Purpose: Toggle between Compact/Card/Detailed view modes
 * Features:
 * - View mode buttons (Compact/Card/Detailed)
 * - Persistent preference storage
 * - Responsive layout changes
 * - Accessible mode switching
 */

"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ViewMode } from "../types";
import { ListIcon, LayoutGridIcon, ListTreeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DictionaryViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * T87-T96: View Mode Selector Component
 * Provides Compact/Card/Detailed view mode toggle with persistence
 *
 * This is a fully controlled component - parent manages state and persistence
 */
export function DictionaryViewModeSelector({
  value,
  onChange,
}: DictionaryViewModeSelectorProps) {
  // T96: Focus management - keep focus on selector after mode change
  const buttonRefs = useRef<{ [key in ViewMode]?: HTMLButtonElement | null }>(
    {},
  );

  // T94: Delegate mode changes to parent (parent handles localStorage)
  const handleModeChange = (mode: ViewMode) => {
    onChange(mode);
    // T96: Keep focus on the button that was clicked
    // Focus will naturally remain on the clicked button
  };

  return (
    <div
      role="radiogroup"
      aria-label="Dictionary view mode"
      className="flex gap-1 p-1 bg-muted rounded-lg"
    >
      {/* T87: Compact view mode button */}
      <Button
        ref={(el) => (buttonRefs.current.compact = el)}
        variant={value === "compact" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("compact")}
        className={cn(
          "gap-2 transition-all",
          value === "compact" && "shadow-sm",
        )}
        role="radio"
        aria-checked={value === "compact"}
        aria-label="Compact view mode"
        title="Compact view - single line with word and brief meaning"
      >
        <ListIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Compact</span>
      </Button>

      {/* T87: Card view mode button */}
      <Button
        ref={(el) => (buttonRefs.current.card = el)}
        variant={value === "card" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("card")}
        className={cn("gap-2 transition-all", value === "card" && "shadow-sm")}
        role="radio"
        aria-checked={value === "card"}
        aria-label="Card view mode"
        title="Card view - cards with word, phonetic, and description"
      >
        <LayoutGridIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Card</span>
      </Button>

      {/* T87: Detailed view mode button */}
      <Button
        ref={(el) => (buttonRefs.current.detailed = el)}
        variant={value === "detailed" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleModeChange("detailed")}
        className={cn(
          "gap-2 transition-all",
          value === "detailed" && "shadow-sm",
        )}
        role="radio"
        aria-checked={value === "detailed"}
        aria-label="Detailed view mode"
        title="Detailed view - all fields including attributes and timestamps"
      >
        <ListTreeIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Detailed</span>
      </Button>

      {/* T95: Screen reader announcement for mode changes */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {`View mode changed to ${value}`}
      </div>
    </div>
  );
}

export default DictionaryViewModeSelector;
