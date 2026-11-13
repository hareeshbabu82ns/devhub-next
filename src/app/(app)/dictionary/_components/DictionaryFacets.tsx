"use client";

/**
 * "Found in" row: how many matches each dictionary has for the current
 * search, regardless of which dictionaries are selected. Tapping one
 * narrows the results to it; tapping it again goes back to all.
 */

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MatchMode } from "@/lib/dictionary/lookup-query";
import { getDictionaryInfo } from "@/lib/dictionary/dictionary-catalog";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { dictionaryFacets } from "../lookup-actions";

interface DictionaryFacetsProps {
  query: string;
  mode: MatchMode;
  origins: string[];
  onSelect: (origins: string[]) => void;
}

export function DictionaryFacets({
  query,
  mode,
  origins,
  onSelect,
}: DictionaryFacetsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["dictionaryFacets", query, mode],
    queryFn: () => dictionaryFacets(query, mode),
    enabled: query.trim().length > 0,
    staleTime: QUERY_STALE_TIME_LONG,
  });

  if (!query.trim()) return null;

  if (isLoading) {
    return (
      <div className="flex gap-1.5 overflow-hidden" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  const counts = data?.counts ?? [];
  if (counts.length === 0) return null;
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const selected = new Set(origins);
  const isAll = origins.length === 0;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-muted-foreground shrink-0">Found in</span>
      <div
        className="flex gap-1.5 overflow-x-auto no-scrollbar min-w-0"
        role="group"
        aria-label="Matches per dictionary"
      >
        <Button
          type="button"
          variant={isAll ? "secondary" : "outline"}
          aria-pressed={isAll}
          className="h-8 shrink-0 rounded-full px-3 text-xs"
          onClick={() => onSelect([])}
        >
          All <span className="ml-1.5 tabular-nums opacity-70">{total.toLocaleString()}</span>
        </Button>
        {counts.map((c) => {
          const active = !isAll && selected.has(c.origin);
          const only = active && origins.length === 1;
          return (
            <Button
              key={c.origin}
              type="button"
              variant={active ? "secondary" : "outline"}
              aria-pressed={active}
              title={getDictionaryInfo(c.origin).name}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs",
                active && "ring-1 ring-primary/40",
              )}
              onClick={() => onSelect(only ? [] : [c.origin])}
            >
              {getDictionaryInfo(c.origin).short}
              <span className="ml-1.5 tabular-nums opacity-70">
                {c.count.toLocaleString()}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default DictionaryFacets;
