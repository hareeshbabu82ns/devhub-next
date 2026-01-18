/**
 * DictionaryResultsList - Presentation Layer
 *
 * Task: T094-T095
 * Purpose: Pure presentation component for rendering dictionary results
 * Responsibilities:
 * - JSX rendering only
 * - No hooks (except maybe useMemo for optimization)
 * - No business logic
 * - Props-driven rendering
 * - Responsive grid layout with @container queries
 * - Mobile-optimized UI (touch targets, spacing)
 *
 * All data and callbacks come from parent Container component
 */

"use client";

import { useState } from "react";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { TargetIcon, ZapIcon, InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DictionaryItem } from "../types";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import { cn } from "@/lib/utils";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import { SearchResultHighlight } from "./SearchResultHighlight";
import {
  getRelevanceLabel,
  getRelevanceCategory,
} from "@/lib/dictionary/relevance-scoring";
import { AudioPlayer } from "@/components/features/dictionary/AudioPlayer";
import { SearchMode } from "@/lib/dictionary/types";

import { ViewMode } from "../types";
import { DictionaryResultCard } from "./DictionaryResultCard";

interface DictionaryResultsListProps {
  // Data
  results: any[];
  total: number;
  originParam: string[];

  // State
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;

  // Pagination
  currentPage: number;
  limit: number;

  // Configuration
  language: string;
  textSize: string;
  isTouchDevice: boolean;
  asBrowse?: boolean;
  searchTerm?: string; // T123: For highlighting search matches
  viewMode?: ViewMode; // T89: View mode for rendering
  searchMode?: string; // T221: Current search mode for badge display

  // Callbacks
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onRefresh: () => void;
  onCopyDescription: (description: string) => void;
  onEditItem: (itemId: string) => void;
  onCompare?: (word: string) => void; // T148: Compare callback
  onSwitchToFullText?: () => void; // T222: Fallback to full-text search
}

/**
 * T094-T095: Pure presentation component
 * Renders dictionary results with responsive grid layout
 * T89: Added view mode support for Compact/Card/Detailed rendering
 */
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
  originParam,
  searchTerm,
  viewMode = "card",
  searchMode = SearchMode.FULLTEXT,
  onPageChange,
  onNextPage,
  onPrevPage,
  onRefresh,
  onCopyDescription,
  onEditItem,
  onCompare, // T148
  onSwitchToFullText, // T222
}: DictionaryResultsListProps) {
  // Loading state
  if (isLoading || isFetching) {
    return <Loader />;
  }

  // Error state
  if (isError) {
    return <SimpleAlert title={error?.message ?? "An error occurred"} />;
  }

  // T222: Empty state with fallback to full-text search for key-based modes
  if (!results || total === 0) {
    const isKeyBasedSearch =
      searchMode === SearchMode.KEY_EXACT ||
      searchMode === SearchMode.KEY_PREFIX;

    return (
      <div className="space-y-4">
        <SimpleAlert
          title="No results found"
          extraMessages={["Try adjusting your search or browse by dictionary."]}
        />

        {/* T222: Suggest switching to Full-Text search for key-based modes */}
        {isKeyBasedSearch && onSwitchToFullText && searchTerm && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardDescription className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <InfoIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">
                      No exact matches found in word field
                    </p>
                    <p className="text-sm">
                      Try Full-Text Search to search across all fields including
                      descriptions.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onSwitchToFullText}
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Icons.search className="mr-2 h-4 w-4" />
                  Switch to Full-Text Search
                </Button>
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    );
  }

  // T125: Calculate average relevance score for screen reader announcement
  const avgRelevanceScore =
    results.reduce((sum, item) => {
      return sum + (item.relevanceScore ?? 0);
    }, 0) / (results.length || 1);
  const hasRelevanceScores = results.some(
    (item) => typeof item.relevanceScore === "number",
  );

  // Results display
  return (
    <Card className="w-full bg-transparent @container">
      {/* T125: ARIA live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {total > 0 && (
          <>
            {`Found ${total} results${hasRelevanceScores ? ` with average relevance score of ${Math.round(avgRelevanceScore)}` : ""}`}
            {searchTerm && ` for search term "${searchTerm}"`}
          </>
        )}
      </div>

      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <CardDescription className="flex items-center gap-2 flex-wrap">
          <span>Results</span>
          {/* T221: Search mode badge with result count */}
          {searchMode !== SearchMode.FULLTEXT && (
            <Badge variant="secondary" className="gap-1.5">
              {searchMode === SearchMode.KEY_EXACT && (
                <TargetIcon className="h-3 w-3" />
              )}
              {searchMode === SearchMode.KEY_PREFIX && (
                <ZapIcon className="h-3 w-3" />
              )}
              <span className="text-xs">
                {searchMode === SearchMode.KEY_EXACT
                  ? "Exact Match"
                  : "Prefix Match"}
              </span>
              <span className="text-xs font-semibold">({total})</span>
            </Badge>
          )}
          {hasRelevanceScores && searchTerm && (
            <span className="ml-0 sm:ml-2 text-xs text-muted-foreground">
              (sorted by relevance)
            </span>
          )}
        </CardDescription>
        <div className="flex flex-row items-center gap-2">
          <Button
            onClick={onRefresh}
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh search results"
          >
            <Icons.refresh className="size-4" />
          </Button>
          <PaginationDDLB
            totalCount={total}
            limit={limit}
            page={currentPage}
            onFwdClick={onNextPage}
            onBackClick={onPrevPage}
            onPageChange={onPageChange}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6">
        {/* T089, T093: Premium Responsive grid with layout mapping based on view mode */}
        <div
          className={cn(
            "transition-all duration-500",
            viewMode === "compact" && "flex flex-col gap-3",
            viewMode === "card" &&
            "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6",
            viewMode === "detailed" && "flex flex-col gap-6",
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
              searchTerm={searchTerm}
              viewMode={viewMode}
              onCopyDescription={onCopyDescription}
              onEditItem={onEditItem}
              onCompare={onCompare}
            />
          ))}
        </div>

        {/* Bottom pagination */}
        <div className="flex flex-1 justify-end mt-4">
          <ScrollToTopButton />
          <PaginationDDLB
            totalCount={total}
            limit={limit}
            page={currentPage}
            onFwdClick={onNextPage}
            onBackClick={onPrevPage}
            onPageChange={onPageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}


export default DictionaryResultsList;
