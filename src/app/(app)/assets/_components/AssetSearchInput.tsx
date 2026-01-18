"use client";

import { Button } from "@/components/ui/button";
import { Search, X, Terminal, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AssetSearchProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;
  regexError: string | null;
  setRegexError: (value: string | null) => void;
  totalItems: number;
  debouncedSearchQuery: string;
  handleClearSearch: () => void;
}

const AssetSearchInput = ({
  searchQuery,
  setSearchQuery,
  useRegex,
  setUseRegex,
  regexError,
  setRegexError,
  totalItems,
  debouncedSearchQuery,
  handleClearSearch,
}: AssetSearchProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="search"
            placeholder={
              useRegex ? "Search with regex pattern... (e.g. ^img_.*\\.png$)" : "Search assets by name..."
            }
            className={cn(
              "pl-9 pr-10 h-10 bg-background/50 backdrop-blur-sm border-muted transition-all focus:bg-background",
              regexError ? "border-destructive focus-visible:ring-destructive" : ""
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant={useRegex ? "secondary" : "outline"} size="icon" className="h-10 w-10 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Search Options</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="regex-toggle" className="cursor-pointer">
                    Use Regular Expressions
                  </Label>
                </div>
                <Switch
                  id="regex-toggle"
                  checked={useRegex}
                  onCheckedChange={setUseRegex}
                />
              </div>

              {useRegex && (
                <div className="bg-muted/50 p-3 rounded-md text-xs space-y-2">
                  <p className="font-medium">Quick Reference:</p>
                  <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                    <li><code className="bg-muted px-1 rounded">^start</code> - Starts with</li>
                    <li><code className="bg-muted px-1 rounded">end$</code> - Ends with</li>
                    <li><code className="bg-muted px-1 rounded">\d+</code> - Numbers</li>
                    <li><code className="bg-muted px-1 rounded">.</code> - Any character</li>
                  </ul>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {regexError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md animate-in fade-in slide-in-from-top-1">
          <X className="h-4 w-4" />
          <span>Invalid regex pattern: {regexError}</span>
        </div>
      )}

      {debouncedSearchQuery && !regexError && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            {totalItems === 0 ? (
              "No results found"
            ) : (
              <>Found <span className="font-medium text-foreground">{totalItems}</span> result{totalItems !== 1 ? "s" : ""}</>
            )}
          </span>
          {totalItems === 0 && (
            <Button variant="link" size="sm" onClick={handleClearSearch} className="h-auto p-0">
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetSearchInput;

