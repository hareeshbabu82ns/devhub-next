"use client";

/**
 * Match-mode and dictionary-scope chips shown under the search box.
 * Both rows scroll sideways on narrow screens instead of wrapping.
 */

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MatchMode } from "@/lib/dictionary/lookup-query";
import {
  DICTIONARY_GROUPS,
  DictionaryGroupId,
  dictionariesInGroup,
  getDictionaryInfo,
  matchingGroup,
} from "@/lib/dictionary/dictionary-catalog";
import { CircleHelpIcon, SlidersHorizontalIcon } from "lucide-react";

export const MATCH_MODE_INFO: Record<
  MatchMode,
  { label: string; hint: string; example: string }
> = {
  smart: {
    label: "Smart",
    hint: "Exact headwords first, then words starting with it, then words containing it. Falls back to meanings when no headword matches.",
    example: "dharma",
  },
  exact: {
    label: "Exact",
    hint: "The headword is exactly this word",
    example: "yoga",
  },
  prefix: {
    label: "Starts with",
    hint: "Headwords beginning with this — compounds, derivatives",
    example: "dharma → dharmakShetra",
  },
  suffix: {
    label: "Ends with",
    hint: "Headwords ending with this — suffixes, final members of compounds",
    example: "tva, pati",
  },
  contains: {
    label: "Contains",
    hint: "The text appears anywhere in the headword",
    example: "bandh",
  },
  meaning: {
    label: "In meanings",
    hint: "Search the definitions — find a Sanskrit word from an English one. Use quotes for a phrase.",
    example: 'fire, "supreme spirit"',
  },
};

const MODES: MatchMode[] = [
  "smart",
  "exact",
  "prefix",
  "suffix",
  "contains",
  "meaning",
];

const chipClass =
  "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium whitespace-nowrap";

export function SearchTips() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="Search tips"
        >
          <CircleHelpIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] text-sm">
        <p className="font-semibold mb-2">Search tips</p>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <span className="text-foreground font-medium">Any script.</span>{" "}
            धर्म, ధర్మ, dharma (IAST / ITRANS / SLP1) all find the same word.
          </li>
          <li>
            <span className="text-foreground font-medium">Loose spelling.</span>{" "}
            krishna, siva, gyana, sanskrit match kṛṣṇa, śiva, jñāna, saṃskṛta.
            Exact spellings are listed first.
          </li>
          <li>
            <span className="text-foreground font-medium">Wildcards.</span>{" "}
            <code>*</code> = any letters, <code>?</code> = one letter.{" "}
            <code>a*ra</code>, <code>*pati</code>, <code>ra?a</code>
          </li>
          <li>
            <span className="text-foreground font-medium">English → Sanskrit.</span>{" "}
            Choose <em>In meanings</em> or the English → Sanskrit dictionaries.
          </li>
          <li>
            <span className="text-foreground font-medium">Browse.</span> Clear
            the search and pick one dictionary to page through it A→Z or jump
            to a letter.
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

interface MatchModeChipsProps {
  value: MatchMode;
  onChange: (mode: MatchMode) => void;
  disabled?: boolean;
}

export function MatchModeChips({ value, onChange, disabled }: MatchModeChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="How to match"
      className="flex gap-1.5 overflow-x-auto no-scrollbar"
    >
      {MODES.map((mode) => {
        const active = mode === value;
        return (
          <Button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={MATCH_MODE_INFO[mode].hint}
            variant={active ? "default" : "outline"}
            className={chipClass}
            onClick={() => onChange(mode)}
          >
            {MATCH_MODE_INFO[mode].label}
          </Button>
        );
      })}
    </div>
  );
}

interface DictionaryScopeChipsProps {
  origins: string[];
  onChange: (origins: string[]) => void;
  onCustomize: () => void;
}

export function DictionaryScopeChips({
  origins,
  onChange,
  onCustomize,
}: DictionaryScopeChipsProps) {
  const group = matchingGroup(origins);
  const isAll = origins.length === 0;
  const isCustom = !isAll && !group;

  const customLabel =
    origins.length === 1
      ? getDictionaryInfo(origins[0]).short
      : `${origins.length} dictionaries`;

  return (
    <div
      role="radiogroup"
      aria-label="Dictionaries"
      className="flex gap-1.5 overflow-x-auto no-scrollbar"
    >
      <Button
        type="button"
        role="radio"
        aria-checked={isAll}
        variant={isAll ? "secondary" : "ghost"}
        className={cn(chipClass, isAll && "ring-1 ring-primary/40")}
        onClick={() => onChange([])}
      >
        All dictionaries
      </Button>
      {isCustom && (
        <Button
          type="button"
          role="radio"
          aria-checked
          variant="secondary"
          className={cn(chipClass, "ring-1 ring-primary/40")}
          onClick={onCustomize}
        >
          {customLabel}
        </Button>
      )}
      {DICTIONARY_GROUPS.map((g) => {
        const active = group === g.id;
        return (
          <Button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={g.description}
            variant={active ? "secondary" : "ghost"}
            className={cn(chipClass, active && "ring-1 ring-primary/40")}
            onClick={() => onChange(dictionariesInGroup(g.id as DictionaryGroupId))}
          >
            {g.label}
          </Button>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        className={cn(chipClass, "gap-1.5 text-muted-foreground")}
        onClick={onCustomize}
      >
        <SlidersHorizontalIcon className="size-3.5" />
        Choose…
      </Button>
    </div>
  );
}
