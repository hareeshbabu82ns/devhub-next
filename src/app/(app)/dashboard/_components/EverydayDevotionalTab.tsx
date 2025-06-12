"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useMediaQuery } from "@/hooks/use-media-query";
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
}

const EverydayDevotionalTab: React.FC<EverydayDevotionalTabProps> = ({
  className,
}) => {
  const router = useRouter();
  const language = useLanguageAtomValue();
  const queryClient = useQueryClient();

  const limit = parseInt(useQueryLimitAtomValue());
  const [page, setPage] = useState(0);
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
  });

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
    setPage(newPage - 1);
  };

  const onBackAction = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const onFwdAction = () => {
    setPage((prev) => prev + 1);
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold"></h3>
        <div className="flex items-center gap-2">
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
          >
            <Icons.refresh className="size-4" />
          </Button>
        </div>
      </div>

      {(isFetching || isLoading) && <Loader />}
      {everydayError && <SimpleAlert title="Error loading everyday content" />}

      {everydayData && everydayData.results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No everyday quick access content found.</p>
          <p className="text-sm">
            Use the search button above to add STHOTRAM and PURANAM entities to
            your daily collection.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-y-8 xl:gap-x-8">
        {everydayData?.results.map((entity) => renderEntityTile(entity))}
      </div>
    </div>
  );
};

export default EverydayDevotionalTab;
