# Implementation Plan: Devotional Quick Access Enhancements

## Phase 1: URL Navigation & Core Responsiveness

### 1.1 URL Search Param Integration

#### Step 1: Create URL State Hook

**File**: `/src/hooks/use-devotional-tab-state.ts`

```typescript
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { QuickAccessCategory } from "@/lib/quick-access-constants";

export type DevotionalTabValue = "everyday" | "daily" | "bookmarks";

interface DevotionalTabState {
  tab: DevotionalTabValue;
  day?: QuickAccessCategory;
  page?: number;
}

export function useDevotionalTabState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current state from URL
  const currentState = useMemo<DevotionalTabState>(() => {
    const tab = (searchParams.get("tab") as DevotionalTabValue) || "everyday";
    const day = searchParams.get("day")?.toUpperCase() as
      | QuickAccessCategory
      | undefined;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;

    return { tab, day, page };
  }, [searchParams]);

  // Update URL with new state
  const updateTabState = useCallback(
    (updates: Partial<DevotionalTabState>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update tab
      if (updates.tab !== undefined) {
        params.set("tab", updates.tab);

        // Clear day param if switching away from daily tab
        if (updates.tab !== "daily") {
          params.delete("day");
        }

        // Reset page on tab change unless explicitly preserved
        if (updates.page === undefined) {
          params.delete("page");
        }
      }

      // Update day (only for daily tab)
      if (updates.day !== undefined && currentState.tab === "daily") {
        params.set("day", updates.day.toLowerCase());
      } else if (updates.day === undefined && updates.tab === "daily") {
        params.delete("day");
      }

      // Update page
      if (updates.page !== undefined && updates.page > 1) {
        params.set("page", updates.page.toString());
      } else if (updates.page === 1 || updates.page === undefined) {
        params.delete("page");
      }

      // Use replace to avoid polluting browser history on programmatic changes
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router, currentState.tab],
  );

  return {
    currentState,
    updateTabState,
  };
}
```

#### Step 2: Update DevotionalQuickAccess Component

**File**: `/src/app/(app)/dashboard/_components/DevotionalQuickAccess.tsx`

```typescript
"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Star, Bookmark } from "lucide-react";
import EverydayDevotionalTab from "./EverydayDevotionalTab";
import WeeklyDevotionalTab from "./WeeklyDevotionalTab";
import BookmarkedEntitiesGrid from "./BookmarkedEntitiesGrid";
import { cn } from "@/lib/utils";
import { useDevotionalTabState } from "@/hooks/use-devotional-tab-state";

interface DevotionalQuickAccessProps {
  className?: string;
}

const DevotionalQuickAccess: React.FC<DevotionalQuickAccessProps> = ({
  className,
}) => {
  const { currentState, updateTabState } = useDevotionalTabState();

  const handleTabChange = (value: string) => {
    updateTabState({
      tab: value as 'everyday' | 'daily' | 'bookmarks',
    });
  };

  return (
    <Card className={cn("rounded-sm p-0", className)}>
      <Tabs value={currentState.tab} onValueChange={handleTabChange} className="w-full">
        <CardHeader className="p-0">
          <div className="flex flex-col gap-2 p-2 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Quick Access
            </CardTitle>
            <TabsList className="grid w-full grid-cols-3 h-auto sm:w-auto sm:h-10">
              <TabsTrigger
                value="everyday"
                className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm py-2 sm:py-0"
                aria-label="Everyday devotional content"
              >
                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Every Day</span>
                <span className="xs:hidden">Daily</span>
              </TabsTrigger>
              <TabsTrigger
                value="daily"
                className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm py-2 sm:py-0"
                aria-label="Day-specific devotional content"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Days of Week</span>
                <span className="xs:hidden">Weekly</span>
              </TabsTrigger>
              <TabsTrigger
                value="bookmarks"
                className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm py-2 sm:py-0"
                aria-label="Bookmarked entities"
              >
                <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Bookmarks</span>
                <span className="xs:hidden">Saved</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <TabsContent value="everyday">
            <EverydayDevotionalTab initialPage={currentState.page} />
          </TabsContent>

          <TabsContent value="daily">
            <WeeklyDevotionalTab
              initialDay={currentState.day}
              initialPage={currentState.page}
            />
          </TabsContent>

          <TabsContent value="bookmarks">
            <BookmarkedEntitiesGrid initialPage={currentState.page} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default DevotionalQuickAccess;
```

#### Step 3: Update Tab Components to Accept Initial State

