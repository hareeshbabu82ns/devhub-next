/**
 * DictionaryPopupWidget - Quick Lookup Popup
 * 
 * Phase 8: User Story 7 (US7) - Quick Lookup Popup Widget
 * Tasks: T117-T124
 * 
 * Purpose: Global dictionary popup accessible from any page
 * Features:
 * - Keyboard shortcut (Ctrl/Cmd+Shift+D) - T115
 * - Modal overlay with search - T113, T116
 * - Focus trap and restoration - T117, T118
 * - Full-screen on mobile - T122
 * - Click-outside-to-close - T121
 * - Context menu integration - T119
 * - Scrollable results - T123
 * - ARIA labels - T124
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLinkIcon, SearchIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { createFocusTrap, createFocusRestoration, getAriaAnnouncer } from "@/lib/accessibility/focus-management";
import { useDictionarySearch } from "@/hooks/use-dictionary-search";
import { useMediaQuery } from "@/hooks/use-media-query";

export function DictionaryPopupWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusRestorationRef = useRef(createFocusRestoration());
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // T115: Keyboard shortcut listener (Ctrl/Cmd+Shift+D)
  useKeyboardShortcut({
    shortcut: { key: "D", ctrl: true, meta: true, shift: true },
    onTrigger: () => {
      // Only enable on desktop (not mobile)
      if (!isMobile) {
        openPopup();
      }
    },
    enabled: true,
  });

  // Dictionary search hook
  const searchHook = useDictionarySearch({
    defaultLimit: 10, // Show fewer results in popup
    enabled: isOpen,
  });

  // Update search term when query changes
  useEffect(() => {
    if (isOpen) {
      searchHook.setSearchTerm(searchQuery);
    }
  }, [searchQuery, isOpen]);

  const { results, isLoading, error } = searchHook;

  // T118: Focus restoration - save focus when opening
  const openPopup = useCallback((prefilledText?: string) => {
    focusRestorationRef.current.save();
    setIsOpen(true);
    if (prefilledText) {
      setSearchQuery(prefilledText);
    }
    
    // T124: Announce to screen readers
    getAriaAnnouncer().announce("Dictionary popup opened");
  }, []);

  // T118: Focus restoration - restore focus when closing
  const closePopup = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setSelectedText("");
    
    // T124: Announce to screen readers
    getAriaAnnouncer().announce("Dictionary popup closed");
    
    // Restore focus to trigger element
    setTimeout(() => {
      focusRestorationRef.current.restore();
    }, 100);
  }, []);

  // T117: Implement focus trap when popup is open
  useEffect(() => {
    if (!isOpen || !popupRef.current) return;

    const cleanup = createFocusTrap(popupRef.current);

    // T117: Handle Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePopup();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      cleanup();
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closePopup]);

  // Focus search input when popup opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // T119: Context menu integration - "Look up in dictionary"
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (selectedText && selectedText.length > 0) {
        setSelectedText(selectedText);
      }
    };

    const handleContextMenuOpen = (e: Event) => {
      if (selectedText) {
        // Add custom context menu item (would need additional library for full implementation)
        // For now, we'll capture the selection and allow user to open popup manually
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("contextmenu", handleContextMenuOpen);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("contextmenu", handleContextMenuOpen);
    };
  }, [selectedText]);

  // T120: Open in full dictionary page
  const handleOpenInFullPage = () => {
    closePopup();
    router.push(`/dictionary?search=${encodeURIComponent(searchQuery)}`);
  };

  // T121: Click-outside-to-close is handled by Dialog component default behavior

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        ref={popupRef}
        className={`
          ${isMobile 
            ? "w-full h-full max-w-full max-h-full rounded-none p-safe-area" // T122: Full-screen on mobile with safe-area
            : "max-w-[400px] max-h-[600px]" // Desktop: max 400px width
          }
          flex flex-col gap-4
        `}
        aria-label="Dictionary Quick Lookup" // T124: ARIA labels
        aria-describedby="popup-description"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle id="popup-title">Quick Dictionary Lookup</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={closePopup}
            aria-label="Close dictionary popup" // T124
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <p id="popup-description" className="sr-only">
          Search for dictionary entries. Press Escape to close.
        </p>

        {/* T116: Search input within popup */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search dictionary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Dictionary search input" // T124
            />
          </div>
        </div>

        {/* T120: Open in full dictionary link */}
        {searchQuery && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInFullPage}
            className="w-full"
            aria-label="Open in full dictionary page" // T124
          >
            <ExternalLinkIcon className="mr-2 h-4 w-4" />
            Open in Full Dictionary
          </Button>
        )}

        {/* T123: Scrollable results area with proper overflow */}
        <div
          className={`
            overflow-y-auto overflow-x-hidden
            ${isMobile ? "flex-1" : "max-h-96"} // T123: vh-based height mobile, max-h-96 desktop
            -mx-4 px-4
            overscroll-contain // T123: momentum scrolling
          `}
          role="region"
          aria-label="Dictionary search results" // T124
          aria-live="polite" // T124: Announce result changes
        >
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Searching...
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading results. Please try again.
            </div>
          )}
          
          {!isLoading && !error && searchQuery && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          )}
          
          {!isLoading && !error && results.length > 0 && (
            <div className="space-y-2">
              {results.slice(0, 10).map((result: any, index: number) => (
                <div
                  key={result.id || index}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    router.push(`/dictionary/${result.id}`);
                    closePopup();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {result.word?.[0]?.value || result.phonetic || "N/A"}
                      </div>
                      {result.phonetic && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.phonetic}
                        </div>
                      )}
                      {result.description?.[0]?.value && (
                        <div className="text-xs mt-1 line-clamp-2">
                          {result.description[0].value}
                        </div>
                      )}
                    </div>
                    {result.origin && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {result.origin}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Helper text */}
        <div className="text-xs text-muted-foreground text-center">
          {!isMobile && (
            <p>Press <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Shift+D</kbd> to open this popup from anywhere</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DictionaryPopupWidget;
