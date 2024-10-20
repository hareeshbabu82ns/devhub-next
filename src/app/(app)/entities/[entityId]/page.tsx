"use client";

import EntitySearchTiles from "../_components/EntitySearchTiles";
import { bookmarkEntity, readEntity } from "../actions";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import { ENTITY_TYPES_CHILDREN } from "@/lib/constants";
import { Entity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import EntityBulkCreatorTrigger from "../_components/EntityBulkCreatorTrigger";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { TileModel } from "@/types/entities";
import { mapEntityToTileModel } from "../utils";
import { useLanguageAtomValue } from "@/hooks/use-config";

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const language = useLanguageAtomValue();
  const entityId = params.entityId as string;

  const {
    data: entity,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["entity", entityId, language],
    queryFn: () => readEntity(entityId, language),
    enabled: !!entityId,
  });

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

  if (isLoading || isFetching)
    return <Loader className="min-h-[calc(100vh_-_theme(spacing.20))]" />;
  if (!entity) return null;

  const tile: TileModel = mapEntityToTileModel(entity);

  const onTileClicked = (tile: Entity) =>
    ENTITY_TYPES_CHILDREN[tile.type]?.length > 0 &&
    router.push(`/entities/${tile.id}`);

  const onTileClickedAction =
    tile?.type && ENTITY_TYPES_CHILDREN[tile?.type].every((t) => t === "SLOKAM")
      ? undefined
      : onTileClicked;

  const onEditClicked = (tile: Entity) =>
    router.push(`/entities/${tile.id}/edit`);

  const actionButtons = (
    <>
      <EntityBulkCreatorTrigger parentId={tile?.id} parentType={tile?.type} />
      <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={() => router.push(`/entities/new?parent=${entityId}`)}
      >
        <Icons.add className="size-4" />
      </Button>
      {/* <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={() => upgradeChildEntities(entityId, false)}
      >
        <Icons.upload className="size-4" />
      </Button> */}
    </>
  );

  const actionPreButtons = (
    <>
      <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={() => router.back()}
      >
        <Icons.back className="size-4" />
      </Button>
    </>
  );

  return (
    <EntitySearchTiles
      key={`entity-tiles-${entityId}`}
      forEntity={tile}
      mode="browse"
      onTileClicked={onTileClickedAction}
      onEditClicked={onEditClicked}
      onBookmarkClicked={onBookmarkClicked}
      actionButtons={actionButtons}
      actionPreButtons={actionPreButtons}
    />
  );
};

export default Page;
