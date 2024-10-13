"use server";

import { db } from "@/lib/db";

export const updateEntitiesScript = async () => {
  await upgradeEntitiesAll();
};

const upgradeEntitiesAll = async () => {
  // await upgradeGods();
  // await upgradeAuthors();
  // await upgradeEntitiesByType(["DANDAKAM"], true);
  // await upgradeEntitiesByRootIDs(["6335da675bba420327665885"], true);
  // await upgradeChildEntities( "62e1582d3393789723f45adb" );
};

// called from ui and from already upgraded entity
export const upgradeChildEntities = async (
  entityId: string,
  recursive: Boolean = false,
) => {
  if ( !entityId ) return;
  const entity = await db.entity.findFirst( { where: { id: entityId } } );
  const children = entity?.children || [];

  const childEntities = ( await db.entity.findRaw( {
    filter: {
      _id: { $in: children.map( ( id: string ) => ( { $oid: id } ) ) },
      // order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  } ) ) as any as any[];

  // for ( let idx = 4; idx < 20; idx++ ) {
  for ( let idx = 0; idx < children.length; idx++ ) {
    const entity = childEntities.find( ( e: any ) => e._id[ "$oid" ] === children[ idx ] );
    if ( entity ) {
      await upgradeEntity( entity, idx, recursive );
    }
  }
};

const upgradeEntitiesByRootIDs = async (
  rootIds: string[],
  recursive: Boolean = false,
) => {
  const entities = ( await db.entity.findRaw( {
    filter: {
      _id: { $in: rootIds.map( ( id ) => ( { $oid: id } ) ) },
      order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  } ) ) as any as any[];
  for ( const entity of entities ) {
    await upgradeEntity( entity, -1, recursive );
  }
};

const upgradeEntitiesByType = async (
  types: string[],
  recursive: Boolean = false,
) => {
  const entities = ( await db.entity.findRaw( {
    filter: {
      type: { $in: types },
      order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  } ) ) as any as any[];
  for ( const entity of entities ) {
    await upgradeEntity( entity, -1, recursive );
  }
};

const upgradeEntitiesByIds = async (
  entityIds: string[],
  recursive: Boolean = false,
) => {
  const entities = ( await db.entity.findRaw( {
    filter: {
      _id: { $in: entityIds.map( ( id ) => ( { $oid: id } ) ) },
      order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  } ) ) as any as any[];
  // let idx = 0;
  // for ( const entity of entities ) {
  //   await upgradeEntity( entity, idx, recursive );
  //   idx++;
  // }
  for ( let idx = 0; idx < entityIds.length; idx++ ) {
    const entity = entities.find( ( e: any ) => e._id[ "$oid" ] === entityIds[ idx ] );
    if ( entity ) {
      await upgradeEntity( entity, idx, recursive );
    }
  }
};

const upgradeGods = async () => {
  const entities = ( await db.entity.findRaw( {
    filter: { type: "GOD", order: { $exists: false } },
  } ) ) as any as any[];
  for ( const entity of entities ) {
    await upgradeEntity( entity );
  }
};

const upgradeAuthors = async () => {
  const entities = ( await db.entity.findRaw( {
    filter: { type: "AUTHOR", order: { $exists: false } },
  } ) ) as any as any[];
  for ( const entity of entities ) {
    await upgradeEntity( entity );
  }
};

const upgradeEntity = async (
  oldEntity: any,
  newOrder: number = -1,
  recursive: Boolean = false,
) => {
  const isUpgraded = oldEntity.order !== undefined;
  // if ( oldEntity.type !== "SLOKAM" )
  console.log( oldEntity._id[ "$oid" ], oldEntity.type, isUpgraded );
  // console.log(
  //   `Old entity:\n`,
  //   oldEntity._id["$oid"],
  //   oldEntity.type,
  //   oldEntity?.text[0]?.value?.substring(0, 20),
  //   // oldEntity,
  //   "upgraded?:",
  //   isUpgraded,
  // );
  if ( isUpgraded ) {

    if ( recursive && oldEntity.children && oldEntity.children.length > 0 ) {
      // for ( const childId of oldEntity.children ) {
      // console.log( `Updating child entity:\n`, childId, oldEntity._id, oldEntity?.text[ 0 ]?.value, oldEntity.type );
      await upgradeEntitiesByIds( oldEntity.children.map( ( c: any ) => c[ "$oid" ] ), recursive );
      // }
    }
  } else {
    const newEntity = mapOldToNewEntity( oldEntity, newOrder );
    // if ( oldEntity.type !== "SLOKAM" )
    console.log( `Updating entity:\n`, newEntity?.order );
    // console.log(
    //   `Updating entity:\n`,
    //   oldEntity._id[ "$oid" ],
    //   newEntity?.type,
    //   newEntity?.order,
    //   newEntity?.text[ 0 ]?.value?.substring( 0, 20 ),
    //   newEntity?.parents,
    //   newEntity?.children,
    //   // newEntity
    // );

    await db.entity.update( {
      where: { id: oldEntity._id[ "$oid" ] },
      data: newEntity,
    } );

    if ( recursive && newEntity.children && newEntity.children.length > 0 ) {
      await upgradeEntitiesByIds( newEntity.children, recursive );
    }
  }
};

const mapOldToNewEntity = ( old: any, order: number ) => {
  const { _id, __v, parents, children, ...rest } = old;
  const newEntity: any = {
    ...rest,
    text:
      old.text?.map( ( t: any ) => ( { language: t.lang, value: t.value } ) ) || [],
    meaning:
      old.meaning?.map( ( t: any ) => ( { language: t.lang, value: t.value } ) ) ||
      [],
    attributes:
      old.attributes?.map( ( t: any ) => ( { key: t.key, value: t.value } ) ) || [],
    parents: parents?.map( ( p: any ) => p?.entity[ "$oid" ] || p ) || [],
    children: children?.map( ( c: any ) => c?.entity[ "$oid" ] || c ) || [],
    createdAt: old.createdAt[ "$date" ],
    updatedAt: old.updatedAt[ "$date" ],
  };
  if ( order >= 0 ) {
    newEntity.order = order;
  }
  if ( !newEntity.order ) {
    newEntity.order = 0;
  }
  return newEntity;
};
