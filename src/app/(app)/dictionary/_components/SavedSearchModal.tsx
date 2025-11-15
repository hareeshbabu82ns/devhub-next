/**
 * SavedSearchModal Component
 * 
 * Phase 7: User Story 4 (US4) - Saved Searches and Query History
 * Task: T101
 * 
 * Purpose: Modal for naming new saved searches
 * Features:
 * - Large input field (min 48px height on mobile)
 * - Validation (required, max length)
 * - Save/Cancel actions
 * - Touch-friendly buttons
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SavedSearchData } from "@/app/actions/saved-search-actions";

interface SavedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchData: Omit<SavedSearchData, "name">;
  onSave: (name: string) => void;
  isSaving?: boolean;
}

/**
 * T101: Modal for naming new saved searches
 * Large input fields (min 48px height on mobile)
 */
export function SavedSearchModal({
  open,
  onOpenChange,
  searchData,
  onSave,
  isSaving = false,
}: SavedSearchModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      // Generate default name from query text
      const defaultName = searchData.queryText
        ? `Search: ${searchData.queryText.slice(0, 50)}`
        : "New Search";
      setName(defaultName);
      setError("");
    }
  }, [open, searchData.queryText]);

  const handleSave = () => {
    // Validate
    if (!name || name.trim().length === 0) {
      setError("Search name is required");
      return;
    }

    if (name.length > 100) {
      setError("Search name must be 100 characters or less");
      return;
    }

    // Clear error and save
    setError("");
    onSave(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-labelledby="save-search-title">
        <DialogHeader>
          <DialogTitle id="save-search-title">Save Search</DialogTitle>
          <DialogDescription>
            Give this search a memorable name so you can easily find it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              placeholder="e.g., Sanskrit words with audio"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              className="h-12 text-base" // T101: Min 48px height on mobile
              maxLength={100}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "search-name-error" : undefined}
            />
            {error && (
              <p
                id="search-name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Query:</span>
              <span className="font-mono text-xs">
                {searchData.queryText || "(empty)"}
              </span>
            </div>
            {searchData.filters && Object.keys(searchData.filters).length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Filters:</span>
                <span className="text-xs">
                  {Object.keys(searchData.filters).length} active
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sort:</span>
              <span className="text-xs">
                {searchData.sortBy || "relevance"} ({searchData.sortOrder || "desc"})
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-12 sm:h-10" // Touch-friendly on mobile
            aria-label="Cancel saving search"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name || name.trim().length === 0}
            className="h-12 sm:h-10" // Touch-friendly on mobile
            aria-label="Save search"
          >
            {isSaving ? "Saving..." : "Save Search"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SavedSearchModal;