**EverydayDevotionalTab Changes**:

```typescript
interface EverydayDevotionalTabProps {
  className?: string;
  initialPage?: number;
}

const EverydayDevotionalTab: React.FC<EverydayDevotionalTabProps> = ({
  className,
  initialPage = 1,
}) => {
  const { updateTabState } = useDevotionalTabState();
  const [page, setPage] = useState(initialPage - 1); // 0-based internally

  // Sync page changes to URL
  const handlePageChange = (newPage: number) => {
    setPage(newPage - 1);
    updateTabState({ page: newPage });
  };

  // ... rest of component
};
```

**WeeklyDevotionalTab Changes**:

```typescript
interface WeeklyDevotionalTabProps {
  className?: string;
  initialDay?: QuickAccessCategory;
  initialPage?: number;
}

const WeeklyDevotionalTab: React.FC<WeeklyDevotionalTabProps> = ({
  className,
  initialDay,
  initialPage = 1,
}) => {
  const { updateTabState } = useDevotionalTabState();
  const todayCategory = DAY_INDEX_TO_CATEGORY[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState<QuickAccessCategory>(
    initialDay || todayCategory,
  );
  const [page, setPage] = useState(initialPage - 1);

  // Sync day changes to URL
  const handleDayChange = (dayCategory: QuickAccessCategory) => {
    setSelectedDay(dayCategory);
    setPage(0); // Reset pagination
    updateTabState({ day: dayCategory, page: 1 });
  };

  // Sync page changes to URL
  const handlePageChange = (newPage: number) => {
    setPage(newPage - 1);
    updateTabState({ page: newPage });
  };

  // ... rest of component
};
```

### 1.2 Responsive Layout Improvements

#### Step 1: Mobile-Friendly Day Selector

**File**: `/src/app/(app)/dashboard/_components/WeeklyDevotionalTab.tsx`

```typescript
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Inside component render:
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
  {/* Day selector - scrollable on mobile */}
  <ScrollArea className="w-full sm:w-auto">
    <div className="flex gap-2 pb-2">
      {DAYS_OF_WEEK.map((day, index) => {
        const dayCategory = DAY_INDEX_TO_CATEGORY[index];
        const isSelected = selectedDay === dayCategory;
        const isToday = index === todayIndex;

        if (!isDaySpecificCategory(dayCategory)) {
          return null;
        }

        const association = DAY_DEITY_ASSOCIATIONS[dayCategory];

        return (
          <Button
            key={day}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => handleDayChange(dayCategory)}
            className={cn(
              "flex flex-col h-auto px-3 py-2 min-w-[64px] shrink-0",
              isToday && "ring-2 ring-primary ring-offset-2",
            )}
            aria-pressed={isSelected}
            aria-label={`${day}, dedicated to ${association.deity}`}
          >
            <span className="text-xs font-medium whitespace-nowrap">
              {day.slice(0, 3)} {/* Show only first 3 chars on mobile */}
            </span>
            <span className="text-[10px] opacity-70 hidden sm:block">
              {association.deity}
            </span>
          </Button>
        );
      })}

      {/* Today quick jump button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDayChange(todayCategory)}
        className={cn(
          "flex items-center gap-1 px-3 shrink-0",
          selectedDay === todayCategory && "hidden" // Hide if already on today
        )}
        aria-label="Jump to today"
      >
        <CalendarCheck className="h-3 w-3" />
        <span className="text-xs">Today</span>
      </Button>
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>

  {/* Action buttons - stacked on mobile */}
  <div className="flex items-center gap-2 justify-end">
    <EntitySearchDlgTrigger
      forTypes={QUICK_ACCESS_ENTITIES}
      open={weeklyDialogOpen}
      onOpenChange={setWeeklyDialogOpen}
      onClick={handleWeeklyEntitySelect}
    />
    <PaginationDDLB
      totalCount={dayData?.total || 0}
      limit={limit}
      page={currentPage}
      onFwdClick={onBackAction}
      onBackClick={onFwdAction}
      onPageChange={paginatePageChangeAction}
    />
    <Button
      onClick={() => refetch()}
      type="button"
      variant="outline"
      size="icon"
      aria-label="Refresh content"
    >
      <Icons.refresh className="h-4 w-4" />
    </Button>
  </div>
</div>
```

#### Step 2: Enhanced Grid Breakpoints

**All Tab Components**:

