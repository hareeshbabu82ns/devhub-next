"use client";

import { EntityTypeEnum } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import EntityForm from "../_components/EntityForm";
import { z } from "zod";
import { EntityFormSchema } from "@/lib/validations/entities";
import { ENTITY_DEFAULT_IMAGE_THUMBNAIL } from "@/lib/constants";
import { useMemo } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Prisma } from "@prisma/client";
import { createEntity } from "../actions";

const defaultValues: z.infer<typeof EntityFormSchema> = {
  type: "GOD",
  imageThumbnail: ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  audio: undefined,
  bookmarked: false,
  text: [],
  meaning: [],
  attributes: [],
  notes: "",
  childIDs: [],
  parentIDs: [],
};

const EntityNewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityType = searchParams.get( "type" ) as EntityTypeEnum;

  const defaultEntityCreateInput = {
    ...defaultValues,
    type: entityType || defaultValues.type,
  };

  const {
    mutateAsync: createEntityFn,
    isPending: createLoading,
    error: createEntityError,
  } = useMutation( {
    mutationKey: [ "createEntity" ],
    mutationFn: async ( { data }: { data: Prisma.EntityCreateInput } ) => {
      const res = await createEntity( { entity: data } );
      return res;
    }
  } );

  const onSubmit = useMemo( () => async ( data: Partial<z.infer<typeof EntityFormSchema>> ) => {
    if ( !data.type ) {
      toast.error( "Entity type is required" );
      return;
    }
    const { parentIDs, childIDs, ...rest } = { ...defaultEntityCreateInput, ...data };
    const dataFinal = {
      ...rest,
      type: data.type!,
      parentsRel: {
        connect: data.parentIDs?.map( ( { id } ) => ( { id } ) )
      }
    }
    const res = await createEntityFn( { data: dataFinal }, {
      onSuccess: ( data ) => {
        toast.success( "Entity created successfully" );
        if ( data?.id )
          router.replace( `/entities/${data.id}/edit` );
      },
      onError: ( error ) => {
        toast.error( "Error creating entity" );
      }
    } );
  }, [] );

  return (
    <div className="min-h-[calc(100vh_-_theme(spacing.20))] w-full flex">
      <EntityForm data={defaultEntityCreateInput} onSubmit={onSubmit}
        updating={createLoading} />
    </div>
  );
};

export default EntityNewPage;
