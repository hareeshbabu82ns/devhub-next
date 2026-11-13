"use client";

/**
 * Browse landing: every dictionary, grouped, with its entry count. Shown
 * when there is no search and no single dictionary to page through.
 */

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import {
  DICTIONARY_CATALOG,
  DICTIONARY_GROUPS,
} from "@/lib/dictionary/dictionary-catalog";
import { dictionaryStats } from "../lookup-actions";
import { ChevronRightIcon } from "lucide-react";

interface DictionaryCatalogProps {
  /** Dictionaries currently selected; when several, only these are shown */
  origins: string[];
  onBrowse: (origin: string) => void;
}

export function DictionaryCatalog({ origins, onBrowse }: DictionaryCatalogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["dictionaryStats"],
    queryFn: () => dictionaryStats(),
    staleTime: QUERY_STALE_TIME_LONG,
  });
  const counts = new Map((data ?? []).map((c) => [c.origin, c.count]));
  const restrict = origins.length > 1 ? new Set(origins) : null;

  return (
    <div className="space-y-6 p-1 sm:p-2">
      <div>
        <h2 className="text-lg font-semibold">Browse a dictionary</h2>
        <p className="text-sm text-muted-foreground">
          {restrict
            ? "Pick one of the selected dictionaries to page through it, or type a word above to search them all."
            : "Pick a dictionary to page through it in order, or type a word above to search."}
        </p>
      </div>
      {DICTIONARY_GROUPS.map((group) => {
        const items = DICTIONARY_CATALOG.filter(
          (d) =>
            d.group === group.id &&
            (!restrict || restrict.has(d.code)) &&
            (isLoading || !data || counts.has(d.code)),
        );
        if (items.length === 0) return null;
        return (
          <section key={group.id} aria-labelledby={`grp-${group.id}`}>
            <h3
              id={`grp-${group.id}`}
              className="text-sm font-semibold text-muted-foreground mb-2"
            >
              {group.label}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {items.map((d) => (
                <li key={d.code}>
                  <button
                    type="button"
                    onClick={() => onBrowse(d.code)}
                    className="w-full min-h-14 flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium leading-tight truncate">
                        {d.name}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {d.code}
                        {" · "}
                        {isLoading ? (
                          <Skeleton className="inline-block h-3 w-12 align-middle" />
                        ) : (
                          `${(counts.get(d.code) ?? 0).toLocaleString()} entries`
                        )}
                      </span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default DictionaryCatalog;
