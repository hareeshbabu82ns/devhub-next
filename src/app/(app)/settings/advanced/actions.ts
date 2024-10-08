"use server";

import { db } from "@/lib/db";

export const updateEntitiesAll = async () => {
  const limit = 1000;
  let skip = 0;
  while (true) {
    const entities = (await db.entity.findRaw({
      options: { limit, skip },
    })) as any as any[];
    if (!entities || entities.length === 0) {
      console.log(`No more entities to update after skipping ${skip}`);
      break;
    }

    for (const entity of entities) {
      const { _id, ...restEntity } = entity;
      const newEntity = {
        parents: entity.parents.map((p: any) => p?.entity["$oid"] || p),
        children: entity.children.map((p: any) => p?.entity["$oid"] || p),
      };
      await db.entity.update({
        where: { id: _id["$oid"] },
        data: newEntity,
      });
      // console.log(`Updating entity:`, newEntity);
    }

    console.log(`Done - ${entities.length} entities updated from ${skip}`);
    skip += limit;
  }
};

export const updateEntitiesByParents = async () => {
  const limit = 1000;
  let skip = 0;
  while (true) {
    const entities = (await db.entity.findRaw({
      filter: { parents: { $elemMatch: { entity: { $exists: true } } } },
      options: { limit, skip },
    })) as any as any[];
    if (!entities || entities.length === 0) {
      console.log(`No more entities to update after skipping ${skip}`);
      break;
    }

    for (const entity of entities) {
      const { _id, ...restEntity } = entity;
      const newEntity = {
        parents: entity.parents.map((p: any) => p?.entity["$oid"] || p),
      };
      await db.entity.update({
        where: { id: _id["$oid"] },
        data: newEntity,
      });
      // console.log(`Updating entity:`, newEntity);
    }

    console.log(`Done - ${entities.length} entities updated from ${skip}`);
    skip += limit;
  }
};

export const updateEntitiesByChildren = async () => {
  const limit = 20;
  let skip = 0;
  while (true) {
    const entities = (await db.entity.findRaw({
      filter: { children: { $elemMatch: { entity: { $exists: true } } } },
      options: { limit, skip },
    })) as any as any[];
    if (!entities || entities.length === 0) {
      console.log(`No more entities to update after skipping ${skip}`);
      break;
    }
    // console.log(entities);
    for (const entity of entities) {
      const newEntity = mapOldToNewEntity(entity, -1);
      await db.entity.update({
        where: { id: entity._id["$oid"] },
        data: newEntity,
      });
      // console.log(`Updating entity:`, newEntity);

      const childEntities = (await db.entity.findRaw({
        filter: { _id: { $in: newEntity.children } },
      })) as any as any[];

      let childIdx = 0;
      for (const childEntity of childEntities) {
        const newChildEntity = mapOldToNewEntity(childEntity, childIdx);
        await db.entity.update({
          where: { id: childEntity._id["$oid"] },
          data: newChildEntity,
        });
        // console.log(`Updating child entity ${childIdx}:`, newChildEntity);
        childIdx++;
      }
    }
    console.log(`Done - ${entities.length} entities updated from ${skip}`);
    skip += limit;
  }
};

export const updateEntitiesScript = async () => {
  // await updateEntitiesByChildren();
  // await updateEntitiesByParents();
  // await updateEntitiesAll();
};

const mapOldToNewEntity = (old: any, order: number) => {
  const { _id, __v, parents, children, ...rest } = old;
  const newEntity: any = {
    ...rest,
    text:
      old.text?.map((t: any) => ({ language: t.lang, value: t.value })) || [],
    meaning:
      old.meaning?.map((t: any) => ({ language: t.lang, value: t.value })) ||
      [],
    attributes:
      old.attributes?.map((t: any) => ({ key: t.key, value: t.value })) || [],
    parents: parents?.map((p: any) => p?.entity["$oid"] || p) || [],
    children: children?.map((c: any) => c?.entity["$oid"] || c) || [],
    createdAt: old.createdAt["$date"],
    updatedAt: old.updatedAt["$date"],
  };
  if (order >= 0) {
    newEntity.order = order;
  }
  if (!newEntity.order) {
    newEntity.order = 0;
  }
  return newEntity;
};
