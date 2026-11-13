/**
 * DictionaryFilters - search options sheet
 *
 * Dictionaries (grouped, with select-all per group), how to match, sort and
 * view. Choices are drafted in the sheet and applied together; the view
 * mode applies immediately since it only changes the display.
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MatchMode, MATCH_MODES } from "@/lib/dictionary/lookup-query";
import type { LookupSort } from "@/lib/dictionary/lookup-service";
import {
  DICTIONARY_CATALOG,
  DICTIONARY_GROUPS,
} from "@/lib/dictionary/dictionary-catalog";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { ViewMode } from "../types";
import DictionaryViewModeSelector from "./DictionaryViewModeSelector";
import { MATCH_MODE_INFO } from "./DictionarySearchControls";
import { DictionaryUrlStateApi } from "./use-dictionary-url-state";

interface DictionaryFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  state: DictionaryUrlStateApi;
}

const SORT_OPTIONS: { value: LookupSort | "auto"; label: string; hint: string }[] = [
  { value: "auto", label: "Automatic", hint: "Best match when searching, dictionary order when browsing" },
  { value: "relevance", label: "Best match", hint: "Exact words first, then shorter words" },
  { value: "dictionary", label: "Dictionary order", hint: "As the entries appear in each dictionary" },
  { value: "alphabetical", label: "Latin A–Z", hint: "By romanised spelling" },
];

export function DictionaryFilters({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
  state,
}: DictionaryFiltersProps) {
  const [origins, setOrigins] = useState<string[]>(state.origins);
  const [mode, setMode] = useState<MatchMode>(state.mode);
  const [sort, setSort] = useState<LookupSort | "auto">(state.sortParam ?? "auto");
  const [order, setOrder] = useState<"asc" | "desc">(state.order);

  // Start each opening from the current search
  useEffect(() => {
    if (open) {
      setOrigins(state.origins);
      setMode(state.mode);
      setSort(state.sortParam ?? "auto");
      setOrder(state.order);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = new Set(origins);
  const toggle = (code: string, on: boolean) =>
    setOrigins((prev) =>
      on ? [...new Set([...prev, code])] : prev.filter((c) => c !== code),
    );
  const setGroup = (codes: string[], on: boolean) =>
    setOrigins((prev) =>
      on
        ? [...new Set([...prev, ...codes])]
        : prev.filter((c) => !codes.includes(c)),
    );

  const apply = () => {
    state.restore({
      query: state.query,
      mode,
      origins,
      sort: sort === "auto" ? null : sort,
      order,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-md flex flex-col gap-0 p-0"
        aria-label="Dictionary search options"
      >
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontalIcon className="size-5" aria-hidden="true" />
            Search options
          </SheetTitle>
          <SheetDescription>
            Choose dictionaries, how words match, and how results are ordered.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-7">
          {/* Dictionaries */}
          <section className="space-y-3" aria-labelledby="opt-dicts">
            <div className="flex items-center justify-between gap-2">
              <h3 id="opt-dicts" className="text-base font-medium">
                Dictionaries
              </h3>
              <span className="text-xs text-muted-foreground">
                {origins.length === 0 ? "All" : `${origins.length} selected`}
              </span>
            </div>
            <Button
              type="button"
              variant={origins.length === 0 ? "secondary" : "outline"}
              className="w-full h-11 justify-start"
              onClick={() => setOrigins([])}
            >
              {origins.length === 0 && <CheckIcon className="size-4 mr-2" />}
              Search all dictionaries
            </Button>
            {DICTIONARY_GROUPS.map((group) => {
              const items = DICTIONARY_CATALOG.filter((d) => d.group === group.id);
              const codes = items.map((d) => d.code);
              const chosen = codes.filter((c) => selected.has(c)).length;
              const all = chosen === codes.length;
              return (
                <div key={group.id} className="rounded-lg border border-border/50">
                  <label className="flex items-center gap-3 px-3 min-h-12 cursor-pointer bg-muted/30 rounded-t-lg">
                    <Checkbox
                      checked={all ? true : chosen > 0 ? "indeterminate" : false}
                      onCheckedChange={(v) => setGroup(codes, v === true)}
                      aria-label={`All ${group.label}`}
                      className="size-5"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-sm">{group.label}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {group.description}
                      </span>
                    </span>
                  </label>
                  <ul className="divide-y divide-border/40">
                    {items.map((d) => (
                      <li key={d.code}>
                        <label className="flex items-center gap-3 px-3 min-h-11 cursor-pointer">
                          <Checkbox
                            checked={selected.has(d.code)}
                            onCheckedChange={(v) => toggle(d.code, v === true)}
                            className="size-5"
                          />
                          <span className="flex-1 min-w-0 text-sm truncate">{d.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {d.code}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          {/* Match */}
          <section className="space-y-3" aria-labelledby="opt-match">
            <h3 id="opt-match" className="text-base font-medium">
              How to match
            </h3>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as MatchMode)}
              className="gap-2"
            >
              {MATCH_MODES.map((m) => (
                <Label
                  key={m}
                  htmlFor={`mode-${m}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer font-normal",
                    mode === m && "border-primary/50 bg-primary/5",
                  )}
                >
                  <RadioGroupItem value={m} id={`mode-${m}`} className="mt-0.5" />
                  <span className="space-y-0.5">
                    <span className="block font-medium">{MATCH_MODE_INFO[m].label}</span>
                    <span className="block text-xs text-muted-foreground leading-snug">
                      {MATCH_MODE_INFO[m].hint}
                    </span>
                    <span className="block text-xs text-primary/80">
                      e.g. {MATCH_MODE_INFO[m].example}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </section>

          {/* Sort */}
          <section className="space-y-3" aria-labelledby="opt-sort">
            <h3 id="opt-sort" className="text-base font-medium">
              Order results by
            </h3>
            <RadioGroup
              value={sort}
              onValueChange={(v) => setSort(v as LookupSort | "auto")}
              className="gap-2"
            >
              {SORT_OPTIONS.map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`sort-${o.value}`}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer font-normal",
                    sort === o.value && "border-primary/50 bg-primary/5",
                  )}
                >
                  <RadioGroupItem value={o.value} id={`sort-${o.value}`} className="mt-0.5" />
                  <span>
                    <span className="block font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={order === "asc" ? "secondary" : "outline"}
                className="h-11"
                onClick={() => setOrder("asc")}
                disabled={sort === "relevance"}
              >
                <ArrowUpIcon className="size-4 mr-2" /> Ascending
              </Button>
              <Button
                type="button"
                variant={order === "desc" ? "secondary" : "outline"}
                className="h-11"
                onClick={() => setOrder("desc")}
                disabled={sort === "relevance"}
              >
                <ArrowDownIcon className="size-4 mr-2" /> Descending
              </Button>
            </div>
          </section>

          {/* View */}
          <DictionaryViewModeSelector value={viewMode} onChange={onViewModeChange} />
        </div>

        <SheetFooter className="border-t p-4 flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1 h-11" onClick={apply}>
            <CheckIcon className="size-4 mr-2" />
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default DictionaryFilters;
