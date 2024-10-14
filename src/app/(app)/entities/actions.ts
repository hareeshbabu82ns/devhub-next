"use server";

import {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  convertColumnFiltersToPrisma,
  convertSortingToPrisma,
} from "@/components/data-table/utils";
import { columns } from "./columns";
import { Prisma, Entity as DBEntity, Entity } from "@prisma/client";
import { EntityWithRelations } from "@/lib/types";
import { LANGUAGE_SELECT_DEFAULT } from "@/components/blocks/language-selector";
import { transliteratedText } from "../sanscript/_components/utils";

export const deleteEntity = async ( id: Entity[ "id" ], cascadingChildren: boolean = false ): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if ( !session ) {
    throw new Error( "Unauthorized" );
  }

  const res = await db.$transaction( async ( txn ) => {

    const entity = await txn.entity.delete( { where: { id } } );

    if ( cascadingChildren && entity.children ) {
      await txn.entity.deleteMany( {
        where: { parents: { has: id } },
      } );
    }
    return entity ? mapDbToEntity( entity, LANGUAGE_SELECT_DEFAULT ) : entity;
  } );

  return res;
};

export const updateEntity = async ( id: Entity[ "id" ], data: {
  entity: Prisma.EntityUpdateInput;
  children?: Prisma.EntityUpdateInput[];
} ): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if ( !session ) {
    throw new Error( "Unauthorized" );
  }

  const entityData = {
    ...data.entity,
    text: transliteratedText( data.entity.text as any ),
  }

  const res = await db.$transaction( async ( txn ) => {
    const entity = await txn.entity.update( { where: { id }, data: entityData } );
    if ( data.children ) {
      const childenData = data.children.map(
        ( c, idx ) =>
          ( {
            ...c,
            order: idx,
            parents: [ entity.id ],
          } ) as Prisma.EntityCreateInput,
      );
      await txn.entity.createMany( {
        data: childenData,
      } );
      const childIds = await txn.entity.findMany( {
        where: { parents: { has: entity.id } },
        select: { id: true, type: true },
      } );

      const finalEntity = await txn.entity.update( {
        where: { id: entity.id },
        data: {
          children: childIds.map( ( c ) => c.id ),
        },
      } );
      return finalEntity
        ? mapDbToEntity( finalEntity, LANGUAGE_SELECT_DEFAULT )
        : finalEntity;
    }
    return entity ? mapDbToEntity( entity, LANGUAGE_SELECT_DEFAULT ) : entity;
  } );
  return res;
};

export const createEntity = async ( data: {
  entity: Prisma.EntityCreateInput;
  children?: Prisma.EntityCreateInput[];
} ): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if ( !session ) {
    throw new Error( "Unauthorized" );
  }

  const entityData = {
    ...data.entity,
    text: transliteratedText( data.entity.text as any ),
  }

  const res = await db.$transaction( async ( txn ) => {
    const entity = await txn.entity.create( { data: entityData } );
    if ( data.children ) {
      const childenData = data.children.map(
        ( c, idx ) =>
          ( {
            ...c,
            order: idx,
            parents: [ entity.id ],
          } ) as Prisma.EntityCreateInput,
      );
      await txn.entity.createMany( {
        data: childenData,
      } );
      const childIds = await txn.entity.findMany( {
        where: { parents: { has: entity.id } },
        select: { id: true, type: true },
      } );

      const finalEntity = await txn.entity.update( {
        where: { id: entity.id },
        data: {
          children: childIds.map( ( c ) => c.id ),
        },
      } );
      return finalEntity
        ? mapDbToEntity( finalEntity, LANGUAGE_SELECT_DEFAULT )
        : finalEntity;
    }
    return entity ? mapDbToEntity( entity, LANGUAGE_SELECT_DEFAULT ) : entity;
  } );
  return res;
};

export const readEntity = async (
  entityId: string,
  language: string,
  meaning?: string,
) => {
  const session = await auth();
  if ( !session ) {
    throw new Error( "Unauthorized" );
  }

  const entity = await db.entity.findUnique( {
    where: { id: entityId }, include: {
      // children: true,
      // parentsRel: true,
      childrenRel: { select: { id: true, type: true, text: true, imageThumbnail: true } },
      parentsRel: { select: { id: true, type: true, text: true, imageThumbnail: true } },
    },
  } );
  return entity ? mapDbToEntity( entity, language, meaning ) : entity;
};

