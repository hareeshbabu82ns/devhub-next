/**
 * DictionaryResultsList - presentation of a page of dictionary results.
 * All data and callbacks come from DictionaryResultsContainer.
 */

"use client";

import { useEffect } from "react";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/utils/icons";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import { cn } from "@/lib/utils";
import { MatchMode } from "@/lib/dictionary/lookup-query";
import type { LookupSort } from "@/lib/dictionary/lookup-service";
import { InfoIcon, Loader2Icon, SearchXIcon } from "lucide-react";
import { DictionaryItem, ViewMode } from "../types";
import { DictionaryResultCard } from "./DictionaryResultCard";
import { MATCH_MODE_INFO } from "./DictionarySearchControls";

interface DictionaryResultsListProps {
  results: Partial<DictionaryItem>[];
  total: number;

  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;

  currentPage: number;
  limit: number;

  language: string;
  textSize: string;
  isTouchDevice: boolean;
  asBrowse?: boolean;
  searchTerm?: string;
  viewMode?: ViewMode;

  requestedMode: MatchMode;
  effectiveMode: MatchMode;
  fellBack: boolean;
  isBrowse: boolean;
  sort: LookupSort;
  sortIsDefault: boolean;
  focusId?: string | null;

  onSortChange: (sort: LookupSort | null) => void;
  onModeChange: (mode: MatchMode) => void;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onRefresh: () => void;
  onCopyDescription: (description: string) => void;
  onEditItem: (itemId: string) => void;
  onCompare?: (word: string) => void;
}

const SORT_LABEL: Record<LookupSort, string> = {
  relevance: "Best match",
  dictionary: "Dictionary order",
  alphabetical: "Latin A–Z",
};

/** Broader modes to suggest when a search finds nothing */
const BROADER: Partial<Record<MatchMode, MatchMode[]>> = {
  exact: ["smart", "prefix", "meaning"],
  prefix: ["contains", "meaning"],
  suffix: ["contains", "meaning"],
  contains: ["meaning"],
  smart: ["meaning"],
  meaning: ["smart"],
};

export function DictionaryResultsList({
  results,
  total,
  isLoading,
  isFetching,
  isError,
  error,
  currentPage,
  limit,
  language,
  textSize,
  isTouchDevice,
  asBrowse,
  searchTerm,
  viewMode = "card",
  requestedMode,
  effectiveMode,
  fellBack,
  isBrowse,
  sort,
  sortIsDefault,
  focusId,
  onSortChange,
  onModeChange,
  onPageChange,
  onNextPage,
  onPrevPage,
  onRefresh,
  onCopyDescription,
  onEditItem,
  onCompare,
}: DictionaryResultsListProps) {
  // Bring a jumped-to entry into view once its page has loaded
  useEffect(() => {
    if (!focusId || isFetching) return;
    const el = document.getElementById(`entry-${focusId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, isFetching, results]);

  if (isLoading) return <Loader />;

  if (isError) {
    return <SimpleAlert title={error?.message ?? "An error occurred"} />;
  }

  const query = searchTerm?.trim() ?? "";

  if (total === 0) {
    const suggestions = query ? (BROADER[requestedMode] ?? []) : [];
    return (
      <div className="flex flex-col items-center text-center gap-3 rounded-xl border border-dashed p-8">
        <SearchXIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">
            {query ? `Nothing found for “${query}”` : "This dictionary has no entries"}
          </p>
          {query && (
            <p className="text-sm text-muted-foreground mt-1">
              Try a shorter word, a wildcard like <code>{query}*</code>, a looser match, or all dictionaries.
            </p>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((m) => (
              <Button
                key={m}
                variant="outline"
                className="h-10"
                onClick={() => onModeChange(m)}
              >
                Try “{MATCH_MODE_INFO[m].label}”
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  const pagination = (
    <PaginationDDLB
      totalCount={total}
      limit={limit}
      page={currentPage}
      onFwdClick={onNextPage}
      onBackClick={onPrevPage}
      onPageChange={onPageChange}
    />
  );

  return (
    <div className="w-full @container space-y-3">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {`${total} ${isBrowse ? "entries" : "results"}${query ? ` for ${query}` : ""}`}
      </div>

      {fellBack && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <InfoIcon className="size-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="flex-1">
            No headword matches “{query}”, so these are entries that mention it
            in their <strong>meaning</strong>.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2 min-w-0">
          <span className="tabular-nums">
            {from.toLocaleString()}–{to.toLocaleString()} of{" "}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span>
          </span>
          {!isBrowse && (
            <span className="truncate">
              · {MATCH_MODE_INFO[effectiveMode].label.toLowerCase()}
            </span>
          )}
          {isFetching && (
            <Loader2Icon className="size-3.5 animate-spin" aria-label="Updating" />
          )}
        </p>
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <Select
            value={sortIsDefault ? "auto" : sort}
            onValueChange={(v) => onSortChange(v === "auto" ? null : (v as LookupSort))}
          >
            <SelectTrigger className="h-10 w-[11.5rem]" aria-label="Order results by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto ({SORT_LABEL[isBrowse ? "dictionary" : "relevance"]})
              </SelectItem>
              {(Object.keys(SORT_LABEL) as LookupSort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              onClick={onRefresh}
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 hidden sm:inline-flex"
              aria-label="Refresh results"
            >
              <Icons.refresh className="size-4" />
            </Button>
            {pagination}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "transition-opacity",
          isFetching && "opacity-60",
          viewMode === "compact" && "flex flex-col gap-2",
          viewMode === "card" && "grid grid-cols-1 @3xl:grid-cols-2 @6xl:grid-cols-3 gap-4",
          viewMode === "detailed" && "flex flex-col gap-4",
        )}
      >
        {results.map((item) => (
          <DictionaryResultCard
            key={item.id}
            item={item}
            language={language}
            textSize={textSize}
            isTouchDevice={isTouchDevice}
            asBrowse={asBrowse}
            searchTerm={effectiveMode === "meaning" ? searchTerm : undefined}
            viewMode={viewMode}
            focused={item.id === focusId}
            showMatchType={!isBrowse}
            onCopyDescription={onCopyDescription}
            onEditItem={onEditItem}
            onCompare={onCompare}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <ScrollToTopButton />
        {pagination}
      </div>
    </div>
  );
}

export default DictionaryResultsList;
