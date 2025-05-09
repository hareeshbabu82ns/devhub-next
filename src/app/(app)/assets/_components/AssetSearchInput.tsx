"use client";

import { Button } from "@/components/ui/button";
import { Search, X, Terminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssetSearchProps {
  searchQuery: string;
  setSearchQuery: ( value: string ) => void;
  useRegex: boolean;
  setUseRegex: ( value: boolean ) => void;
  regexError: string | null;
  setRegexError: ( value: string | null ) => void;
  totalItems: number;
  debouncedSearchQuery: string;
  handleClearSearch: () => void;
}

const AssetSearchInput = ( {
  searchQuery,
  setSearchQuery,
  useRegex,
  setUseRegex,
  regexError,
  setRegexError,
  totalItems,
  debouncedSearchQuery,
  handleClearSearch,
}: AssetSearchProps ) => {
  return (
    <>
      <div className="flex flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={useRegex ? "Search with regex pattern..." : "Search assets..."}
            className="pl-9 pr-10"
            value={searchQuery}
            onChange={( e ) => setSearchQuery( e.target.value )}
          />
          {/* {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )} */}
        </div>

        {/* Regex toggle switch */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Switch
              id="regex-toggle"
              checked={useRegex}
              onCheckedChange={setUseRegex}
            />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="regex-toggle" className="text-sm cursor-pointer">Regex</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Enable regular expression pattern search</p>
                    <p className="text-xs text-secondary-foreground mt-1">Examples:</p>
                    <ul className="text-xs text-secondary-foreground list-disc pl-4 mt-0.5 space-y-0.5">
                      <li>^img - starts with &quot;img&quot;</li>
                      <li>\.jpg$ - ends with &quot;.jpg&quot;</li>
                      <li>\d{4} - contains 4 digits</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {regexError && (
            <div className="text-xs text-destructive">
              Invalid regex: {regexError}
            </div>
          )}
        </div>
      </div>

      {debouncedSearchQuery && !regexError && (
        <div className="mt-2 text-sm text-muted-foreground">
          {totalItems === 0 ? (
            <span>No results found for &quot;{debouncedSearchQuery}&quot;</span>
          ) : (
            <span>Found {totalItems} result{totalItems !== 1 ? 's' : ''} for &quot;{debouncedSearchQuery}&quot;</span>
          )}
        </div>
      )}

      {totalItems === 0 && debouncedSearchQuery && (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-center">No assets found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSearch}
            className="mt-2"
          >
            Clear search
          </Button>
        </div>
      )}
    </>
  );
};

export default AssetSearchInput;