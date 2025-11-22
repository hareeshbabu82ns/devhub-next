"use client";

import React, { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  fetchDayOfWeekEntities,
  updateEntityQuickAccessAttr,
} from "../actions";
import { useLanguageAtomValue } from "@/hooks/use-config";
import {
  DAYS_OF_WEEK,
  DAYS_OF_WEEK_SHORT,
  DAY_DEITY_ASSOCIATIONS,
  QUICK_ACCESS_CATEGORIES,
  DAY_INDEX_TO_CATEGORY,
  type QuickAccessCategory,
  isDaySpecificCategory,
  QUICK_ACCESS_ENTITIES,
} from "@/lib/quick-access-constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArtTile } from "@/components/blocks/image-tiles";
import { mapEntityToTileModel } from "../../entities/utils";
import { Entity } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EntityGridSkeleton } from "@/components/blocks/entity-grid-skeleton";
import { EmptyState } from "@/components/utils/EmptyState";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useDevotionalTabState } from "@/hooks/use-devotional-tab-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/utils/icons";
import { Calendar, Star } from "lucide-react";
import EntitySearchDlgTrigger from "../../entities/_components/EntitySearchDlgTrigger";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import { useQueryLimitAtomValue } from "@/hooks/use-config";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";

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
  const router = useRouter();
  const language = useLanguageAtomValue();
  const queryClient = useQueryClient();
  const { updateTabState } = useDevotionalTabState();

  const limit = parseInt(useQueryLimitAtomValue());
  const [page, setPage] = useState((initialPage || 1) - 1); // Local pagination state (0-based)
  const currentPage = page + 1; // Convert to 1-based for UI

  const [selectedDay, setSelectedDay] = useState<QuickAccessCategory>(
    initialDay || DAY_INDEX_TO_CATEGORY[new Date().getDay()],
  );

  // Dialog state management
  const [weeklyDialogOpen, setWeeklyDialogOpen] = useState(false);

  // Touch device detection
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  // Fetch day-specific devotional content
  const {
    data: dayData,
    isFetching,
    isLoading,
    error: dayError,
    refetch,
  } = useQuery({
    queryKey: [
      "devotional",
      "day",
      selectedDay,
      language,
      { limit, offset: page },
    ],
    queryFn: async () => {
      const result = await fetchDayOfWeekEntities({
        language,
        dayCategory: selectedDay,
        pageIndex: page,
        pageSize: limit,
      });
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: QUERY_STALE_TIME_LONG,
    enabled: selectedDay !== QUICK_ACCESS_CATEGORIES.EVERYDAY,
    placeholderData: keepPreviousData,
  });

  // Prefetch next page for smoother navigation
  useEffect(() => {
    if (dayData && dayData.results.length === limit) {
      // Only prefetch if there might be more data
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: [
          "devotional",
          "day",
          selectedDay,
          language,
          { limit, offset: nextPage },
        ],
        queryFn: async () => {
          const result = await fetchDayOfWeekEntities({
            language,
            dayCategory: selectedDay,
            pageIndex: nextPage,
            pageSize: limit,
          });
          if (result.status === "error") {
            throw new Error(result.error);
          }
          return result.data;
        },
        staleTime: QUERY_STALE_TIME_LONG,
      });
    }
  }, [dayData, page, limit, selectedDay, language, queryClient]);

  // Mutation to update devotional category
  const updateCategoryMutation = useMutation({
    mutationFn: updateEntityQuickAccessAttr,
    onSuccess: (result) => {
      if (result.status === "success") {
        toast.success("Quick access category updated");
        queryClient.invalidateQueries({ queryKey: ["devotional"] });
      } else {
        toast.error(result.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleTileClick = (entity: Entity) => {
    const url = `/entities/${entity.id}`;
    router.push(url);
  };

  const handleAddToDevotional = (
    entity: Entity,
    category: QuickAccessCategory,
  ) => {
    updateCategoryMutation.mutate({
      entityId: entity.id,
      category: category,
    });
  };

  const handleRemoveFromDevotional = (entity: Entity) => {
    updateCategoryMutation.mutate({
      entityId: entity.id,
      category: null,
    });
  };

  const handleWeeklyEntitySelect = (entity: Entity) => {
    handleAddToDevotional(entity, selectedDay);
    setWeeklyDialogOpen(false);
  };

  // Pagination handlers
  const paginatePageChangeAction = (newPage: number) => {
    setPage(newPage - 1); // Convert from 1-based to 0-based
    updateTabState({ day: selectedDay, page: newPage });
  };

  const onBackAction = () => {
    setPage((prev) => {
      const newPage = Math.max(0, prev - 1);
      updateTabState({ day: selectedDay, page: newPage + 1 });
      return newPage;
    });
  };

  const onFwdAction = () => {
    setPage((prev) => {
      const newPage = prev + 1;
      updateTabState({ day: selectedDay, page: newPage + 1 });
      return newPage;
    });
  };

  // Reset pagination when day changes
  const handleDayChange = (dayCategory: QuickAccessCategory) => {
    setSelectedDay(dayCategory);
    setPage(0); // Reset to first page
    updateTabState({ day: dayCategory, page: 1 });
  };

  // Jump to today's category
  const jumpToToday = () => {
    const todayCategory = DAY_INDEX_TO_CATEGORY[new Date().getDay()];
    handleDayChange(todayCategory);
  };

  // Navigate to previous day
  const navigateToPreviousDay = () => {
    const currentIndex = Object.values(DAY_INDEX_TO_CATEGORY).indexOf(
      selectedDay,
    );
    const previousIndex = currentIndex === 0 ? 6 : currentIndex - 1;
    const previousDay = Object.values(DAY_INDEX_TO_CATEGORY)[previousIndex];
    handleDayChange(previousDay);
  };

  // Navigate to next day
  const navigateToNextDay = () => {
    const currentIndex = Object.values(DAY_INDEX_TO_CATEGORY).indexOf(
      selectedDay,
    );
    const nextIndex = currentIndex === 6 ? 0 : currentIndex + 1;
    const nextDay = Object.values(DAY_INDEX_TO_CATEGORY)[nextIndex];
    handleDayChange(nextDay);
  };

  // Keyboard shortcuts for day navigation
  // t = today, s = search, left/right arrows for day navigation
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "t",
        handler: jumpToToday,
        description: "Jump to today",
      },
      {
        key: "s",
        handler: () => setWeeklyDialogOpen(true),
        description: "Open search dialog",
      },
      {
        key: "ArrowLeft",
        handler: navigateToPreviousDay,
        description: "Navigate to previous day",
      },
      {
        key: "ArrowRight",
        handler: navigateToNextDay,
        description: "Navigate to next day",
      },
    ],
    enabled: true,
    ignoreWhenInputFocused: true,
  });

  const renderEntityTile = (entity: Entity, showActions = true) => {
    const tile = mapEntityToTileModel(entity, language);

    return (
      <div key={entity.id} className="relative group">
        <ArtTile model={tile} onTileClicked={() => handleTileClick(entity)} />

        {showActions && (
          <div
            className={cn(
              "absolute top-2 right-2 transition-opacity",
              // Show buttons by default on touch devices, otherwise only on hover/focus
              isTouchDevice
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    isTouchDevice && "bg-background/80 backdrop-blur-sm",
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icons.moreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToDevotional(
                      entity,
                      QUICK_ACCESS_CATEGORIES.EVERYDAY,
                    );
                  }}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Add to Everyday
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayCategory = DAY_INDEX_TO_CATEGORY[index];
                  if (isDaySpecificCategory(dayCategory)) {
                    const association = DAY_DEITY_ASSOCIATIONS[dayCategory];
                    return (
                      <DropdownMenuItem
                        key={day}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToDevotional(entity, dayCategory);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Add to {day}</span>
                        <span className={cn("ml-2 text-xs", association.color)}>
                          ({association.deity})
                        </span>
                      </DropdownMenuItem>
                    );
                  }
                  return null;
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromDevotional(entity);
                  }}
                  className="text-destructive"
                >
                  <Icons.trash className="mr-2 h-4 w-4" />
                  Remove from Quick Access
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  };

  const todayIndex = new Date().getDay();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading && "Loading day-specific devotional content..."}
        {!isLoading &&
          dayData &&
          `Showing ${dayData.results.length} of ${dayData.total} items for ${DAYS_OF_WEEK[Object.values(DAY_INDEX_TO_CATEGORY).indexOf(selectedDay)]}`}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Day selector with horizontal scroll on mobile */}
        <div className="flex items-center gap-2">
          <ScrollArea className="w-full sm:w-auto">
            <div
              className="flex gap-2 pb-2"
              role="radiogroup"
              aria-label="Day of week selector"
            >
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
                      "flex flex-col h-auto px-3 py-2 min-w-16 shrink-0",
                      isToday && "ring-2 ring-primary ring-offset-2",
                    )}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${day}, dedicated to ${association.deity}${isToday ? ", today" : ""}`}
                  >
                    <span className="text-xs font-medium whitespace-nowrap">
                      <span className="sm:hidden">
                        {DAYS_OF_WEEK_SHORT[index]}
                      </span>
                      <span className="hidden sm:inline">{day}</span>
                    </span>
                    <span
                      className="text-[10px] opacity-70 hidden sm:block"
                      aria-hidden="true"
                    >
                      {association.deity}
                    </span>
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {selectedDay !== DAY_INDEX_TO_CATEGORY[new Date().getDay()] && (
            <Button
              variant="ghost"
              size="sm"
              onClick={jumpToToday}
              className="shrink-0"
            >
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
            onFwdClick={onFwdAction}
            onBackClick={onBackAction}
            onPageChange={paginatePageChangeAction}
          />
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh content"
          >
            <Icons.refresh className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading && <EntityGridSkeleton count={limit} />}
      {dayError && <SimpleAlert title="Error loading day-specific content" />}

      {!isLoading && dayData && dayData.results.length === 0 && (
        <EmptyState
          icon={Calendar}
          title={`No content for ${DAYS_OF_WEEK[Object.values(DAY_INDEX_TO_CATEGORY).indexOf(selectedDay)]}`}
          description="Add STHOTRAM and PURANAM entities to this day's devotional collection."
          context={`Dedicated to ${DAY_DEITY_ASSOCIATIONS[selectedDay as keyof typeof DAY_DEITY_ASSOCIATIONS]?.deity || "deity"}`}
          action={{
            label: "Add Content",
            onClick: () => setWeeklyDialogOpen(true),
          }}
        />
      )}

      {!isLoading && dayData && dayData.results.length > 0 && (
        <div className="grid gap-4 lg:gap-6 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {dayData.results.map((entity) => renderEntityTile(entity))}
        </div>
      )}
    </div>
  );
};

export default WeeklyDevotionalTab;