```typescript
// Update grid container classes
<div className={cn(
  "grid gap-4 lg:gap-6",
  // Mobile: 1 column for very small, 2 for larger phones
  "grid-cols-1 xs:grid-cols-2",
  // Tablet: 2-3 columns depending on size
  "sm:grid-cols-2 md:grid-cols-3",
  // Desktop: 4-6 columns
  "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
)}>
  {data?.results.map((entity) => renderEntityTile(entity))}
</div>
```

#### Step 3: Responsive Action Button Placement

```typescript
const renderEntityTile = (entity: Entity, showActions = true) => {
  const tile = mapEntityToTileModel(entity, language);

  return (
    <div key={entity.id} className="relative group">
      <ArtTile model={tile} onTileClicked={() => handleTileClick(entity)} />

      {showActions && (
        <div
          className={cn(
            "absolute top-2 right-2 z-10",
            // Always visible on touch, hover on mouse
            isTouchDevice
              ? "opacity-100 bg-background/95 backdrop-blur-sm rounded-md shadow-lg"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isTouchDevice ? "ghost" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
                aria-label="Quick access actions"
              >
                <Icons.moreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            {/* ... dropdown content */}
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
```

### 1.3 Tailwind Config Updates

**File**: `tailwind.config.ts`

```typescript
export default {
  theme: {
    extend: {
      screens: {
        xs: "475px", // Extra small breakpoint for large phones
        // ... existing breakpoints
      },
    },
  },
} satisfies Config;
```

---

## Phase 2: Enhanced UX & Empty States

### 2.1 Context-Aware Empty States

#### Step 1: Create EmptyState Component

**File**: `/src/components/utils/EmptyState.tsx`

```typescript
import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  context?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  context,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {context && (
        <p className="text-sm text-muted-foreground mb-2 max-w-md">
          {context}
        </p>
      )}

      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} variant="default" className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
};
```

#### Step 2: Implement in Tab Components

**EverydayDevotionalTab**:

```typescript
import { EmptyState } from "@/components/utils/EmptyState";

// Replace empty state section:
{everydayData && everydayData.results.length === 0 && (
  <EmptyState
    icon={Star}
    title="Build your daily collection"
    context="Create a personalized collection of devotional content to start each day."
    description="Use the search button above to add stotrams, puranas, and vrathas to your everyday collection."
    action={{
      label: "Search Entities",
      onClick: () => setEverydayDialogOpen(true),
    }}
  />
)}
```

**WeeklyDevotionalTab**:

```typescript
{dayData && dayData.results.length === 0 && (
  <EmptyState
    icon={Calendar}
    title={`No content for ${DAYS_OF_WEEK[Object.values(DAY_INDEX_TO_CATEGORY).indexOf(selectedDay)]}`}
    context={`${DAYS_OF_WEEK[Object.values(DAY_INDEX_TO_CATEGORY).indexOf(selectedDay)]} is dedicated to ${DAY_DEITY_ASSOCIATIONS[selectedDay].deity}`}
    description="Add devotional content specific to this day to build your weekly routine."
    action={{
      label: `Search ${DAY_DEITY_ASSOCIATIONS[selectedDay].deity} Stotrams`,
      onClick: () => setWeeklyDialogOpen(true),
    }}
  />
)}
```

### 2.2 Skeleton Loading States

#### Step 1: Create Skeleton Components

**File**: `/src/components/blocks/entity-grid-skeleton.tsx`

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EntityGridSkeletonProps {
  count?: number;
  className?: string;
}