export const getEntityByText = async ( text: string, types: string[] ) => {
  const session = await auth();
  if ( !session ) {
    throw new Error( "Unauthorized" );
  }

  const entity = await db.entity.findFirst( {
    where: {
      text: {
        some: {
          value: text,
        },
      },
      type: {
        in: types,
      },
    },
  } );
  return entity ? mapDbToEntity( entity, LANGUAGE_SELECT_DEFAULT ) : entity;
};

export const findEntities = async ( {
  where,
  language,
  pagination,
  orderBy = { order: "asc" },
}: {
  where: Prisma.EntityFindManyArgs[ "where" ];
  language: string;
  pagination?: PaginationState;
  orderBy?: Prisma.EntityFindManyArgs[ "orderBy" ];
} ) => {
  // console.dir({ filters, where }, { depth: 4 });

  const entities = await db.entity.findMany( {
    ...pagination ? {
      skip: pagination.pageIndex * pagination.pageSize,
      take: pagination.pageSize,
    } : {},
    orderBy,
    where,
  } );

  const entitiesCount = pagination ? await db.entity.count( {
    where,
  } ) : entities.length;

  const results = entities.map( ( e ) => mapDbToEntity( e, language ) );
  return { results, total: entitiesCount };
}

export const fetchEntities = async ( {
  query,
  language,
  pagination,
  sorting,
  filters,
}: {
  query: string;
  language: string;
  pagination: PaginationState;
  sorting: SortingState;
  filters: ColumnFiltersState;
} ) => {
  const session = await auth();
  if ( !session ) {
    throw new Error( "Unauthorized" );
  }

  const whereFilters: Prisma.EntityFindManyArgs[ "where" ] =
    convertColumnFiltersToPrisma( filters, columns );

  const orderBy: Prisma.EntityFindManyArgs[ "orderBy" ] = convertSortingToPrisma(
    sorting,
    columns,
  );
  // console.dir({ sorting, orderBy }, { depth: 3 });
  const whereRest: Prisma.EntityFindManyArgs[ "where" ] = {};
  if ( query && query.length && query !== ".*" ) {
    whereRest.text = { some: { value: { contains: query } } };
    // whereRest.meaning = { some: { value: { contains: query } } };
  }

  const where: Prisma.EntityFindManyArgs[ "where" ] = {
    ...whereFilters,
    ...whereRest,
    // userId: session.user.id,
  };

  // console.dir({ filters, where }, { depth: 4 });

  const entitiesCount = await db.entity.count( {
    where,
  } );

  const entities = await db.entity.findMany( {
    skip: pagination.pageIndex * pagination.pageSize,
    take: pagination.pageSize,
    orderBy: sorting?.length ? ( orderBy as any ) : { order: "asc" },
    where,
    // include: {
    //   // children: true,
    //   childrenRel: { select: { id: true, type: true, text: true, imageThumbnail: true } },
    //   parentsRel: { select: { id: true, type: true, text: true, imageThumbnail: true } },
    // },
  } );

  const results = entities.map( ( e ) => mapDbToEntity( e, language ) );
  return { results, total: entitiesCount };
};

const mapDbToEntity = ( e: any, language: string, meaning?: string ) => {
  const item: EntityWithRelations = {
    id: e.id,
    type: e.type as any,
    imageThumbnail: e.imageThumbnail || "",
    audio: e.audio || "",
    text: "",
    meaning: "",
    attributes: e.attributes,
    textData: e.text,
    meaningData: e.meaning,
    childrenCount: e.children?.length,
    parentsCount: e.parents?.length,
    order: e.order,
    notes: e.notes,
  };
  item.text = ( e.text.find( ( w: any ) => w.language === language ) || e.text[ 0 ] ).value;
  const meaningLang = meaning || language;
  item.meaning =
    e.meaning ? e.meaning.length === 0
      ? ""
      : ( e.meaning.find( ( w: any ) => w.language === meaningLang ) || e.meaning[ 0 ] )
        .value : "";
  item.children = e.childrenRel?.map( ( p: any ) => mapDbToEntity( p, language, meaning ) );
  item.parents = e.parentsRel?.map( ( p: any ) => mapDbToEntity( p, language, meaning ) );
  return item;
};
