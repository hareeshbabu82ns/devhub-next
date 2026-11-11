"use client";

import { EntityTypeEnum } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import EntityForm from "../_components/EntityForm";
import { z } from "zod";
import { EntityFormSchema } from "@/lib/validations/entities";
import { ENTITY_DEFAULT_IMAGE_THUMBNAIL } from "@/lib/constants";
import { entityChildTypes, isEntityTypeCode } from "@/lib/entity-types";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Prisma } from "@/app/generated/prisma";
import { createEntity, findEntities } from "../actions";
import Loader from "@/components/utils/loader";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";

type EntityFormValues = z.infer<typeof EntityFormSchema>;

const EntityNewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidateEntities = useInvalidateEntities();

  const language = useLanguageAtomValue();
  // bumping the key gives a fresh form for "Save & add another"
  const [formKey, setFormKey] = useState(0);

  const typeParam = searchParams.get("type");
  const parentId = searchParams.get("parent");

  const {
    data: parentEntity,
    isLoading: isParentLoading,
    error: parentLoadingError,
  } = useQuery({
    queryKey: ["queryEntityParent", parentId, language],
    queryFn: async () => {
      const entities = await findEntities({
        where: { id: parentId! },
        language: language!,
      });
      return entities?.results?.[0] ?? null;
    },
    enabled: !!parentId,
  });

  // the type comes from the link, else from what the parent usually contains
  const defaultType: EntityTypeEnum = isEntityTypeCode(typeParam)
    ? typeParam
    : ((parentEntity && entityChildTypes(parentEntity.type)[0]) ?? "SLOKAM");

  const defaultValues: EntityFormValues = {
    type: defaultType,
    // left empty so the server appends the entity after its siblings
    order: undefined,
    imageThumbnail: ENTITY_DEFAULT_IMAGE_THUMBNAIL,
    audio: "",
    bookmarked: false,
    text: [],
    meaning: [],
    attributes: [],
    notes: "",
    childIDs: [],
    parentIDs: parentEntity
      ? [
          {
            id: parentEntity.id,
            type: parentEntity.type,
            imageThumbnail: parentEntity.imageThumbnail,
          },
        ]
      : [],
  };

  const { mutate: createEntityFn, isPending: createLoading } = useMutation({
    mutationFn: async ({
      data,
    }: {
      data: Prisma.EntityCreateInput;
      addAnother: boolean;
    }) => createEntity({ entity: data }),
    onSuccess: async (created, { addAnother }) => {
      toast.success("Created");
      await invalidateEntities();
      if (addAnother) {
        setFormKey((k) => k + 1);
        return;
      }
      // back to where the new entity is listed; a new top-level entity opens
      // on its own page, ready to receive content
      if (parentId) router.replace(`/entities/${parentId}`);
      else if (created?.id) router.replace(`/entities/${created.id}`);
    },
    onError: () => toast.error("Error creating entity"),
  });

  const onSubmit = (
    data: Partial<EntityFormValues>,
    options?: { addAnother?: boolean },
  ) => {
    if (!data.type) {
      toast.error("Entity type is required");
      return;
    }
    if (!data.text?.some((t) => t.value.trim())) {
      toast.error("Enter the text first");
      return;
    }
    const { parentIDs, childIDs, ...rest } = { ...defaultValues, ...data };
    createEntityFn({
      data: {
        ...rest,
        // undefined lets the server pick the next position
        order: data.order as number,
        type: data.type,
        parentsRel: { connect: parentIDs?.map(({ id }) => ({ id })) },
      },
      addAnother: !!options?.addAnother,
    });
  };

  if (isParentLoading) return <Loader />;
  if (parentLoadingError)
    return <SimpleAlert title={parentLoadingError.message} />;

  return (
    <div className="min-h-[calc(100vh_-_theme(spacing.20))] w-full flex">
      <EntityForm
        key={formKey}
        data={defaultValues}
        onSubmit={onSubmit}
        updating={createLoading}
        allowAddAnother={!!parentId}
      />
    </div>
  );
};

export default EntityNewPage;
