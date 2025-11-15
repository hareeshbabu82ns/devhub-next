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
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DictionaryItem } from "../types";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import ScrollToTopButton from "@/components/utils/ScrollToTopButton";
import { cn } from "@/lib/utils";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";

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

  // Results display
  return (
    <Card className="w-full bg-transparent @container">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <CardDescription>Results</CardDescription>
        <div className="flex flex-row items-center gap-2">
          <Button
            onClick={onRefresh}
            type="button"
            variant="outline"
            size="icon"
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
        {/* T094: Responsive grid with @container queries */}
        <div className="grid grid-cols-1 @6xl:grid-cols-2 gap-4">
          {results.map((item) => (
            <DictionaryResultCard
              key={item.id}
              item={item}
              language={language}
              textSize={textSize}
              isTouchDevice={isTouchDevice}
              asBrowse={asBrowse}
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
 */
interface DictionaryResultCardProps {
  item: Partial<DictionaryItem>;
  language: string;
  textSize: string;
  isTouchDevice: boolean;
  asBrowse?: boolean;
  onCopyDescription: (description: string) => void;
  onEditItem: (itemId: string) => void;
}

function DictionaryResultCard({
  item,
  language,
  textSize,
  isTouchDevice,
  asBrowse,
  onCopyDescription,
  onEditItem,
}: DictionaryResultCardProps) {
  return (
    <div className="group border rounded-sm p-4 flex flex-col transition-colors hover:bg-muted/50">
      {/* Header with word and actions */}
      <div className="pb-4 h-12 flex justify-between items-center">
        <div
          className={`font-medium subpixel-antialiased text-${textSize} leading-loose tracking-widest`}
        >
          <h3>{item.word}</h3>
          <h4 className="text-muted-foreground text-sm">{item.origin}</h4>
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
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="p-0 min-w-[44px] min-h-[44px]"
            onClick={() => onCopyDescription(item.description ?? "")}
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
            >
              <Icons.edit className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Description content */}
      <div
        className={cn(
          LANGUAGE_FONT_FAMILY[
            language as keyof typeof LANGUAGE_FONT_FAMILY
          ],
          `flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest max-h-48 overflow-y-auto no-scrollbar markdown-content`
        )}
      >
        <Markdown remarkPlugins={[remarkGfm]}>
          {item.description}
        </Markdown>
      </div>
    </div>
  );
}

export default DictionaryResultsList;
