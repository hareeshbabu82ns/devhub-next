"use client";

import React, { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { fetchEveryDayEntities, updateEntityQuickAccessAttr } from "../actions";
import { useLanguageAtomValue } from "@/hooks/use-config";
import {
  QUICK_ACCESS_CATEGORIES,
  QUICK_ACCESS_ENTITIES,
  type QuickAccessCategory,
} from "@/lib/quick-access-constants";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { cn } from "@/lib/utils";
import { Calendar, Star } from "lucide-react";
import EntitySearchDlgTrigger from "../../entities/_components/EntitySearchDlgTrigger";
import {
  DAYS_OF_WEEK,
  DAY_DEITY_ASSOCIATIONS,
  DAY_INDEX_TO_CATEGORY,
  isDaySpecificCategory,
} from "@/lib/quick-access-constants";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import { useQueryLimitAtomValue } from "@/hooks/use-config";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";

interface EverydayDevotionalTabProps {
  className?: string;
  initialPage?: number;
}

const EverydayDevotionalTab: React.FC<EverydayDevotionalTabProps> = ({
  className,
  initialPage = 1,
}) => {
  const router = useRouter();
  const language = useLanguageAtomValue();
  const queryClient = useQueryClient();
  const { updateTabState } = useDevotionalTabState();

  const limit = parseInt(useQueryLimitAtomValue());
  const [page, setPage] = useState((initialPage || 1) - 1);
  const currentPage = page + 1;

  // Dialog state management
  const [everydayDialogOpen, setEverydayDialogOpen] = useState(false);

  // Touch device detection
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  // Fetch everyday devotional content
  const {
    data: everydayData,
    isFetching,
    isLoading,
    error: everydayError,
    refetch,
  } = useQuery({
    queryKey: ["devotional", "everyday", language, { limit, offset: page }],
    queryFn: async () => {
      const result = await fetchEveryDayEntities({
        language,
        pageIndex: page,
        pageSize: limit,
      });
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: QUERY_STALE_TIME_LONG,
    placeholderData: keepPreviousData,
  });

  // Prefetch next page for smoother navigation
  useEffect(() => {
    if (everydayData && everydayData.results.length === limit) {
      // Only prefetch if there might be more data
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: [
          "devotional",
          "everyday",
          language,
          { limit, offset: nextPage },
        ],
        queryFn: async () => {
          const result = await fetchEveryDayEntities({
            language,
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
  }, [everydayData, page, limit, language, queryClient]);

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

  // Handle entity selection from search dialog
  const handleEverydayEntitySelect = (entity: Entity) => {
    handleAddToDevotional(entity, QUICK_ACCESS_CATEGORIES.EVERYDAY);
    setEverydayDialogOpen(false);
  };

  // Pagination handlers
  const paginatePageChangeAction = (newPage: number) => {
    setPage(newPage - 1); // Convert from 1-based to 0-based
    updateTabState({ page: newPage });
  };

  const onBackAction = () => {
    setPage((prev) => {
      const newPage = Math.max(0, prev - 1);
      updateTabState({ page: newPage + 1 });
      return newPage;
    });
  };

  const onFwdAction = () => {
    setPage((prev) => {
      const newPage = prev + 1;
      updateTabState({ page: newPage + 1 });
      return newPage;
    });
  };

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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading && "Loading everyday devotional content..."}
        {!isLoading &&
          everydayData &&
          `Showing ${everydayData.results.length} of ${everydayData.total} everyday items`}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold"></h3>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <EntitySearchDlgTrigger
            forTypes={QUICK_ACCESS_ENTITIES}
            open={everydayDialogOpen}
            onOpenChange={setEverydayDialogOpen}
            onClick={handleEverydayEntitySelect}
          />
          <PaginationDDLB
            totalCount={everydayData?.total || 0}
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
      {everydayError && <SimpleAlert title="Error loading everyday content" />}

      {!isLoading && everydayData && everydayData.results.length === 0 && (
        <EmptyState
          icon={Star}
          title="No everyday content yet"
          description="Add STHOTRAM and PURANAM entities to your daily devotional collection."
          context="Everyday content appears here for quick daily access."
          action={{
            label: "Add Content",
            onClick: () => setEverydayDialogOpen(true),
          }}
        />
      )}

      {!isLoading && everydayData && everydayData.results.length > 0 && (
        <div className="grid gap-4 lg:gap-6 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {everydayData.results.map((entity) => renderEntityTile(entity))}
        </div>
      )}
    </div>
  );
};

export default EverydayDevotionalTab;
