/**
 * SearchModeToggle - Search Mode Selection Component
 *
 * Phase 13: Dictionary Enhancements - Key-based Word Field Search
 * Task: T210
 *
 * Purpose: Toggle between Full-Text, Exact, and Prefix search modes
 * Features:
 * - Radio button group (three options)
 * - Mobile-responsive (single-select chips, 48px min height)
 * - Desktop-responsive (segmented control with hover tooltips)
 * - Accessible mode switching with ARIA labels
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchMode } from "@/lib/dictionary/types";
import { SearchIcon, TargetIcon, ZapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchModeToggleProps {
  value: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
}

/**
 * T210: Search Mode Toggle Component
 * Provides Full-Text/Exact/Prefix search mode toggle
 *
 * This is a fully controlled component - parent manages state and persistence
 */
export function SearchModeToggle({
  value,
  onChange,
  className,
}: SearchModeToggleProps) {
  // Focus management - keep focus on selector after mode change
  const buttonRefs = useRef<{ [key in SearchMode]?: HTMLButtonElement | null }>(
    {},
  );

  // T217: ARIA live region for announcing mode changes
  const [announcement, setAnnouncement] = useState("");

  // Delegate mode changes to parent (parent handles persistence)
  const handleModeChange = (mode: SearchMode) => {
    onChange(mode);

    // T217: Announce mode change to screen readers
    const modeLabel = modes.find((m) => m.value === mode)?.label || mode;
    setAnnouncement(`Search mode changed to ${modeLabel}`);

    // Clear announcement after screen reader processes it
    setTimeout(() => setAnnouncement(""), 1000);
  };

  // Ensure focus stays on selected button after mode change
  useEffect(() => {
    if (buttonRefs.current[value]) {
      buttonRefs.current[value]?.focus();
    }
  }, [value]);

  // Mode configurations with icons, labels, tooltips, and examples (T216)
  const modes: Array<{
    value: SearchMode;
    icon: typeof SearchIcon;
    label: string;
    tooltip: string;
    example: string;
  }> = [
    {
      value: SearchMode.FULLTEXT,
      icon: SearchIcon,
      label: "Full-Text",
      tooltip: "Search across all text using MongoDB full-text index",
      example: "Try: dharma, yoga, meditation",
    },
    {
      value: SearchMode.KEY_EXACT,
      icon: TargetIcon,
      label: "Exact",
      tooltip: "Match exact word only (case-sensitive for Indic scripts)",
      example: "Try: धर्म, yoga, నమః",
    },
    {
      value: SearchMode.KEY_PREFIX,
      icon: ZapIcon,
      label: "Prefix",
      tooltip: "Match words starting with query (best for autocomplete)",
      example: "Try: dh, yog, नम",
    },
  ];

  return (
    <div role="radiogroup" aria-label="Search mode" className={className}>
      {/* T217: ARIA live region for mode change announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      <TooltipProvider delayDuration={300}>
        <ButtonGroup>
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = value === mode.value;

            return (
              <Tooltip key={mode.value}>
                <TooltipTrigger asChild>
                  <Button
                    ref={(el) => {
                      buttonRefs.current[mode.value] = el;
                    }}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleModeChange(mode.value)}
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${mode.label} search mode`}
                    className={cn(
                      "min-h-12 gap-2 px-3 transition-all sm:min-h-9",
                      isActive && "shadow-sm",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{mode.label}</span>
                    <span className="sm:hidden">{mode.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="max-w-[280px] text-center text-xs"
                >
                  <p className="font-semibold">{mode.label} Search</p>
                  <p className="mt-1 text-muted-foreground">{mode.tooltip}</p>
                  <p className="mt-2 text-xs text-primary font-medium">
                    {mode.example}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ButtonGroup>
      </TooltipProvider>
    </div>
  );
}

/**
 * Mobile-optimized chip variant (for compact layouts)
 * Single-select chips with 48px min height
 */
export function SearchModeChips({
  value,
  onChange,
  className,
}: SearchModeToggleProps) {
  const modes: Array<{
    value: SearchMode;
    icon: typeof SearchIcon;
    label: string;
  }> = [
    {
      value: SearchMode.FULLTEXT,
      icon: SearchIcon,
      label: "Full-Text",
    },
    {
      value: SearchMode.KEY_EXACT,
      icon: TargetIcon,
      label: "Exact Match",
    },
    {
      value: SearchMode.KEY_PREFIX,
      icon: ZapIcon,
      label: "Prefix",
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Search mode"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.value;

        return (
          <Button
            key={mode.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(mode.value)}
            role="radio"
            aria-checked={isActive}
            aria-label={`${mode.label} search mode`}
            className={cn(
              "min-h-12 gap-2 rounded-full px-4",
              isActive && "shadow-sm",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{mode.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
