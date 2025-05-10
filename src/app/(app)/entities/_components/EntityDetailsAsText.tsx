"use client";

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/utils/icons';
import { defaultEntityCreateInput } from '@/lib/db/entity';
import { EntityWithRelations } from '@/lib/types';
import { Prisma } from '@/app/generated/prisma';
import { useMutation } from '@tanstack/react-query';
import React from 'react'
import { createEntity, updateEntity } from '../actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CompProps {
  entityId?: string;
  parentId?: string;
  type?: string;
  entityData?: EntityWithRelations;
}
const EntityDetailsAsText = ( { entityData, parentId, type, entityId }: CompProps ) => {
  const router = useRouter();

  const entityCreateInput = { ...defaultEntityCreateInput };
  if ( type ) entityCreateInput.type = type;
  if ( parentId ) entityCreateInput.parentsRel = {
    connect: {
      id: parentId
    }
  };
  const { id: eid, childrenCount, parentsCount, meaning, text: eText, attributes, textData, meaningData, ...entityRest } = entityData || {};

  const [ text, setText ] = React.useState<string>( JSON.stringify( entityId ? entityData ? { ...entityRest, text: textData, meaning: meaningData } : {} : entityCreateInput, null, 2 ) );

  const {
    mutateAsync: createEntityFn,
    isPending: createLoading,
    error: createEntityError,
  } = useMutation( {
    mutationKey: [ "createEntity", text ],
    mutationFn: async ( { data }: { data: Prisma.EntityCreateInput } ) => {
      const res = await createEntity( { entity: data } );
      return res;
    }
  } );

  const {
    mutateAsync: updateEntityFn,
    isPending: updateLoading,
    error: updateEntityError,
  } = useMutation( {
    mutationKey: [ "updateEntity", text ],
    mutationFn: async ( { data }: { data: Prisma.EntityUpdateInput } ) => {
      const res = await updateEntity( entityId!, { entity: data } );
      return res;
    },
  } );

  const saveEntityAction = async () => {
    const data = JSON.parse( text );
    if ( entityId ) {
      await updateEntityFn( { data }, {
        onSuccess: ( data ) => {
          // console.log("Entity created successfully",data);
          toast.success( "Entity updated successfully" );
        }
      } );
    } else {
      const res = await createEntityFn( { data }, {
        onSuccess: ( data ) => {
          // console.log("Entity created successfully",data);
          toast.success( "Entity created successfully" );
          if ( data?.id )
            router.replace( `/entities/${data.id}/edit` );
        }
      } );
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-row justify-between items-center">
        <h2>Entity {entityId ? "Updater" : "Creator"}</h2>
        <div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={createLoading || updateLoading}
            onClick={saveEntityAction}
          >
            <Icons.save size={24} />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <Textarea
          className="h-full resize-none"
          value={text}
          onChange={( e ) => {
            const value = e.target.value;
            setText( value );
          }}
        />
      </div>
    </div>
  )
}

export default EntityDetailsAsText