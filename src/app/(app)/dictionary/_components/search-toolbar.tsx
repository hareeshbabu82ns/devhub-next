/**
 * SearchToolBar - Refactored Component
 *
 * Task: T089, T096, T097
 * Purpose: Use hooks exclusively, remove inline business logic
 * All filtering and validation delegated to hooks
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Settings2Icon as ExtraParamsIcon,
  BookPlusIcon as AddIcon,
  SearchIcon,
  ArrowDownAZIcon,
  ArrowDownUpIcon,
  FilterIcon,
  BookmarkPlusIcon,
  FileDownIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounceCallback } from "usehooks-ts";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CollapsibleContent } from "@radix-ui/react-collapsible";
import { Label } from "@/components/ui/label";
import DictionariesMultiSelectChips from "./DictionaryMultiSelectChips";
import WebIMEIdeInput from "@/app/(app)/sanscript/_components/WebIMEIdeInput";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useReadLocalStorage } from "@/hooks/use-hydration-safe-storage";
import { DICTIONARY_ORIGINS_SELECT_KEY } from "./DictionaryMultiSelectChips";
import { useMutation } from "@tanstack/react-query";
import { downloadDictionary } from "../download-actions";
import { toast } from "sonner";
import {
  DICTIONARY_SORT_OPTIONS,
  DICTIONARY_SORT_ORDER_OPTIONS,
} from "../utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SavedSearchesDropdown from "./SavedSearchesDropdown";
import { useSession } from "next-auth/react";
import { useDictionaryFilters } from "@/hooks/use-dictionary-filters";
import DictionaryViewModeSelector from "./DictionaryViewModeSelector";
import { ViewMode } from "../types";
import { Badge } from "@/components/ui/badge";
import { SearchMode } from "@/lib/dictionary/types";
import { TargetIcon, ZapIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SearchToolBarProps {
  asBrowse?: boolean;
  onFilterToggle?: () => void;
  onSaveSearch?: () => void;
  onSelectSearch?: (search: {
    queryText: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
  }) => void;
  onExport?: () => void; // T143: Export button handler
}

/**
 * T096-T097: Refactored to use hooks exclusively
 * Removed inline logic for validation, filtering, and query building
 * T80: Added filter toggle button
 * T100: Added Save Search button and Saved Searches dropdown
 */
