"use client";

import { TileModel } from "@/components/blocks/image-tiles";
import EntitySearchTiles from "../_components/EntitySearchTiles";
import { readEntity } from "../actions";
import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import { useReadLocalStorage } from "usehooks-ts";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import { ENTITY_TYPES_CHILDREN } from "@/lib/constants";
import { Entity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const language = useReadLocalStorage<string>(LANGUAGE_SELECT_KEY) || "";
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

  if (isLoading || isFetching)
    return <Loader className="min-h-[calc(100vh_-_theme(spacing.20))]" />;
  if (!entity) return null;

  const tile: TileModel = {
    id: entity.id,
    type: entity.type as any,
    title: entity.text,
    subTitle: entity.type,
    src: entity.imageThumbnail || "",
  };

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
      {/* <EntityBulkCreatorTrigger parentId={tile?.id} parentType={tile?.type} /> */}
      <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={() => router.push(`/entities/new?parent=${entityId}`)}
      >
        <Icons.add className="size-4" />
      </Button>
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
      actionButtons={actionButtons}
      actionPreButtons={actionPreButtons}
    />
  );
};

export default Page;
