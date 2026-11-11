"use client";

import { useState } from "react";
import Link from "next/link";
import EntitySearchTiles from "../_components/EntitySearchTiles";
import AskAITrigger from "@/components/features/ai/AskAITrigger";
import RagIndexTrigger from "@/components/features/ai/RagIndexTrigger";
import { Orbit } from "lucide-react";
import EntityQuickAdd from "../_components/EntityQuickAdd";
import EntityQuickEdit from "../_components/EntityQuickEdit";
import {
  bookmarkEntity,
  deleteEntity,
  fetchReadingNeighbours,
  readEntity,
} from "../actions";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import { ENTITY_TYPES_CHILDREN, QUERY_STALE_TIME_LONG } from "@/lib/constants";
import type { ReadingRef } from "@/lib/db/entity-flow";
import { entityChildTypes, entityTypeLabel } from "@/lib/entity-types";
import { Entity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TileModel } from "@/types/entities";
import { handleEntityFileUpload, mapEntityToTileModel } from "../utils";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import { downloadEntityHierarchy } from "../utils";

/** Where a reading neighbour opens: verses on the verse page, the rest here. */
const readingHref = (ref: ReadingRef) =>
  entityChildTypes(ref.type).length === 0 && ref.parentId
    ? `/entities/${ref.parentId}/child/${ref.id}`
    : `/entities/${ref.id}`;

