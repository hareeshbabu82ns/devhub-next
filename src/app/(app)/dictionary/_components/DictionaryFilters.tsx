/**
 * DictionaryFilters - Advanced Filter Sidebar
 * 
 * Phase 5: User Story 2 (US2) - Advanced Filter Options
 * Tasks: T74-T86
 * 
 * Purpose: Collapsible filter sidebar with Apply button pattern
 * Features:
 * - Origin multi-select
 * - Language select
 * - Word length range
 * - Has audio checkbox
 * - Has attributes checkbox
 * - Date range picker
 * - Apply/Clear buttons
 * - Pending state management
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MultiSelectChips from "@/components/inputs/MultiSelectChips";
import { FormSelectOptions } from "@/components/inputs/FormSelect";
import { useDictionaryFilters } from "@/hooks/use-dictionary-filters";
import { DICTIONARY_ORIGINS_DDLB, DICTIONARY_LANGUAGES } from "../utils";
import { FilterIcon, XIcon, CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DictionaryFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: () => void;
}

/**
 * T74-T86: Advanced Filter Sidebar with Apply Button Pattern
 * Mobile-responsive drawer with sticky Apply button
 */
export function DictionaryFilters({
  open,
  onOpenChange,
  onApply,
}: DictionaryFiltersProps) {
  const {
    pendingFilters,
    updatePendingFilter,
    applyFilters,
    discardPendingFilters,
    clearFilters,
    hasPendingChanges,
    validation,
    isEmpty,
  } = useDictionaryFilters();

  // T78: Handle Apply button click
  const handleApply = () => {
    applyFilters();
    onOpenChange(false);
    onApply?.();
  };

  // T77: Handle Clear All button click
  const handleClearAll = () => {
    clearFilters();
    onOpenChange(false);
  };

  // T79: Discard pending changes on close without Apply
  const handleClose = (shouldClose: boolean) => {
    if (hasPendingChanges && shouldClose) {
      discardPendingFilters();
    }
    onOpenChange(shouldClose);
  };

  // T75: Convert origins to multi-select format
  const selectedOrigins = pendingFilters.origins
    .map((origin) => DICTIONARY_ORIGINS_DDLB.find((d) => d.value === origin))
    .filter(Boolean) as FormSelectOptions[];

  const handleOriginsChange = (value: FormSelectOptions[]) => {
    updatePendingFilter("origins", value.map((v) => v.value));
  };

  // T75: Word length range handlers
  const handleWordLengthMin = (value: string) => {
    const num = parseInt(value, 10);
    updatePendingFilter("wordLengthMin", isNaN(num) ? null : num);
  };

  const handleWordLengthMax = (value: string) => {
    const num = parseInt(value, 10);
    updatePendingFilter("wordLengthMax", isNaN(num) ? null : num);
  };

  // Count active filters
  const activeFilterCount = [
    pendingFilters.origins.length > 0,
    pendingFilters.language !== null,
    pendingFilters.wordLengthMin !== null,
    pendingFilters.wordLengthMax !== null,
    pendingFilters.hasAudio !== null,
    pendingFilters.hasAttributes !== null,
    pendingFilters.dateRange.start !== null,
    pendingFilters.dateRange.end !== null,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      {/* T74: Mobile-responsive drawer (full-height on mobile) */}
      <SheetContent
        side="left"
        className="w-full sm:max-w-md overflow-y-auto flex flex-col"
        aria-label="Dictionary filters"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" aria-hidden="true" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activeFilterCount} active
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Refine your dictionary search results. Changes will be applied when
            you click Apply.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-6">
          {/* T75: Origin multi-select (chips on mobile) */}
          <div className="space-y-2">
            <Label htmlFor="filter-origins" className="text-base font-medium">
              Dictionary Origins
            </Label>
            <MultiSelectChips
              value={selectedOrigins}
              onChange={handleOriginsChange}
              defaultOptions={DICTIONARY_ORIGINS_DDLB}
              placeholder="Select dictionaries..."
              emptyIndicator={
                <p className="text-center text-sm text-muted-foreground py-2">
                  No dictionaries found
                </p>
              }
              aria-label="Select dictionary origins"
            />
            <p className="text-xs text-muted-foreground">
              Multiple origins use OR logic
            </p>
          </div>

          {/* T75: Language select */}
          <div className="space-y-2">
            <Label htmlFor="filter-language" className="text-base font-medium">
              Language
            </Label>
            <Select
              value={pendingFilters.language || ""}
              onValueChange={(value) =>
                updatePendingFilter("language", value || null)
              }
            >
              <SelectTrigger id="filter-language" aria-label="Select language">
                <SelectValue placeholder="All languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">All languages</SelectItem>
                {DICTIONARY_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* T75: Word length range inputs (touch-optimized) */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Word Length Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="filter-word-min" className="text-sm">
                  Min
                </Label>
                <Input
                  id="filter-word-min"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={pendingFilters.wordLengthMin ?? ""}
                  onChange={(e) => handleWordLengthMin(e.target.value)}
                  className="h-12 text-base" // Touch-friendly height
                  aria-label="Minimum word length"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-word-max" className="text-sm">
                  Max
                </Label>
                <Input
                  id="filter-word-max"
                  type="number"
                  min="1"
                  placeholder="∞"
                  value={pendingFilters.wordLengthMax ?? ""}
                  onChange={(e) => handleWordLengthMax(e.target.value)}
                  className="h-12 text-base" // Touch-friendly height
                  aria-label="Maximum word length"
                />
              </div>
            </div>
          </div>

          {/* T75: Has audio checkbox */}
          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <Checkbox
              id="filter-has-audio"
              checked={pendingFilters.hasAudio ?? false}
              onCheckedChange={(checked) =>
                updatePendingFilter("hasAudio", checked ? true : null)
              }
              className="h-6 w-6" // Touch-friendly size
              aria-label="Filter entries with audio"
            />
            <Label
              htmlFor="filter-has-audio"
              className="text-base font-medium cursor-pointer flex-1"
            >
              Has Audio
            </Label>
          </div>

          {/* T75: Has attributes checkbox */}
          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <Checkbox
              id="filter-has-attributes"
              checked={pendingFilters.hasAttributes ?? false}
              onCheckedChange={(checked) =>
                updatePendingFilter("hasAttributes", checked ? true : null)
              }
              className="h-6 w-6" // Touch-friendly size
              aria-label="Filter entries with attributes"
            />
            <Label
              htmlFor="filter-has-attributes"
              className="text-base font-medium cursor-pointer flex-1"
            >
              Has Attributes
            </Label>
          </div>

          {/* T75: Date range picker (simplified for now) */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="filter-date-start" className="text-sm">
                  From
                </Label>
                <Input
                  id="filter-date-start"
                  type="date"
                  value={
                    pendingFilters.dateRange.start
                      ? pendingFilters.dateRange.start
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : null;
                    updatePendingFilter("dateRange", {
                      ...pendingFilters.dateRange,
                      start: date,
                    });
                  }}
                  className="h-12 text-base"
                  aria-label="Start date"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-date-end" className="text-sm">
                  To
                </Label>
                <Input
                  id="filter-date-end"
                  type="date"
                  value={
                    pendingFilters.dateRange.end
                      ? pendingFilters.dateRange.end.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : null;
                    updatePendingFilter("dateRange", {
                      ...pendingFilters.dateRange,
                      end: date,
                    });
                  }}
                  className="h-12 text-base"
                  aria-label="End date"
                />
              </div>
            </div>
          </div>

          {/* T84: Validation errors */}
          {!validation.isValid && validation.errors.length > 0 && (
            <div
              className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              role="alert"
              aria-live="polite"
            >
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* T76, T77: Footer with Apply and Clear buttons (sticky on mobile) */}
        <SheetFooter className="sticky bottom-0 bg-background border-t pt-4 mt-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* T77: Clear All button */}
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={isEmpty}
              className="flex-1 h-12 sm:h-10" // Touch-friendly on mobile
              aria-label="Clear all filters"
            >
              <XIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Clear All
            </Button>

            {/* T76: Apply button */}
            <Button
              onClick={handleApply}
              disabled={!validation.isValid}
              className={cn(
                "flex-1 h-12 sm:h-10", // Touch-friendly on mobile
                hasPendingChanges && "ring-2 ring-primary ring-offset-2"
              )}
              aria-label="Apply filters"
              aria-live="polite"
            >
              <CheckIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Apply Filters
              {hasPendingChanges && (
                <Badge variant="secondary" className="ml-2">
                  Pending
                </Badge>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default DictionaryFilters;
