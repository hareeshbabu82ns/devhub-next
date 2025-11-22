"use client";

import React, { Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Star, Bookmark } from "lucide-react";
import { EntityGridSkeleton } from "@/components/blocks/entity-grid-skeleton";
import { cn } from "@/lib/utils";
import { useDevotionalTabState } from "@/hooks/use-devotional-tab-state";

// Lazy load tab components for code splitting
const EverydayDevotionalTab = lazy(() => import("./EverydayDevotionalTab"));
const WeeklyDevotionalTab = lazy(() => import("./WeeklyDevotionalTab"));
const BookmarkedEntitiesGrid = lazy(() => import("./BookmarkedEntitiesGrid"));

interface DevotionalQuickAccessProps {
  className?: string;
}

const DevotionalQuickAccess: React.FC<DevotionalQuickAccessProps> = ({
  className,
}) => {
  const { currentState, updateTabState } = useDevotionalTabState();

  const handleTabChange = (value: string) => {
    updateTabState({
      tab: value as "everyday" | "daily" | "bookmarks",
    });
  };

  return (
    <Card className={cn("rounded-sm p-0", className)}>
      <Tabs
        value={currentState.tab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <CardHeader className="p-0">
          <div className="flex flex-col gap-2 p-2 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Quick Access
            </CardTitle>
            <TabsList
              className="grid w-full grid-cols-3 h-auto sm:w-auto sm:h-10"
              role="tablist"
              aria-label="Devotional content categories"
            >
              <TabsTrigger
                value="everyday"
                className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm py-2 sm:py-0"
                id="everyday-trigger"
                aria-label="Everyday devotional content"
                aria-controls="everyday-panel"
              >
                <Star className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                <span className="hidden xs:inline">Every Day</span>
                <span className="xs:hidden">Daily</span>
              </TabsTrigger>
              <TabsTrigger
                value="daily"
                className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm py-2 sm:py-0"
                id="daily-trigger"
                aria-label="Day-specific devotional content"
                aria-controls="daily-panel"
              >
                <Calendar
                  className="h-3 w-3 sm:h-4 sm:w-4"
                  aria-hidden="true"
                />
                <span className="hidden xs:inline">Days of Week</span>
                <span className="xs:hidden">Weekly</span>
              </TabsTrigger>
              <TabsTrigger
                value="bookmarks"
                className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm py-2 sm:py-0"
                id="bookmarks-trigger"
                aria-label="Bookmarked entities"
                aria-controls="bookmarks-panel"
              >
                <Bookmark
                  className="h-3 w-3 sm:h-4 sm:w-4"
                  aria-hidden="true"
                />
                <span className="hidden xs:inline">Bookmarks</span>
                <span className="xs:hidden">Saved</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <TabsContent
            value="everyday"
            role="tabpanel"
            id="everyday-panel"
            aria-labelledby="everyday-trigger"
          >
            <Suspense fallback={<EntityGridSkeleton count={6} />}>
              <EverydayDevotionalTab initialPage={currentState.page} />
            </Suspense>
          </TabsContent>

          <TabsContent
            value="daily"
            role="tabpanel"
            id="daily-panel"
            aria-labelledby="daily-trigger"
          >
            <Suspense fallback={<EntityGridSkeleton count={6} />}>
              <WeeklyDevotionalTab
                initialDay={currentState.day}
                initialPage={currentState.page}
              />
            </Suspense>
          </TabsContent>

          <TabsContent
            value="bookmarks"
            role="tabpanel"
            id="bookmarks-panel"
            aria-labelledby="bookmarks-trigger"
          >
            <Suspense fallback={<EntityGridSkeleton count={6} />}>
              <BookmarkedEntitiesGrid initialPage={currentState.page} />
            </Suspense>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default DevotionalQuickAccess;
