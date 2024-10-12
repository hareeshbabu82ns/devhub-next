"use client";

import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import { useReadLocalStorage } from "usehooks-ts";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/utils/loader";
import { readEntity } from "../../actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import EntityEdit from "../../_components/EnityEdit";
import EntityForm from "../../_components/EntityForm";
import { z } from "zod";
import { EntityFormSchema } from "@/lib/validations/entities";
import { EntityWithRelations } from "@/lib/types";

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
  } = useQuery( {
    queryKey: [ "entity", entityId, language ],
    queryFn: () => readEntity( entityId, language ),
    enabled: !!entityId,
  } );

  if ( isLoading || isFetching )
    return <Loader className="min-h-[calc(100vh_-_theme(spacing.20))]" />;
  if ( !entity ) return null;

  const entityForm = entityToEntityForm( entity );

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
  const actionButtons = (
    <>
      <Button
        size="icon"
        type="button"
        variant="outline"
        onClick={() => router.push( `/entities/new?parent=${entityId}` )}
      >
        <Icons.save className="size-4" />
      </Button>
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-h-[calc(100vh_-_theme(spacing.16))]",
        className,
      )}
    >
      {/* <div className="flex items-center justify-between gap-2">
        {actionPreButtons && (
          <div className="flex flex-row space-x-2">{actionPreButtons}</div>
        )}
        <div className="relative flex-1">
          Edit Page
        </div>
        <div className="ml-auto flex flex-row space-x-2">{actionButtons}</div>
      </div> */}
      {/* <EntityEdit entityData={entity} /> */}
      <EntityForm data={entityForm} />
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
