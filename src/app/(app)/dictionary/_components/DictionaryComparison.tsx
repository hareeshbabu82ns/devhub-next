/**
 * DictionaryComparison - Comparison View Component
 * 
 * Phase 11: User Story 8 (US8) - Comparison View for Multiple Dictionaries
 * Tasks: T146-T154
 * 
 * Purpose: Display same word's definitions from multiple dictionaries side-by-side
 * Features:
 * - Responsive layout (side-by-side desktop, vertical mobile) - T146, T152
 * - Column rendering for each dictionary origin - T147
 * - Horizontal scrolling for 3+ columns - T149
 * - Difference highlighting - T150
 * - Dictionary toggle controls - T151
 * - Handle different schemas - T153
 * - ARIA labels and keyboard navigation - T154
 */

"use client";

import { useState, useMemo } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DictionaryItem } from "../types";

interface DictionaryComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: string;
  entries: Partial<DictionaryItem>[]; // Entries from different dictionaries
}

/**
 * T146-T154: Comparison view component with responsive layout
 */
export function DictionaryComparison({
  open,
  onOpenChange,
  word,
  entries,
}: DictionaryComparisonProps) {
  // T151: Dictionary toggle state
  const [visibleOrigins, setVisibleOrigins] = useState<Set<string>>(
    new Set(entries.map((e) => e.origin || ""))
  );

  // Group entries by origin
  const entriesByOrigin = useMemo(() => {
    const grouped = new Map<string, Partial<DictionaryItem>[]>();
    entries.forEach((entry) => {
      const origin = entry.origin || "unknown";
      if (!grouped.has(origin)) {
        grouped.set(origin, []);
      }
      grouped.get(origin)!.push(entry);
    });
    return grouped;
  }, [entries]);

  // Get list of origins
  const origins = Array.from(entriesByOrigin.keys());

  // T151: Toggle visibility of a dictionary
  const toggleOrigin = (origin: string) => {
    setVisibleOrigins((prev) => {
      const next = new Set(prev);
      if (next.has(origin)) {
        next.delete(origin);
      } else {
        next.add(origin);
      }
      return next;
    });
  };

  // T150: Find common and unique content
  const analyzeContent = (origin: string) => {
    const originEntries = entriesByOrigin.get(origin) || [];
    const otherEntries = Array.from(entriesByOrigin.entries())
      .filter(([o]) => o !== origin && visibleOrigins.has(o))
      .flatMap(([, entries]) => entries);

    // For simplicity, we'll just mark content as unique if it appears only in this dictionary
    const hasUnique = originEntries.some((entry) => {
      const desc = entry.description || "";
      return !otherEntries.some((other) => (other.description || "") === desc);
    });

    return { hasUnique };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] h-[90vh] flex flex-col"
        aria-describedby="comparison-description"
      >
        <DialogHeader>
          <DialogTitle id="comparison-title">
            Dictionary Comparison: {word}
          </DialogTitle>
          <p id="comparison-description" className="text-sm text-muted-foreground">
            Comparing definitions from {origins.length} dictionaries
          </p>
        </DialogHeader>

        {/* T151: Dictionary toggle controls */}
        <div className="flex flex-wrap gap-2 py-2 border-b">
          <span className="text-sm font-medium mr-2">Show/Hide:</span>
          {origins.map((origin) => (
            <Button
              key={origin}
              variant={visibleOrigins.has(origin) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleOrigin(origin)}
              className="gap-2"
              aria-label={`Toggle ${origin} dictionary visibility`} // T154
              aria-pressed={visibleOrigins.has(origin)} // T154
            >
              {visibleOrigins.has(origin) ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              {origin}
            </Button>
          ))}
        </div>

        {/* T146, T149, T152: Responsive comparison view */}
        <ScrollArea
          className="flex-1"
          role="region"
          aria-label="Dictionary comparison content" // T154
        >
          {/* T152: Vertical stack on mobile, horizontal on desktop */}
          <div
            className={cn(
              "grid gap-4 p-4",
              // Mobile: single column (< 768px)
              "grid-cols-1",
              // Tablet: 2 columns (>= 768px)
              "md:grid-cols-2",
              // Desktop: 3 columns for 3+ dictionaries (>= 1024px)
              origins.filter((o) => visibleOrigins.has(o)).length >= 3 &&
                "lg:grid-cols-3"
            )}
          >
            {/* T147: Column rendering for each dictionary origin */}
            {origins
              .filter((origin) => visibleOrigins.has(origin))
              .map((origin) => {
                const originEntries = entriesByOrigin.get(origin) || [];
                const { hasUnique } = analyzeContent(origin);

                return (
                  <Card
                    key={origin}
                    className={cn(
                      "flex flex-col",
                      // T150: Highlight card if it has unique content
                      hasUnique && "border-primary"
                    )}
                  >
                    {/* T147: Prominent origin label (sticky on mobile) */}
                    <CardHeader className="sticky top-0 bg-card z-10 border-b">
                      <CardTitle className="flex items-center justify-between">
                        <span>{origin}</span>
                        {hasUnique && (
                          <Badge variant="secondary" className="text-xs">
                            Unique Content
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 pt-4 space-y-4">
                      {originEntries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0"
                        >
                          {/* T153: Handle different schemas - common fields */}
                          {entry.word && (
                            <div>
                              <span className="font-semibold text-lg">
                                {entry.word}
                              </span>
                            </div>
                          )}

                          {entry.phonetic && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Phonetic: </span>
                              {entry.phonetic}
                            </div>
                          )}

                          {entry.description && (
                            <div className="text-sm">
                              <span className="font-medium">Description: </span>
                              <p className="mt-1">{entry.description}</p>
                            </div>
                          )}

                          {/* T153: Show attributes if present */}
                          {entry.attributes && entry.attributes.length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Attributes: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entry.attributes.map((attr, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {attr.key}: {attr.value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* T153: Show unique fields in "Additional Info" */}
                          {entry.sourceData && (
                            <details className="text-xs">
                              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                                Additional Info
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                                {JSON.stringify(entry.sourceData, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}

                      {originEntries.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No entries found for this word in {origin}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </ScrollArea>

        {/* T154: Screen reader live region */}
        <div className="sr-only" role="status" aria-live="polite">
          Showing {Array.from(visibleOrigins).length} of {origins.length} dictionaries
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DictionaryComparison;