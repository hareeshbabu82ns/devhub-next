"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { fetchBookmarkedEntities } from "../actions";
import { Bookmark } from "lucide-react";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { EntityGridSkeleton } from "@/components/blocks/entity-grid-skeleton";
import { EmptyState } from "@/components/utils/EmptyState";
import { useDevotionalTabState } from "@/hooks/use-devotional-tab-state";
import {
  flattenEntityParents,
  mapEntityToTileModel,
  mapTileModelToEntity,
} from "../../entities/utils";
import { ArtSlokamTile } from "@/components/blocks/image-tiles-slokam";
import { Entity } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ENTITY_TYPES_CHILDREN, QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { bookmarkEntity } from "../../entities/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
} from "@/hooks/use-config";
import { cn } from "@/lib/utils";

interface BookmarkedEntitiesGridProps {
  className?: string;
  initialPage?: number;
}
const BookmarkedEntitiesGrid: React.FC<BookmarkedEntitiesGridProps> = ({
  className,
  initialPage = 1,
}) => {
  const router = useRouter();
  const { updateTabState } = useDevotionalTabState();
  const queryClient = useQueryClient();

  const language = useLanguageAtomValue();
  const limit = parseInt(useQueryLimitAtomValue());

  const [page, setPage] = useState<number>((initialPage || 1) - 1);
  const currentPage = page + 1;

  const { mutateAsync: onBookmarkClicked } = useMutation({
    mutationKey: ["entityBookmark"],
    mutationFn: async (entity: Entity) => {
      return await bookmarkEntity(
        entity.id,
        entity.bookmarked === undefined ? true : !entity.bookmarked,
      );
    },
    onSuccess: (res) => {
      if (res?.bookmarked) toast.success("Bookmark added");
      else toast.success("Bookmark removed");
    },
  });

  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey: ["bookmarkedEntities", { language, limit, offset: page }],
    queryFn: async () => {
      const entities = await fetchBookmarkedEntities({
        language,
        pageIndex: page,
        pageSize: limit,
      });
      return entities;
    },
    staleTime: QUERY_STALE_TIME_LONG,
    placeholderData: keepPreviousData,
  });

  // Prefetch next page for smoother navigation
  useEffect(() => {
    if (data && data.results && data.results.length === limit) {
      // Only prefetch if there might be more data
      const nextPage = page + 1;
      queryClient.prefetchQuery({
        queryKey: ["bookmarkedEntities", { language, limit, offset: nextPage }],
        queryFn: async () => {
          return await fetchBookmarkedEntities({
            language,
            pageIndex: nextPage,
            pageSize: limit,
          });
        },
        staleTime: QUERY_STALE_TIME_LONG,
      });
    }
  }, [data, page, limit, language, queryClient]);

  const tiles = data?.results?.map((e) => {
    const parents = flattenEntityParents(e);
    const parentBreadcrumb = parents.map((e) => e.text).join(" > ");
    const tile = mapEntityToTileModel(e, language);
    return {
      ...tile,
      subTitle: parentBreadcrumb,
      src: parents[0].imageThumbnail || e.imageThumbnail || tile.src,
    };
  });

  const paginatePageChangeAction = (page: number) => {
    setPage(page - 1);
    updateTabState({ page });
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

  const onTileClicked = (tile: Entity) => {
    const entity = data?.results?.find((e) => e.id === tile.id);
    if (!entity) return;
    const parent =
      entity?.parents && entity.parents[0] ? entity.parents[0] : entity;
    const url = `/entities/${parent.id}/child/${entity.id}`;
    if (ENTITY_TYPES_CHILDREN[parent.type]?.length > 0) router.push(url);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading && "Loading bookmarked entities..."}
        {!isLoading &&
          data &&
          `Showing ${data.results?.length || 0} of ${data.total || 0} bookmarked items`}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold"></h3>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="order-last sm:order-0">
            <PaginationDDLB
              totalCount={data?.total || 0}
              limit={limit}
              page={currentPage}
              onFwdClick={onFwdAction}
              onBackClick={onBackAction}
              onPageChange={paginatePageChangeAction}
            />
          </div>
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh bookmarks"
          >
            <Icons.refresh className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading && <EntityGridSkeleton count={limit} />}
      {error && <SimpleAlert title={error.message} />}

      {!isLoading && (!data || !data.results || data.results.length === 0) && (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Bookmark your favorite devotional content for quick access."
          context="Bookmarked entities from all categories appear here."
        />
      )}

      {!isLoading && data && data.results && data.results.length > 0 && (
        <div className="flex flex-col gap-4 p-2 overflow-auto">
          {tiles?.map((tile) => (
            <ArtSlokamTile
              key={tile.id}
              model={tile}
              index={tile.order}
              onTileClicked={(e) => onTileClicked(mapTileModelToEntity(e))}
              onBookmarkClicked={(e) =>
                onBookmarkClicked(mapTileModelToEntity(e))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarkedEntitiesGrid;