export const EntityGridSkeleton: React.FC<EntityGridSkeletonProps> = ({
  count = 8,
  className,
}) => {
  return (
    <div
      className={cn(
        "grid gap-4 lg:gap-6",
        "grid-cols-1 xs:grid-cols-2",
        "sm:grid-cols-2 md:grid-cols-3",
        "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
};
```

#### Step 2: Use in Tab Components

```typescript
import { EntityGridSkeleton } from "@/components/blocks/entity-grid-skeleton";

// Replace loader with skeleton
{(isFetching || isLoading) && <EntityGridSkeleton count={limit} />}

// Or use TanStack Query's placeholderData for smoother transitions
const { data, isFetching } = useQuery({
  // ... query options
  placeholderData: keepPreviousData, // Shows old data while fetching new
});

// Then conditionally show skeleton only on initial load
{isLoading && <EntityGridSkeleton />}
{isFetching && !isLoading && (
  <div className="relative">
    <div className="opacity-50">{/* Render grid with old data */}</div>
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader />
    </div>
  </div>
)}
```

### 2.3 Enhanced Error States

```typescript
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Failed to load content</AlertTitle>
    <AlertDescription className="flex items-center justify-between">
      <span>{error.message}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => refetch()}
      >
        Try Again
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Phase 3: Accessibility Enhancements

### 3.1 ARIA Labels & Keyboard Navigation

#### Step 1: Update Tab Component

```typescript
<Tabs
  value={currentState.tab}
  onValueChange={handleTabChange}
  className="w-full"
>
  <TabsList
    role="tablist"
    aria-label="Devotional content categories"
    className="..."
  >
    <TabsTrigger
      value="everyday"
      role="tab"
      aria-controls="everyday-panel"
      aria-selected={currentState.tab === 'everyday'}
      // ... other props
    />
  </TabsList>

  <TabsContent
    value="everyday"
    id="everyday-panel"
    role="tabpanel"
    aria-labelledby="everyday-tab"
  >
    {/* content */}
  </TabsContent>
</Tabs>
```

#### Step 2: Keyboard Shortcuts Hook

**File**: `/src/hooks/use-keyboard-shortcuts.ts`

```typescript
import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === event.key.toLowerCase() &&
          (s.ctrlKey === undefined || s.ctrlKey === event.ctrlKey) &&
          (s.shiftKey === undefined || s.shiftKey === event.shiftKey) &&
          (s.altKey === undefined || s.altKey === event.altKey),
      );

      if (shortcut) {
        // Don't trigger if user is typing in an input
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.contentEditable === "true"
        ) {
          return;
        }

        event.preventDefault();
        shortcut.handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
```

#### Step 3: Implement in Components

```typescript
// In WeeklyDevotionalTab
useKeyboardShortcuts([
  {
    key: "t",
    handler: () => handleDayChange(todayCategory),
    description: "Jump to today",
  },
  {
    key: "s",
    handler: () => setWeeklyDialogOpen(true),
    description: "Open search",
  },
  {
    key: "ArrowLeft",
    handler: () => {
      const currentIndex = Object.values(DAY_INDEX_TO_CATEGORY).indexOf(
        selectedDay,
      );
      const prevIndex = (currentIndex - 1 + 7) % 7;
      handleDayChange(Object.values(DAY_INDEX_TO_CATEGORY)[prevIndex]);
    },
    description: "Previous day",
  },
  {
    key: "ArrowRight",
    handler: () => {
      const currentIndex = Object.values(DAY_INDEX_TO_CATEGORY).indexOf(
        selectedDay,
      );
      const nextIndex = (currentIndex + 1) % 7;
      handleDayChange(Object.values(DAY_INDEX_TO_CATEGORY)[nextIndex]);
    },
    description: "Next day",
  },
]);
```

### 3.2 Screen Reader Support

```typescript
// Live region for dynamic updates
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {isLoading && "Loading devotional content..."}
  {data && `Showing ${data.results.length} of ${data.total} items`}
  {error && `Error: ${error.message}`}
</div>

// Skip link for keyboard users
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border"
>
  Skip to content
</a>
```

---

## Phase 4: Performance Optimizations

### 4.1 Query Prefetching

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

// Prefetch next page
useEffect(() => {
  if (data && page < Math.ceil(data.total / limit) - 1) {
    queryClient.prefetchQuery({
      queryKey: [
        "devotional",
        "everyday",
        language,
        { limit, offset: page + 1 },
      ],
      queryFn: async () => {
        const result = await fetchEveryDayEntities({
          language,
          pageIndex: page + 1,
          pageSize: limit,
        });
        if (result.status === "error") throw new Error(result.error);
        return result.data;
      },
    });
  }
}, [page, data, limit, language, queryClient]);
```

### 4.2 Code Splitting

**File**: `/src/app/(app)/dashboard/_components/DevotionalQuickAccess.tsx`

```typescript
import { lazy, Suspense } from 'react';
import { EntityGridSkeleton } from '@/components/blocks/entity-grid-skeleton';

// Lazy load tab components
const EverydayDevotionalTab = lazy(() => import('./EverydayDevotionalTab'));
const WeeklyDevotionalTab = lazy(() => import('./WeeklyDevotionalTab'));
const BookmarkedEntitiesGrid = lazy(() => import('./BookmarkedEntitiesGrid'));

// In render:
<TabsContent value="everyday">
  <Suspense fallback={<EntityGridSkeleton />}>
    <EverydayDevotionalTab initialPage={currentState.page} />
  </Suspense>
</TabsContent>
```

---

## Testing Implementation

### Unit Tests

**File**: `/src/hooks/__tests__/use-devotional-tab-state.test.ts`

```typescript
import { renderHook } from "@testing-library/react";
import { useDevotionalTabState } from "../use-devotional-tab-state";

describe("useDevotionalTabState", () => {
  it("should parse URL params correctly", () => {
    // Mock useSearchParams
    // Test parsing logic
  });

  it("should update URL on tab change", () => {
    // Test URL update logic
  });

  it("should clear day param when switching from daily tab", () => {
    // Test param cleanup
  });
});
```

### Integration Tests

**File**: `/src/app/(app)/dashboard/_components/__tests__/DevotionalQuickAccess.test.tsx`

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DevotionalQuickAccess from "../DevotionalQuickAccess";

describe("DevotionalQuickAccess", () => {
  it("should switch tabs via URL params", async () => {
    // Test tab switching
  });

  it("should preserve state across tab switches", () => {
    // Test state preservation
  });
});
```

### E2E Tests

**File**: `/e2e/dashboard-devotional.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Devotional Quick Access", () => {
  test("should support deep linking to specific tab", async ({ page }) => {
    await page.goto("/dashboard?tab=daily&day=monday");

    // Verify Monday tab is selected
    await expect(page.locator('[aria-selected="true"]')).toContainText("Mon");
  });

  test("should update URL when switching tabs", async ({ page }) => {
    await page.goto("/dashboard");

    await page.click("text=Days of Week");
    await expect(page).toHaveURL(/tab=daily/);
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/dashboard?tab=daily");

    // Press 't' to jump to today
    await page.keyboard.press("t");

    // Verify today's day is selected
    const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
    await expect(page.locator('[aria-pressed="true"]')).toContainText(today);
  });
});
```

---

## Rollout Checklist

### Pre-Development

- [ ] Review spec with team
- [ ] Confirm design decisions
- [ ] Set up feature branch
- [ ] Create tracking issue

### Development

- [ ] Implement Phase 1 (URL + Responsive)
- [ ] Write unit tests
- [ ] Manual testing on devices
- [ ] Code review

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Accessibility audit (Lighthouse)
- [ ] Manual screen reader testing
- [ ] Cross-browser testing

### Deployment

- [ ] Merge to main
- [ ] Deploy to staging
- [ ] QA verification
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Collect user feedback

### Post-Deployment

- [ ] Update documentation
- [ ] Write release notes
- [ ] Monitor performance metrics
- [ ] Plan Phase 2 implementation

---

## File Structure

```
src/
├── app/(app)/dashboard/
│   ├── page.tsx (unchanged)
│   ├── actions.ts (unchanged)
│   └── _components/
│       ├── DevotionalQuickAccess.tsx (updated)
│       ├── EverydayDevotionalTab.tsx (updated)
│       ├── WeeklyDevotionalTab.tsx (updated)
│       ├── BookmarkedEntitiesGrid.tsx (updated)
│       └── __tests__/
│           ├── DevotionalQuickAccess.test.tsx (new)
│           └── ...
├── components/
│   ├── blocks/
│   │   └── entity-grid-skeleton.tsx (new)
│   └── utils/
│       └── EmptyState.tsx (new)
├── hooks/
│   ├── use-devotional-tab-state.ts (new)
│   ├── use-keyboard-shortcuts.ts (new)
│   └── __tests__/
│       ├── use-devotional-tab-state.test.ts (new)
│       └── use-keyboard-shortcuts.test.ts (new)
└── lib/
    └── quick-access-constants.ts (unchanged)
```

---

## Dependencies

No new dependencies required! All enhancements use existing libraries:

- Next.js 15 (useSearchParams, useRouter)
- TanStack Query v5
- Radix UI / shadcn components
- Tailwind CSS

---

## Migration Notes

### Breaking Changes

None - all changes are additive and backward compatible.

### Deprecated Patterns

- **Before**: Hard-coded `defaultValue="everyday"` in Tabs
- **After**: URL-driven state with `value={currentState.tab}`

### Data Migration

No database changes required.

---

## Performance Benchmarks

### Target Metrics

- Tab switch (cached): < 100ms
- Tab switch (with fetch): < 500ms
- Initial page load: < 1.5s FCP
- Lighthouse performance: > 90
- Lighthouse accessibility: > 90

### Monitoring

- Use Next.js Analytics for real-user metrics
- Track tab switch duration with performance.mark/measure
- Monitor query cache hit rates
- Log slow queries (> 1s) to identify bottlenecks
