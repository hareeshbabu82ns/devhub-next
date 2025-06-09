import { Button } from "../ui/button";
import { ChevronLeft as BackIcon, ChevronRight as FwdIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { useDebounceCallback } from "usehooks-ts";
import { useState, useCallback } from "react";

interface PaginationDDLBProps {
  page: number;
  limit: number;
  totalCount: number;
  onBackClick: () => void;
  onFwdClick: () => void;
  onPageChange?: (page: number) => void;
  showItemRange?: boolean;
  showPageInfo?: boolean;
}
const PaginationDDLB = ({
  limit,
  page,
  totalCount,
  onBackClick,
  onFwdClick,
  onPageChange,
  showItemRange = true,
}: PaginationDDLBProps) => {
  // Calculate pagination values
  const currentPage = page;
  const totalPages = Math.ceil(totalCount / limit);

  // Calculate item range based on page number (1-based)
  const startItem = Math.min((page - 1) * limit + 1, totalCount);
  const endItem = Math.min(page * limit, totalCount);

  // Check if navigation is possible
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="flex justify-end items-center gap-4">
      {showItemRange && totalPages > 50 && (
        <span className="text-sm text-muted-foreground">
          {startItem}-{endItem} of {totalCount}
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!canGoBack}
        onClick={onBackClick}
        aria-label="Previous page"
      >
        <BackIcon className="h-4 w-4" />
      </Button>

      <PaginationSelect
        page={page}
        limit={limit}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!canGoForward}
        onClick={onFwdClick}
        aria-label="Next page"
      >
        <FwdIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PaginationDDLB;

const PaginationSelect = ({
  page,
  limit,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
}: {
  page: number;
  limit: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}) => {
  const debouncedPageInputChange = useDebounceCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >((e) => {
    const pageNumber = Number(e.target.value);
    if (Number.isNaN(pageNumber)) return;

    // Clamp page number between 1 and totalPages and convert to offset
    const validPage = Math.max(1, Math.min(Math.abs(pageNumber), totalPages));
    // const newOffset = (validPage - 1) * limit;
    onPageChange?.(validPage);
  }, 500);

  // If there are too many pages (>50), show input field instead of dropdown
  if (totalPages > 50) {
    return (
      <div className="flex flex-row items-center gap-2">
        <Input
          type="number"
          placeholder="Page"
          defaultValue={currentPage}
          onChange={debouncedPageInputChange}
          className="w-[80px]"
          min={1}
          max={totalPages}
          aria-label={`Go to page (1-${totalPages})`}
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          of {totalPages}
        </span>
      </div>
    );
  }

  return (
    <Select
      disabled={totalPages <= 1}
      value={page.toString()}
      onValueChange={(value) => onPageChange?.(Number(value))}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Page" />
      </SelectTrigger>
      <SelectContent className="max-h-[200px]">
        {Array.from({ length: totalPages }, (_, i) => {
          const pageOffset = i * limit;
          const pageNumber = i + 1;
          const startItem = pageOffset + 1;
          const endItem = Math.min((i + 1) * limit, totalCount);

          return (
            <SelectItem
              key={pageNumber}
              value={pageNumber.toString()}
              className="font-mono"
              title="Page Navigation"
            >
              <span className="flex justify-between items-center w-full">
                <span>{pageNumber}</span>
                <span className="text-muted-foreground ml-2">
                  ({startItem}-{endItem})
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

// Utility hook for pagination state management
export const usePagination = (initialLimit = 10) => {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(initialLimit);

  const handleBackClick = useCallback(() => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  }, [offset, limit]);

  const handleFwdClick = useCallback(() => {
    setOffset(offset + limit);
  }, [offset, limit]);

  const handleOffsetChange = useCallback((newOffset: number) => {
    setOffset(newOffset);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    // Reset to first page when changing limit
    setLimit(newLimit);
    setOffset(0);
  }, []);

  const reset = useCallback(() => {
    setOffset(0);
  }, []);

  // Helper functions
  const getCurrentPage = useCallback(
    (totalCount: number) => {
      return Math.floor(offset / limit) + 1;
    },
    [offset, limit],
  );

  const getTotalPages = useCallback(
    (totalCount: number) => {
      return Math.ceil(totalCount / limit);
    },
    [limit],
  );

  const canGoBack = useCallback(() => {
    return offset > 0;
  }, [offset]);

  const canGoForward = useCallback(
    (totalCount: number) => {
      return offset + limit < totalCount;
    },
    [offset, limit],
  );

  return {
    offset,
    limit,
    handleBackClick,
    handleFwdClick,
    handleOffsetChange,
    handleLimitChange,
    reset,
    // Helper getters
    getCurrentPage,
    getTotalPages,
    canGoBack,
    canGoForward,
  };
};