export const SearchToolBar = ({
  asBrowse,
  onFilterToggle,
  onSaveSearch,
  onSelectSearch,
  onExport, // T143
}: SearchToolBarProps) => {
  const router = useRouter();
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const language = useLanguageAtomValue();
  const { data: session } = useSession();

  const { filters } = useDictionaryFilters();

  // T089: Use hook-managed state instead of inline parsing
  const localOrigins =
    useReadLocalStorage<string[]>(DICTIONARY_ORIGINS_SELECT_KEY) || [];

  const originParam = (
    searchParams.get("origins")?.split(",") ??
    localOrigins ??
    []
  ).filter((o) => o.trim().length > 0);

  const searchParam = searchParams.get("search") ?? "";
  const ftsParam = searchParams.get("fts") ?? "";
  const sortByParam = searchParams.get("sortBy") ?? "wordIndex";
  const sortOrderParam = searchParams.get("sortOrder") ?? "asc";

  // T097: Simplified event handlers (no business logic)
  const onSearchChange = (value: string) => {
    updateSearchParams({ search: value, offset: "0" });
  };

  const debouncedSetParams = useDebounceCallback(onSearchChange, 1000);

  // T097: Download mutation (minimal logic, delegates to action)
  const downloadMutation = useMutation({
    mutationFn: downloadDictionary,
    onSuccess: (data) => {
      if (data.status === "success") {
        // Create download URL and trigger download
        const downloadUrl = `/api/dictionary/download?filepath=${encodeURIComponent(data.data.filepath)}&filename=${encodeURIComponent(data.data.filename)}`;

        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Dictionary export downloaded successfully!");
      } else {
        toast.error(data.error);
      }
    },
    onError: (error: Error) => {
      console.error("Download error:", error);
      toast.error("Failed to download dictionary export");
    },
  });

  const handleDownload = (format: "txt" | "csv" | "json" | "all" = "all") => {
    downloadMutation.mutate({
      dictFrom: originParam,
      queryText: searchParam,
      queryOperation: ftsParam === "x" ? "FULL_TEXT_SEARCH" : "REGEX",
      sortBy: sortByParam as any,
      sortOrder: sortOrderParam as any,
      language,
      format,
    });
  };

  // T214: Dynamic placeholder based on search mode
  const getPlaceholder = () => {
    switch (filters.searchMode) {
      case SearchMode.KEY_EXACT:
        return "Type exact word to match...";
      case SearchMode.KEY_PREFIX:
        return "Type word prefix...";
      case SearchMode.FULLTEXT:
      default:
        return "Search words, meanings, descriptions...";
    }
  };

  return (
    <Collapsible className="flex flex-col">
      <div className="flex flex-1 flex-col sm:flex-row items-center pb-4 pt-2 sm:pt-0 gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <WebIMEIdeInput
            type="search"
            placeholder={getPlaceholder()}
            // language={language}
            defaultValue={searchParam}
            onTextChange={debouncedSetParams}
            className="w-full appearance-none bg-background shadow-none"
            withLanguageSelector
            showSearchIcon
            storageKey="webimeLanguage:dictionary"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* T80: Filter toggle button */}
          {onFilterToggle && (
            <Button
              variant="outline"
              size="icon"
              onClick={onFilterToggle}
              title="Open advanced filters"
              aria-label="Open advanced filters"
            >
              <FilterIcon className="h-4 w-4" />
            </Button>
          )}

          {/* T213: Search Mode Badge - show when not using default FULLTEXT mode */}
          {filters.searchMode && filters.searchMode !== SearchMode.FULLTEXT && (
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex gap-1.5 px-2 py-1"
            >
              {filters.searchMode === SearchMode.KEY_EXACT && (
                <>
                  <TargetIcon className="h-3 w-3" aria-hidden="true" />
                  <span>Exact Match</span>
                </>
              )}
              {filters.searchMode === SearchMode.KEY_PREFIX && (
                <>
                  <ZapIcon className="h-3 w-3" aria-hidden="true" />
                  <span>Prefix</span>
                </>
              )}
            </Badge>
          )}

          {/* T100: Save Search button - only for authenticated users */}
          {session?.user && onSaveSearch && (
            <Button
              variant="outline"
              size="icon"
              onClick={onSaveSearch}
              title="Save current search"
              aria-label="Save current search"
            >
              <BookmarkPlusIcon className="h-4 w-4" />
            </Button>
          )}

          {/* T99-T111: Saved Searches Dropdown */}
          {session?.user && onSelectSearch && (
            <SavedSearchesDropdown onSelectSearch={onSelectSearch} />
          )}

          {/* <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              title="Toggle advanced search options"
            >
              <ExtraParamsIcon className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger> */}

          <div className="flex items-center gap-2">
            {/* T143: Export button that opens modal */}
            {onExport && (
              <Button
                variant="outline"
                size="icon"
                onClick={onExport}
                title="Export search results"
                aria-label="Export search results"
              >
                <FileDownIcon className="h-4 w-4" />
              </Button>
            )}

            {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={downloadMutation.isPending}
                variant="outline"
                size="icon"
                title="Download dictionary export"
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleDownload("all")}
                disabled={downloadMutation.isPending}
              >
                All Formats (ZIP)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("txt")}
                disabled={downloadMutation.isPending}
              >
                Text Format
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("csv")}
                disabled={downloadMutation.isPending}
              >
                CSV Format
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("json")}
                disabled={downloadMutation.isPending}
              >
                JSON Format
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}

            {!asBrowse && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/dictionary/new")}
              >
                <AddIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* <CollapsibleContent>
        <div className="border p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <DictionariesMultiSelectChips />

          <div className="flex items-center space-x-2">
            <Switch
              id="fts"
              checked={ftsParam === "x"}
              onCheckedChange={(checked) => {
                updateSearchParams({ fts: checked ? "x" : "", offset: "0" });
              }}
            />
            <Label htmlFor="fts">Full Text Search</Label>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <Label htmlFor="sortBy">
              <ArrowDownAZIcon className="inline size-5" />
            </Label>
            <Select
              value={sortByParam}
              onValueChange={(value: string) => {
                updateSearchParams({ sortBy: value, offset: "0" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sort field..." />
              </SelectTrigger>
              <SelectContent>
                {DICTIONARY_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <Label htmlFor="sortOrder">
              <ArrowDownUpIcon className="inline size-5" />
            </Label>
            <Select
              value={sortOrderParam}
              onValueChange={(value: string) => {
                updateSearchParams({ sortOrder: value, offset: "0" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sort order..." />
              </SelectTrigger>
              <SelectContent>
                {DICTIONARY_SORT_ORDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent> */}
    </Collapsible>
  );
};
