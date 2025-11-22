/**
 * EntityGridSkeleton - Loading skeleton for entity grids
 *
 * Task: T007 [PH1]
 * Purpose: Show loading state while entities are being fetched
 *
 * Features:
 * - Configurable item count
 * - Responsive grid layout matching entity grid
 * - Card-like appearance with image and text placeholders
 */

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface EntityGridSkeletonProps {
  count?: number;
  className?: string;
}

export function EntityGridSkeleton({
  count = 6,
  className,
}: EntityGridSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4 lg:gap-6",
        // Match entity grid responsive breakpoints
        "grid-cols-1",
        "xs:grid-cols-2",
        "sm:grid-cols-2",
        "md:grid-cols-3",
        "lg:grid-cols-4",
        "xl:grid-cols-5",
        "2xl:grid-cols-6",
        className,
      )}
      role="status"
      aria-label="Loading entities"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card overflow-hidden">
          {/* Image placeholder */}
          <Skeleton className="w-full aspect-video" />

          {/* Content placeholders */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <Skeleton className="h-5 w-3/4" />

            {/* Description lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
