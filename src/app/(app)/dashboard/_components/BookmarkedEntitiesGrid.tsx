"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { fetchBookmarkedEntities } from "../actions";
import { Loader } from "lucide-react";
import SimpleAlert from "@/components/utils/SimpleAlert";
import {
  flattenEntityParents,
  mapEntityToTileModel,
  mapTileModelToEntity,
} from "../../entities/utils";
import { ArtSlokamTile } from "@/components/blocks/image-tiles-slokam";
import { Entity } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ENTITY_TYPES_CHILDREN } from "@/lib/constants";
import { bookmarkEntity } from "../../entities/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import PaginationDDLB from "@/components/blocks/SimplePaginationDDLB";
import {
  useLanguageAtomValue,
  useQueryLimitAtomValue,
} from "@/hooks/use-config";
import { cn } from "@/lib/utils";

interface BookmarkedEntitiesGridProps {
  className?: string;
}
const BookmarkedEntitiesGrid: React.FC<BookmarkedEntitiesGridProps> = ({
  className,
}) => {
  const router = useRouter();
  const { searchParamsObject: searchParams, updateSearchParams } =
    useSearchParamsUpdater();

  const language = useLanguageAtomValue();
  const limit = parseInt(useQueryLimitAtomValue());

  const page = parseInt(searchParams.offset || "0", 10);
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
    staleTime: 1000 * 60 * 5, // Keep fresh for 5 minutes
  });

  if (isFetching || isLoading) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;
  if (!data || !data.results) return <SimpleAlert title={"no data found"} />;
  // console.log(data.results);
  const tiles = data.results.map((e) => {
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
    const newPage = page - 1;
    updateSearchParams({ offset: newPage.toString() });
  };

  const onBackAction = () => {
    const newPage = Math.max(0, page - 1);
    updateSearchParams({ offset: newPage.toString() });
  };

  const onFwdAction = () => {
    const newPage = page + 1;
    updateSearchParams({ offset: newPage.toString() });
  };

  const onTileClicked = (tile: Entity) => {
    const entity = data.results.find((e) => e.id === tile.id);
    if (!entity) return;
    const parent =
      entity?.parents && entity.parents[0] ? entity.parents[0] : entity;
    const url = `/entities/${parent.id}/child/${entity.id}`;
    if (ENTITY_TYPES_CHILDREN[parent.type]?.length > 0) router.push(url);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold"></h3>
        <div className="flex items-center gap-2">
          <PaginationDDLB
            totalCount={data.total}
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
      <div className="flex flex-col gap-4 p-2 overflow-auto">
        {tiles.map((tile) => (
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
    </div>
  );
};

export default BookmarkedEntitiesGrid;
