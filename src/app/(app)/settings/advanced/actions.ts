"use server";

import { db } from "@/lib/db";

export const updateEntitiesScript = async () => {
  await upgradeEntitiesAll();
};

const upgradeEntitiesAll = async () => {
  // await upgradeGods();
  // await upgradeAuthors();
  // await upgradeEntitiesByType(["DANDAKAM"], true);
  await upgradeEntitiesByRootIDs(["6335da675bba420327665885"], true);
};

const upgradeEntitiesByRootIDs = async (
  rootIds: string[],
  recursive: Boolean = false,
) => {
  const entities = (await db.entity.findRaw({
    filter: {
      _id: { $in: rootIds.map((id) => ({ $oid: id })) },
      order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  })) as any as any[];
  for (const entity of entities) {
    await upgradeEntity(entity, -1, recursive);
  }
};

const upgradeEntitiesByType = async (
  types: string[],
  recursive: Boolean = false,
) => {
  const entities = (await db.entity.findRaw({
    filter: {
      type: { $in: types },
      order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  })) as any as any[];
  for (const entity of entities) {
    await upgradeEntity(entity, -1, recursive);
  }
};

const upgradeEntitiesByIds = async (
  entityIds: string[],
  recursive: Boolean = false,
) => {
  const entities = (await db.entity.findRaw({
    filter: {
      _id: { $in: entityIds.map((id) => ({ $oid: id })) },
      order: { $exists: false },
    },
    // options: { limit: 2, skip: 0 },
  })) as any as any[];
  let idx = 0;
  for (const entity of entities) {
    await upgradeEntity(entity, idx, recursive);
    idx++;
  }
};

const upgradeGods = async () => {
  const entities = (await db.entity.findRaw({
    filter: { type: "GOD", order: { $exists: false } },
  })) as any as any[];
  for (const entity of entities) {
    await upgradeEntity(entity);
  }
};

const upgradeAuthors = async () => {
  const entities = (await db.entity.findRaw({
    filter: { type: "AUTHOR", order: { $exists: false } },
  })) as any as any[];
  for (const entity of entities) {
    await upgradeEntity(entity);
  }
};

const upgradeEntity = async (
  oldEntity: any,
  newOrder: number = -1,
  recursive: Boolean = false,
) => {
  const isUpgraded = oldEntity.order !== undefined;
  console.log(oldEntity._id["$oid"], oldEntity.type, isUpgraded);
  // console.log(
  //   `Old entity:\n`,
  //   oldEntity._id["$oid"],
  //   oldEntity.type,
  //   oldEntity?.text[0]?.value?.substring(0, 20),
  //   // oldEntity,
  //   "upgraded?:",
  //   isUpgraded,
  // );
  if (isUpgraded) {
    return;
  }
  const newEntity = mapOldToNewEntity(oldEntity, newOrder);
  console.log(`Updating entity:\n`, newEntity?.order);
  // console.log(
  //   `Updating entity:\n`,
  //   oldEntity._id["$oid"],
  //   newEntity?.type,
  //   newEntity?.order,
  //   newEntity?.text[0]?.value?.substring(0, 20),
  //   newEntity?.parents,
  //   newEntity?.children,
  //   // newEntity
  // );

  // await db.entity.update({
  //   where: { id: oldEntity._id["$oid"] },
  //   data: newEntity,
  // });

  if (recursive && newEntity.children && newEntity.children.length > 0) {
    await upgradeEntitiesByIds(newEntity.children, recursive);
  }
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
