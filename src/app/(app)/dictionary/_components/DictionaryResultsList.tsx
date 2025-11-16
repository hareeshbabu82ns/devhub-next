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
import { Badge } from "@/components/ui/badge";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DictionaryItem } from "../types";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import { cn } from "@/lib/utils";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import { SearchResultHighlight } from "./SearchResultHighlight";
import { getRelevanceLabel, getRelevanceCategory } from "@/lib/dictionary/relevance-scoring";
import { AudioPlayer } from "@/components/features/dictionary/AudioPlayer";

import { ViewMode } from "../types";

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
  
  // Callbacks
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onRefresh: () => void;
  onCopyDescription: (description: string) => void;
  onEditItem: (itemId: string) => void;
}

/**
 * T094-T095: Pure presentation component
 * Renders dictionary results with responsive grid layout
 * T89: Added view mode support for Compact/Card/Detailed rendering
 */
export function DictionaryResultsList({
  results,
  total,
  originParam,
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
  onPageChange,
  onNextPage,
  onPrevPage,
  onRefresh,
  onCopyDescription,
  onEditItem,
}: DictionaryResultsListProps) {
  // Loading state
  if (isLoading || isFetching) {
    return <Loader />;
  }

  // Error state
  if (isError) {
    return <SimpleAlert title={error?.message ?? "An error occurred"} />;
  }

  // Empty state
  if (!results || total === 0) {
    return (
      <SimpleAlert title={`No data found in Dictionary: ${originParam.join(", ")}`} />
    );
  }

  // T125: Calculate average relevance score for screen reader announcement
  const avgRelevanceScore = results.reduce((sum, item) => {
    return sum + (item.relevanceScore ?? 0);
  }, 0) / (results.length || 1);
  const hasRelevanceScores = results.some(item => typeof item.relevanceScore === 'number');

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
            {`Found ${total} results${hasRelevanceScores ? ` with average relevance score of ${Math.round(avgRelevanceScore)}` : ''}`}
            {searchTerm && ` for search term "${searchTerm}"`}
          </>
        )}
      </div>

      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <CardDescription>
          Results
          {hasRelevanceScores && searchTerm && (
            <span className="ml-2 text-xs text-muted-foreground">
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
      
      <CardContent>
        {/* T089, T093: Responsive grid with @container queries - layout changes based on view mode */}
        <div
          className={cn(
            "gap-4",
            viewMode === "compact" && "flex flex-col space-y-2",
            viewMode === "card" && "grid grid-cols-1 @6xl:grid-cols-2 @7xl:grid-cols-3",
            viewMode === "detailed" && "flex flex-col space-y-4"
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

/**
 * Individual result card component
 * Extracted for better maintainability
 * T122-T123: Enhanced with relevance scores and highlighting
 * T89-T92: Support for different view modes (Compact/Card/Detailed)
 */
interface DictionaryResultCardProps {
  item: Partial<DictionaryItem>;
  language: string;
  textSize: string;
  isTouchDevice: boolean;
  asBrowse?: boolean;
  searchTerm?: string;
  viewMode?: ViewMode;
  onCopyDescription: (description: string) => void;
  onEditItem: (itemId: string) => void;
}

function DictionaryResultCard({
  item,
  language,
  textSize,
  isTouchDevice,
  asBrowse,
  searchTerm,
  viewMode = "card",
  onCopyDescription,
  onEditItem,
}: DictionaryResultCardProps) {
  // T90: Description truncation state for Compact/Card modes
  const [isExpanded, setIsExpanded] = useState(false);
  
  // T128-T129: Check if audio is available (from sourceData or future audio field)
  const audioUrl = (item as any).audio || item.sourceData?.audioUrl || item.sourceData?.audio;
  const hasAudio = Boolean(audioUrl);
  
  // T122: Get relevance score and category for display
  const hasRelevanceScore = typeof item.relevanceScore === 'number';
  const relevanceScore = item.relevanceScore ?? 0;
  const relevanceLabel = hasRelevanceScore ? getRelevanceLabel(relevanceScore) : '';
  const relevanceCategory = hasRelevanceScore ? getRelevanceCategory(relevanceScore) : null;

  // Color coding for relevance scores
  const relevanceBadgeVariant = 
    relevanceScore >= 90 ? 'default' : // Excellent - green
    relevanceScore >= 70 ? 'secondary' : // Good - blue
    relevanceScore >= 50 ? 'outline' : // Fair - gray
    'destructive'; // Poor - red (shouldn't show much in results)

  // T90: Description truncation logic - truncate at 200 chars for compact/card
  const shouldTruncate = (viewMode === "compact" || viewMode === "card") && !isExpanded;
  const description = item.description ?? '';
  const truncatedDescription = shouldTruncate && description.length > 200
    ? description.slice(0, 200) + '...'
    : description;
  const showReadMore = (viewMode === "compact" || viewMode === "card") && description.length > 200;

  // T89: Different rendering based on view mode
  if (viewMode === "compact") {
    return (
      <div className="group border-b py-2 flex items-center justify-between gap-4 transition-colors hover:bg-muted/30">
        {/* Compact: single-line with word + brief meaning */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className={cn("font-medium text-sm truncate", LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY])}>
            {searchTerm ? (
              <SearchResultHighlight
                text={item.word ?? ''}
                searchTerm={searchTerm}
                language={language}
                ariaLabel={`Word: ${item.word}`}
              />
            ) : (
              item.word
            )}
          </div>
          {hasRelevanceScore && (
            <Badge variant="outline" className="text-xs shrink-0">
              {relevanceScore}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground truncate">
            {truncatedDescription}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          {/* T128: Audio icon display for entries with audio */}
          {hasAudio && (
            <AudioPlayer
              audioUrl={audioUrl}
              wordId={item.id!}
              compact
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="h-8 w-8"
            onClick={() => onCopyDescription(description)}
            aria-label="Copy description"
          >
            <Icons.clipboard className="h-3 w-3" />
          </Button>
          {!asBrowse && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8"
              onClick={() => onEditItem(item.id!)}
              aria-label="Edit"
            >
              <Icons.edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "group border rounded-sm flex flex-col transition-colors hover:bg-muted/50",
      viewMode === "card" ? "p-4" : "p-6" // T89: Detailed mode has more padding
    )}>
      {/* Header with word, relevance score, and actions */}
      <div className="pb-4 flex justify-between items-start gap-2">
        <div
          className={`font-medium subpixel-antialiased text-${textSize} leading-loose tracking-widest flex-1`}
        >
          {/* T123: Word with highlighting */}
          <h3 className="flex items-center gap-2 flex-wrap">
            {searchTerm && searchTerm.trim().length > 0 ? (
              <SearchResultHighlight
                text={item.word ?? ''}
                searchTerm={searchTerm}
                language={language}
                ariaLabel={`Search result word: ${item.word}`}
              />
            ) : (
              <span>{item.word}</span>
            )}
            
            {/* T122: Relevance score badge */}
            {hasRelevanceScore && (
              <Badge
                variant={relevanceBadgeVariant}
                className="text-xs font-normal"
                aria-label={`Relevance: ${relevanceLabel}, score ${relevanceScore}`}
              >
                {relevanceScore}
              </Badge>
            )}
          </h3>
          <h4 className="text-muted-foreground text-sm flex items-center gap-2">
            <span>{item.origin}</span>
            {item.matchType && searchTerm && (
              <Badge variant="outline" className="text-xs">
                {item.matchType}
              </Badge>
            )}
          </h4>
        </div>
        
        {/* T095: Mobile-optimized actions (min 44x44px touch targets) */}
        <div
          className={cn(
            "flex gap-1",
            isTouchDevice
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          )}
        >
          {/* T128: Audio icon display for entries with audio */}
          {hasAudio && (
            <AudioPlayer
              audioUrl={audioUrl}
              wordId={item.id!}
              compact
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="p-0 min-w-[44px] min-h-[44px]"
            onClick={() => onCopyDescription(item.description ?? "")}
            aria-label="Copy description to clipboard"
          >
            <Icons.clipboard className="size-4" />
          </Button>
          {!asBrowse && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="p-0 min-w-[44px] min-h-[44px]"
              onClick={() => onEditItem(item.id!)}
              aria-label={`Edit ${item.word}`}
            >
              <Icons.edit className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Description content with highlighting */}
      <div
        className={cn(
          LANGUAGE_FONT_FAMILY[
            language as keyof typeof LANGUAGE_FONT_FAMILY
          ],
          `flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest`,
          viewMode === "card" && "max-h-48",
          "overflow-y-auto no-scrollbar markdown-content"
        )}
      >
        {/* T123: Description with highlighting if search term provided */}
        {searchTerm && searchTerm.trim().length > 0 ? (
          <div className="prose dark:prose-invert max-w-none">
            <SearchResultHighlight
              text={truncatedDescription}
              searchTerm={searchTerm}
              language={language}
              ariaLabel="Search result description"
            />
          </div>
        ) : (
          <Markdown remarkPlugins={[remarkGfm]}>
            {truncatedDescription}
          </Markdown>
        )}
      </div>

      {/* T90: Read more / Show less button for Card mode */}
      {showReadMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 h-10 min-h-[44px] self-start"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Show less" : "Read more"}
        >
          {isExpanded ? "Show less" : "Read more"}
        </Button>
      )}

      {/* T128: Full audio player for card/detailed views */}
      {hasAudio && viewMode !== "compact" && (
        <div className="mt-3">
          <AudioPlayer
            audioUrl={audioUrl}
            wordId={item.id!}
          />
        </div>
      )}

      {/* T89: Detailed mode shows additional fields */}
      {viewMode === "detailed" && (
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          {item.phonetic && (
            <div>
              <span className="font-medium">Phonetic: </span>
              <span className="text-muted-foreground">{item.phonetic}</span>
            </div>
          )}
          {item.attributes && item.attributes.length > 0 && (
            <div>
              <span className="font-medium">Attributes: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.attributes.map((attr, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {attr.key}: {attr.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {item.sourceData && (
            <div>
              <span className="font-medium">Source Data: </span>
              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(item.sourceData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DictionaryResultsList;