const Page = () => {
  const params = useParams();
  const router = useRouter();

  const language = useLanguageAtomValue();
  const entityId = params.entityId as string;
  const invalidateEntities = useInvalidateEntities();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Entity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);

  const { data: entity, isLoading } = useQuery({
    queryKey: ["entity", entityId, language],
    queryFn: () => readEntity(entityId, language),
    enabled: !!entityId,
    staleTime: QUERY_STALE_TIME_LONG,
  });

  // previous / next chapter (or book) in reading order
  const { data: neighbours } = useQuery({
    queryKey: ["entity", entityId, "neighbours"],
    queryFn: () => fetchReadingNeighbours(entityId),
    enabled: !!entityId,
    staleTime: QUERY_STALE_TIME_LONG,
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
      invalidateEntities();
    },
  });

  const { mutate: deleteTile, isPending: deleting } = useMutation({
    mutationFn: (id: string) => deleteEntity(id, true),
    onSuccess: () => {
      toast.success("Deleted");
      invalidateEntities();
    },
    onError: () => toast.error("Could not delete"),
    onSettled: () => setDeleteTarget(null),
  });

  if (isLoading)
    return <Loader className="min-h-[calc(100vh_-_theme(spacing.20))]" />;
  if (!entity) return null;

  const tile: TileModel = mapEntityToTileModel(entity, language);

  const onTileClicked = (tile: Entity) =>
    ENTITY_TYPES_CHILDREN[tile.type]?.length > 0 &&
    router.push(`/entities/${tile.id}`);

  const onTileClickedAction =
    tile?.type &&
    ENTITY_TYPES_CHILDREN[tile?.type]?.every((t) => t === "SLOKAM")
      ? undefined
      : onTileClicked;

  // verses are edited in place; containers have more fields, so use the form
  const onEditClicked = (tile: Entity) =>
    entityChildTypes(tile.type).length === 0
      ? setEditTarget(tile)
      : router.push(`/entities/${tile.id}/edit`);

  const canAddChildren = entityChildTypes(entity.type).length > 0;
  const typeLabel = entityTypeLabel(entity.type);

  const actionButtons = (
    <>
      {canAddChildren && (
        <Button
          type="button"
          title="Add content"
          onClick={() => setAddOpen(true)}
        >
          <Icons.add className="size-4" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      )}
      <AskAITrigger scopeId={entityId} scopeLabel={entity.text} />
      <Button
        size="icon"
        variant="outline"
        title="Explore in the Universe view"
        aria-label="Explore in the Universe view"
        asChild
      >
        <Link href={`/universe?scope=${entityId}`}>
          <Orbit className="size-4" />
        </Link>
      </Button>
      <RagIndexTrigger scopeId={entityId} scopeLabel={entity.text} />
      <Button
        size="icon"
        type="button"
        variant="outline"
        title={`Edit this ${typeLabel}`}
        aria-label={`Edit this ${typeLabel}`}
        onClick={() => router.push(`/entities/${entityId}/edit`)}
      >
        <Icons.edit className="size-4" />
      </Button>
      <Button
        size="icon"
        type="button"
        variant="outline"
        title="Download Entity with Children"
        aria-label="Download with children"
        onClick={() => {
          toast.promise(downloadEntityHierarchy(entityId), {
            success: "Entity downloaded successfully!",
            error: "Download failed.",
            loading: "Downloading...",
          });
        }}
      >
        <Icons.download className="size-4" />
      </Button>
      <Button
        size="icon"
        type="button"
        variant="outline"
        title="Upload Entity"
        aria-label="Upload entity file"
        onClick={() => document?.getElementById("upload-entity-file")?.click()}
      >
        <Icons.upload className="size-4" />
      </Button>
      <input
        id="upload-entity-file"
        type="file"
        accept="application/zip,.zip,application/json,.json"
        style={{ display: "none" }}
        onChange={async (e) => {
          toast.promise(
            handleEntityFileUpload(e, entityId).then(() =>
              invalidateEntities(),
            ),
            {
              success: "Entity uploaded successfully!",
              error: "Entity upload failed.",
              loading: "Uploading...",
            },
          );
        }}
      />
    </>
  );

  const actionPreButtons = (
    <>
      <Button
        size="icon"
        type="button"
        variant="outline"
        title="Back"
        aria-label="Back"
        onClick={() => router.back()}
      >
        <Icons.back className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        title={`Previous ${typeLabel}`}
        aria-label={`Previous ${typeLabel}`}
        disabled={!neighbours?.prev}
        asChild={!!neighbours?.prev}
      >
        {neighbours?.prev ? (
          <Link href={readingHref(neighbours.prev)}>
            <Icons.chevronLeft className="size-4" />
          </Link>
        ) : (
          <Icons.chevronLeft className="size-4" />
        )}
      </Button>
      <Button
        size="icon"
        variant="outline"
        title={`Next ${typeLabel}`}
        aria-label={`Next ${typeLabel}`}
        disabled={!neighbours?.next}
        asChild={!!neighbours?.next}
      >
        {neighbours?.next ? (
          <Link href={readingHref(neighbours.next)}>
            <Icons.chevronRight className="size-4" />
          </Link>
        ) : (
          <Icons.chevronRight className="size-4" />
        )}
      </Button>
    </>
  );

  // reaching the end of a chapter should lead straight into the next one
  const footer = neighbours?.next && (
    <div className="flex justify-center py-6">
      <Button variant="outline" className="h-11 px-6" asChild>
        <Link href={readingHref(neighbours.next)}>
          Continue to the next {entityTypeLabel(neighbours.next.type)}
          <Icons.chevronRight className="size-4" />
        </Link>
      </Button>
    </div>
  );

  return (
    <>
      <EntitySearchTiles
        key={`entity-tiles-${entityId}`}
        forEntity={tile}
        mode="browse"
        onTileClicked={onTileClickedAction}
        onEditClicked={onEditClicked}
        onDeleteClicked={setDeleteTarget}
        onBookmarkClicked={onBookmarkClicked}
        actionButtons={actionButtons}
        actionPreButtons={actionPreButtons}
        footer={footer}
      />
      {canAddChildren && (
        <EntityQuickAdd
          parent={{ id: entity.id, type: entity.type, title: entity.text }}
          existingCount={entity.childrenCount}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}
      {editTarget && (
        <EntityQuickEdit
          entityId={editTarget.id}
          open
          onOpenChange={(open) => !open && setEditTarget(null)}
        />
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {deleteTarget && entityTypeLabel(deleteTarget.type)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It is removed together with everything inside it. The items after
              it are renumbered. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {deleteTarget?.text}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteTile(deleteTarget.id);
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Page;
