"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import { deleteEntity, readEntity, updateEntity } from "../../actions";
import EntityForm from "../../_components/EntityForm";
import { z } from "zod";
import { EntityFormSchema } from "@/lib/validations/entities";
import { EntityWithRelations } from "@/lib/types";
import { toast } from "sonner";
import { Prisma } from "@/app/generated/prisma";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";

type EntityFormValues = z.infer<typeof EntityFormSchema>;

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const language = useLanguageAtomValue();
  const entityId = params.entityId as string;
  const invalidateEntities = useInvalidateEntities();

  const {
    data: entity,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["entity", entityId, language],
    queryFn: () => readEntity(entityId, language),
    enabled: !!entityId,
  });

  const { mutate: deleteEntityFn, isPending: deleteLoading } = useMutation({
    mutationFn: () => deleteEntity(entityId, true),
    onSuccess: async () => {
      toast.success("Entity Deleted Successfully");
      await invalidateEntities();
      router.back();
    },
    onError: () => toast.error("Error deleting entity"),
  });

  const { mutate: updateEntityFn, isPending: updateLoading } = useMutation({
    mutationFn: ({ data }: { data: Prisma.EntityUpdateInput }) =>
      updateEntity(entityId, { entity: data }),
    onSuccess: async () => {
      toast.success("Saved");
      // refreshes this form (same query key) and every list showing the entity
      await invalidateEntities();
    },
    onError: () => toast.error("Error updating entity"),
  });

  const onSubmit = (data: Partial<EntityFormValues>) => {
    if (!entity) return;
    // The form only sends the relation lists it means to change, so a missing
    // list must leave the existing links alone.
    const { parentIDs, childIDs, ...rest } = data;
    const keptParents = new Set(parentIDs?.map(({ id }) => id));
    const keptChildren = new Set(childIDs?.map(({ id }) => id));

    const dataFinal: Prisma.EntityUpdateInput = {
      ...rest,
      type: data.type!,
      parentsRel: parentIDs
        ? {
            connect: parentIDs.map(({ id }) => ({ id })),
            disconnect: (entity.parents ?? [])
              .filter(({ id }) => !keptParents.has(id))
              .map(({ id }) => ({ id })),
          }
        : undefined,
      childrenRel: childIDs
        ? {
            connect: childIDs.map(({ id }) => ({ id })),
            disconnect: (entity.childIds ?? [])
              .filter((id) => !keptChildren.has(id))
              .map((id) => ({ id })),
          }
        : undefined,
    };
    updateEntityFn({ data: dataFinal });
  };

  if (isLoading)
    return <Loader className="min-h-[calc(100vh_-_theme(spacing.20))]" />;
  if (!entity) return null;

  return (
    <div className="flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.20))]">
      <EntityForm
        entityId={entityId}
        data={entityToEntityForm(entity)}
        onRefresh={refetch}
        onDelete={() => deleteEntityFn()}
        onSubmit={onSubmit}
        updating={isFetching || deleteLoading || updateLoading}
      />
    </div>
  );
};

const entityToEntityForm = (entity: EntityWithRelations): EntityFormValues => ({
  type: entity.type,
  imageThumbnail: entity.imageThumbnail,
  bookmarked: entity.bookmarked ?? false,
  text: (entity.textData || []) as EntityFormValues["text"],
  attributes: entity.attributes ?? [],
  meaning: (entity.meaningData || []) as EntityFormValues["meaning"],
  audio: entity.audio,
  order: entity.order,
  notes: entity.notes || "",
  parentIDs: entity.parents?.map((parent) => ({
    id: parent.id,
    type: parent.type,
    imageThumbnail: parent.imageThumbnail,
  })),
  childIDs: entity.childIds?.map((id) => ({ id })),
});

export default Page;
