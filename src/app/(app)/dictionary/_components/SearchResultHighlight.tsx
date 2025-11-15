/**
 * SearchResultHighlight - Word-Level Highlighting Component
 * 
 * Phase 4: User Story 1 (US1) - Enhanced Full-Text Search
 * Task: T119
 * 
 * Purpose: Highlight search matches in dictionary results
 * Features:
 * - Word boundary detection (preserves Indic ligatures)
 * - Multi-script support (Devanagari, Telugu, Latin)
 * - Touch-friendly highlighted regions (min 44x44px if interactive)
 * - Accessible highlighting with ARIA
 */

"use client";

import { highlightText, MatchType } from "@/lib/dictionary/highlight-utils";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SearchResultHighlightProps {
  text: string;
  searchTerm: string;
  language?: string;
  className?: string;
  /**
   * Whether to make highlighted text visually distinct
   * Default: true
   */
  showHighlight?: boolean;
  /**
   * ARIA label for screen readers
   */
  ariaLabel?: string;
}

/**
 * T119: Highlight search matches with word boundary preservation
 * Preserves Indic script ligatures and complex character combinations
 */
export function SearchResultHighlight({
  text,
  searchTerm,
  language,
  className,
  showHighlight = true,
  ariaLabel,
}: SearchResultHighlightProps) {
  // Memoize highlighting to avoid recalculation on every render
  const segments = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [
        {
          text,
          highlighted: false,
          matchType: MatchType.NONE,
          start: 0,
          end: text.length,
        },
      ];
    }
    return highlightText(text, searchTerm, false);
  }, [text, searchTerm]);

  // If no search term or highlighting disabled, return plain text
  if (!showHighlight || !searchTerm || searchTerm.trim().length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={cn("inline", className)}
      role="text"
      aria-label={ariaLabel || `Search result for "${searchTerm}"`}
    >
      {segments.map((segment, index) => {
        if (!segment.highlighted) {
          return <span key={index}>{segment.text}</span>;
        }

        // Highlighted segment with visual styling
        return (
          <mark
            key={index}
            className={cn(
              "bg-yellow-200 dark:bg-yellow-700 rounded-sm px-0.5",
              "font-medium",
              // Match type specific styling
              segment.matchType === MatchType.EXACT && "bg-yellow-300 dark:bg-yellow-600",
              segment.matchType === MatchType.PREFIX && "bg-yellow-200 dark:bg-yellow-700",
              segment.matchType === MatchType.CONTAINS && "bg-yellow-100 dark:bg-yellow-800"
            )}
            aria-label={`Matched ${segment.matchType} for "${searchTerm}"`}
          >
            {segment.text}
          </mark>
        );
      })}
    </span>
  );
}

export default SearchResultHighlight;
