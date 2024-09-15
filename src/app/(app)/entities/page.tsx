"use client";

import { Entity, EntityTypeEnum } from "@/lib/types";
import EntitySearchTiles from "./_components/EntitySearchTiles";
import { ENTITY_TYPES_CHILDREN } from "@/lib/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import EntityBulkCreatorTrigger from "./_components/EntityBulkCreatorTrigger";

const Page = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") as EntityTypeEnum;
  const types = [type] as EntityTypeEnum[];

  // const onTileClicked = (tile: Entity) => console.log(tile);
  const onTileClicked = (tile: Entity) =>
    ENTITY_TYPES_CHILDREN[tile.type]?.length > 0 &&
    router.push(`/entities/${tile.id}`);

  const onTileClickedAction =
    type && ENTITY_TYPES_CHILDREN[type].every((t) => t === "SLOKAM")
      ? undefined
      : onTileClicked;

  const onEditClicked = (tile: Entity) =>
    router.push(`/entities/${tile.id}/edit`);

  const actionButtons = (
    <>
      <EntityBulkCreatorTrigger />
      <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={() => router.push(`/entities/new?type=${type}`)}
      >
        <Icons.add className="size-4" />
      </Button>
    </>
  );

  return (
    <EntitySearchTiles
      key={`entity-tiles-${type}`}
      forTypes={types}
      mode="browse"
      onTileClicked={onTileClickedAction}
      onEditClicked={onEditClicked}
      actionButtons={actionButtons}
      // actionPreButtons={actionPreButtons}
    />
  );
};

export default Page;
