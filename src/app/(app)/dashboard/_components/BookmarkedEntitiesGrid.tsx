"use client";

import {
  LANGUAGE_SELECT_DEFAULT,
  LANGUAGE_SELECT_KEY,
} from "@/components/blocks/language-selector";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useLocalStorage } from "usehooks-ts";
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

const BookmarkedEntitiesGrid = () => {
  const router = useRouter();

  const [language] = useLocalStorage(
    LANGUAGE_SELECT_KEY,
    LANGUAGE_SELECT_DEFAULT,
  );

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
    queryKey: ["bookmarkedEntities", { language }],
    queryFn: async () => {
      const entities = await fetchBookmarkedEntities({
        language,
      });
      return entities;
    },
  });

  if (isFetching || isLoading) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;
  if (!data || !data.results) return <SimpleAlert title={"no data found"} />;
  // console.log(data.results);
  const tiles = data.results.map((e) => {
    const parentBreadcrumb = flattenEntityParents(e)
      .map((e) => e.text)
      .join(" > ");
    console.log(parentBreadcrumb);
    const tile = mapEntityToTileModel(e);
    return {
      ...tile,
      subTitle: parentBreadcrumb,
    };
  });

  const onTileClicked = (tile: Entity) => {
    const entity = data.results.find((e) => e.id === tile.id);
    if (!entity) return;
    const parent =
      entity?.parents && entity.parents[0] ? entity.parents[0] : entity;
    const url = `/entities/${parent.id}`;
    ENTITY_TYPES_CHILDREN[parent.type]?.length > 0 && router.push(url);
  };

  return (
    <div className="flex flex-1 flex-col mt-4 gap-4 border rounded-sm p-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
          >
            <Icons.refresh className="size-4" />
          </Button>
          {"Bookmarks"}
        </div>
      </div>
      <div className="flex flex-col gap-4">
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
