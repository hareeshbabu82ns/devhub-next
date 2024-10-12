"use client";

import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import { useReadLocalStorage } from "usehooks-ts";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import { deleteEntity, readEntity } from "../../actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import EntityEdit from "../../_components/EnityEdit";
import EntityForm from "../../_components/EntityForm";
import { z } from "zod";
import { EntityFormSchema } from "@/lib/validations/entities";
import { EntityWithRelations } from "@/lib/types";
import { toast } from "sonner";
import { useMemo } from "react";

interface CompProps extends React.HTMLAttributes<HTMLDivElement> {
}

const Page = ( { className }: CompProps ) => {
  const params = useParams();
  const router = useRouter();
  const language = useReadLocalStorage<string>( LANGUAGE_SELECT_KEY ) || "";
  const entityId = params.entityId as string;

  const {
    data: entity,
    isLoading,
    isFetching,
    refetch,
  } = useQuery( {
    queryKey: [ "entity", entityId, language ],
    queryFn: () => readEntity( entityId, language ),
    enabled: !!entityId,
  } );

  const {
    mutateAsync: deleteEntityFn,
    isPending: deleteLoading,
    error: deleteEntityError,
  } = useMutation( {
    mutationKey: [ "deleteEntity", entityId ],
    mutationFn: async () => {
      const res = await deleteEntity( entityId, true );
      return res;
    }
  } );

  const onDelete = useMemo( () => async () => {
    // ( entityId ) => deleteEntityFn( undefined, { onSuccess: () => toast.success( "Entity Deleted Successfully" ) } )
    if ( !entityId ) return;
    const res = await deleteEntityFn();
    if ( res ) {
      toast.success( "Entity deleted" );
      router.back();
    }
  }, [ entityId ] );

  if ( isLoading || isFetching )
    return <Loader className="min-h-[calc(100vh_-_theme(spacing.20))]" />;
  if ( !entity ) return null;

  const entityForm = entityToEntityForm( entity );

  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.20))]",
        className,
      )}
    >
      <EntityForm entityId={entityId}
        data={entityForm} onRefresh={refetch}
        onDelete={onDelete}
        updating={isLoading || isFetching || deleteLoading}
      />
    </div>
  );
};

const entityToEntityForm = ( entity: EntityWithRelations ) => {
  const entityForm: z.infer<typeof EntityFormSchema> = {
    type: entity.type,
    imageThumbnail: entity.imageThumbnail,
    text: ( entity.textData || [] ) as any,
    attributes: entity.attributes,
    meaning: ( entity.meaningData || [] ) as any,
    // text: entity.text,
    // children: entity.children.map( ( child ) => entityToEntityForm( child ) ),
    // parents: entity.parents.map( ( parent ) => entityToEntityForm( parent ) ),
  };
  return entityForm;
}

export default Page;
