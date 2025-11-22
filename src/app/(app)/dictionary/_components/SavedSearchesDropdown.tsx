/**
 * SavedSearchesDropdown Component
 * 
 * Phase 7: User Story 4 (US4) - Saved Searches and Query History
 * Tasks: T99, T104, T105, T106
 * 
 * Purpose: Dropdown menu for managing saved searches
 * Features:
 * - List saved searches
 * - Select to restore search
 * - Rename saved search
 * - Delete saved search
 * - Duplicate saved search
 * - Export saved searches to JSON (T106)
 * - Search history display (T104)
 * - Mobile: bottom sheet, Desktop: dropdown menu
 */

"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookmarkIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  DownloadIcon,
  ClockIcon,
} from "lucide-react";
import { useSavedSearches } from "@/hooks/use-saved-searches";
import { useSearchHistory } from "@/hooks/use-search-history";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { formatDistanceToNow } from "date-fns";

interface SavedSearchesDropdownProps {
  onSelectSearch?: (search: {
    queryText: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
  }) => void;
}

/**
 * T99: Saved Searches Dropdown with list, rename, delete, duplicate actions
 * T104: Shows search history
 * T105: Sorted by most recently used
 */
export function SavedSearchesDropdown({
  onSelectSearch,
}: SavedSearchesDropdownProps) {
  const {
    savedSearches,
    isLoading,
    deleteSavedSearch,
    duplicateSavedSearch,
    isDeleting,
    isDuplicating,
  } = useSavedSearches();

  const { searchHistory, clearHistory } = useSearchHistory();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  // T102: Handle selecting a saved search
  const handleSelectSearch = (search: any) => {
    onSelectSearch?.({
      queryText: search.queryText,
      filters: search.filters,
      sortBy: search.sortBy,
      sortOrder: search.sortOrder,
    });
  };

  // T106: Export saved searches to JSON
  const handleExportSearches = () => {
    const dataStr = JSON.stringify(savedSearches, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `saved-searches-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Saved searches"
          aria-label="Open saved searches menu"
          className="relative"
        >
          <BookmarkIcon className="h-4 w-4" aria-hidden="true" />
          {savedSearches.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              aria-label={`${savedSearches.length} saved searches`}
            >
              {savedSearches.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[80vh] overflow-y-auto"
        aria-label="Saved searches menu"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Saved Searches</span>
          {savedSearches.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportSearches}
              className="h-7 text-xs"
              aria-label="Export saved searches"
            >
              <DownloadIcon className="h-3 w-3 mr-1" />
              Export
            </Button>
          )}
        </DropdownMenuLabel>

        {isLoading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : savedSearches.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground text-sm">
            No saved searches yet
          </DropdownMenuItem>
        ) : (
          <DropdownMenuGroup>
            {/* T105: Saved searches sorted by most recently used */}
            {savedSearches.map((search) => (
              <SavedSearchItem
                key={search.id}
                search={search}
                onSelect={() => handleSelectSearch(search)}
                onRename={() => {
                  setEditingId(search.id);
                  setRenameDialogOpen(true);
                }}
                onDelete={() => deleteSavedSearch(search.id)}
                onDuplicate={() => duplicateSavedSearch(search.id)}
                isDeleting={isDeleting}
                isDuplicating={isDuplicating}
              />
            ))}
          </DropdownMenuGroup>
        )}

        {/* T104: Search History */}
        {searchHistory.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Recent Searches
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-7 text-xs"
                aria-label="Clear search history"
              >
                Clear
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {searchHistory.slice(0, 5).map((item, idx) => (
                <DropdownMenuItem
                  key={idx}
                  onClick={() =>
                    onSelectSearch?.({
                      queryText: item.queryText,
                      filters: item.filters,
                    })
                  }
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate flex-1 text-sm">
                    {item.queryText || "(empty search)"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Individual saved search item with context menu
 */
interface SavedSearchItemProps {
  search: any;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDeleting: boolean;
  isDuplicating: boolean;
}

function SavedSearchItem({
  search,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  isDeleting,
  isDuplicating,
}: SavedSearchItemProps) {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen}>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between gap-2 p-2 rounded cursor-pointer hover:bg-muted transition-colors",
            isContextMenuOpen && "bg-muted"
          )}
          onClick={onSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect();
            }
          }}
          aria-label={`Saved search: ${search.name}`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{search.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {search.queryText || "(no query)"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(search.updatedAt), {
                addSuffix: true,
              })}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="More actions"
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
              >
                <EditIcon className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                disabled={isDuplicating}
              >
                <CopyIcon className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>

      {/* T111: Context menu for right-click/long-press (min 48px height) */}
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onRename} className="min-h-[48px]">
          <EditIcon className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDuplicate}
          disabled={isDuplicating}
          className="min-h-[48px]"
        >
          <CopyIcon className="h-4 w-4 mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive focus:text-destructive min-h-[48px]"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default SavedSearchesDropdown;
