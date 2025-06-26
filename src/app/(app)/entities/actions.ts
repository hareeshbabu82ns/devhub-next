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
import { Prisma, Entity } from "@/app/generated/prisma";
import { EntityTypeEnum, EntityWithRelations } from "@/lib/types";
import { transliteratedText } from "../sanscript/_components/utils";
import { callTTSApi, mapDbToEntity } from "./utils";
import {
  ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  LANGUAGE_SELECT_DEFAULT,
} from "@/lib/constants";
import path from "path";
import config from "@/config";
import { mkdir, writeFile } from "fs/promises";

export const fetchAudioLinksIncludingChildren = async ({
  id,
  language,
}: {
  id: Entity["id"];
  language: string;
}) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entities = await db.entity.findMany({
    where: {
      parents: {
        has: id,
      },
      audio: { not: "" },
    },
    select: {
      id: true,
      audio: true,
      text: true,
      order: true,
    },
  });

  return entities.map((e) => ({
    id: e.id,
    audio: e.audio,
    text: (e.text.find((w: any) => w.language === language) || e.text[0])
      .value as string,
    order: e.order,
  }));
};

export const entityHierarchy = async ({
  id,
  language,
}: {
  id: Entity["id"];
  language: string;
}): Promise<
  Pick<EntityWithRelations, "id" | "type" | "text">[] | undefined
> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // read entity with parents in a loop until no more parents
  const parents = [];
  let parentId = id;

  let entity = await db.entity.findFirst({
    where: { id: parentId },
    select: { id: true, type: true, text: true, parents: true },
  });
  if (!entity) return undefined;
  parents.push(entity);

  while (entity) {
    parentId = entity.parents[0];
    if (!parentId) break;
    entity = await db.entity.findFirst({
      where: { id: parentId },
      select: { id: true, type: true, text: true, parents: true },
    });
    if (!entity) break;
    if (["GOD", "ARTIST"].includes(entity.type)) break;
    parents.push(entity);
  }

  return parents
    .map((p) => ({
      id: p.id,
      type: p.type as EntityTypeEnum,
      text: (p.text.find((w: any) => w.language === language) || p.text[0])
        .value,
    }))
    .reverse();
};

export const bookmarkEntity = async (
  id: Entity["id"],
  bookmarked?: boolean,
): Promise<Pick<Entity, "id" | "bookmarked"> | undefined> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const res = await db.entity.update({
    where: { id },
    data: {
      bookmarked,
    },
    select: { id: true, bookmarked: true },
  });

  return res;
};

const deleteChildrenRecursively = async (
  children: Entity["id"][],
  txn: Prisma.TransactionClient,
): Promise<void> => {
  const childrens = await txn.entity.findMany({
    where: { id: { in: children } },
    select: { id: true, children: true },
  });
  if (childrens.length > 0) {
    for (const child of childrens) {
      if (child.children && child.children.length) {
        await deleteChildrenRecursively(child.children, txn);
      }
    }
    await txn.entity.deleteMany({
      where: { id: { in: childrens.map((c) => c.id) } },
    });
  }
};

export const deleteEntity = async (
  id: Entity["id"],
  cascadingChildren: boolean = false,
): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const res = await db.$transaction(
    async (txn) => {
      const entity = await txn.entity.delete({ where: { id } });

      if (cascadingChildren && entity.children && entity.children.length) {
        await deleteChildrenRecursively(entity.children, txn);
      }
      if (entity.parents) {
        // remove this entity from all parents
        for (const parentId of entity.parents) {
          // read parent entity
          const parent = await txn.entity.findUnique({
            where: { id: parentId },
            select: { children: true },
          });
          // remove this entity from parent's children
          if (parent) {
            await txn.entity.update({
              where: { id: parentId },
              data: {
                children: {
                  set: parent.children.filter((c) => c !== entity.id),
                },
              },
            });
          }
        }
      }
      return entity ? mapDbToEntity(entity, LANGUAGE_SELECT_DEFAULT) : entity;
    },
    { timeout: 20000 },
  );

  return res;
};

export const updateEntity = async (
  id: Entity["id"],
  data: {
    entity: Prisma.EntityUpdateInput;
    children?: Prisma.EntityUpdateInput[];
  },
): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entityData = {
    ...data.entity,
    text: transliteratedText(data.entity.text as any),
  };

  const res = await db.$transaction(async (txn) => {
    const entity = await txn.entity.update({ where: { id }, data: entityData });
    if (data.children) {
      const childenData = data.children.map(
        (c, idx) =>
          ({
            ...c,
            order: idx,
            parents: [entity.id],
          }) as Prisma.EntityCreateInput,
      );
      await txn.entity.createMany({
        data: childenData,
      });
      const childIds = await txn.entity.findMany({
        where: { parents: { has: entity.id } },
        select: { id: true, type: true },
      });

      const finalEntity = await txn.entity.update({
        where: { id: entity.id },
        data: {
          children: childIds.map((c) => c.id),
        },
      });
      return finalEntity
        ? mapDbToEntity(finalEntity, LANGUAGE_SELECT_DEFAULT)
        : finalEntity;
    }
    return entity ? mapDbToEntity(entity, LANGUAGE_SELECT_DEFAULT) : entity;
  });
  return res;
};

export const createEntity = async (data: {
  entity: Prisma.EntityCreateInput;
  children?: Prisma.EntityCreateInput[];
}): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entityData = {
    ...data.entity,
    text: transliteratedText(data.entity.text as any),
  };

  const res = await db.$transaction(async (txn) => {
    const entity = await txn.entity.create({ data: entityData });
    if (data.children) {
      const childenData = data.children.map(
        (c, idx) =>
          ({
            ...c,
            order: idx,
            parents: [entity.id],
          }) as Prisma.EntityCreateInput,
      );
      await txn.entity.createMany({
        data: childenData,
      });
      const childIds = await txn.entity.findMany({
        where: { parents: { has: entity.id } },
        select: { id: true, type: true },
      });

      const finalEntity = await txn.entity.update({
        where: { id: entity.id },
        data: {
          children: childIds.map((c) => c.id),
        },
      });
      return finalEntity
        ? mapDbToEntity(finalEntity, LANGUAGE_SELECT_DEFAULT)
        : finalEntity;
    }
    return entity ? mapDbToEntity(entity, LANGUAGE_SELECT_DEFAULT) : entity;
  });
  return res;
};

export const readEntity = async (
  entityId: string,
  language: string,
  meaning?: string,
) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entity = await db.entity.findUnique({
    where: { id: entityId },
    include: {
      // children: true,
      // parentsRel: true,
      childrenRel: {
        select: { id: true, type: true, text: true, imageThumbnail: true },
      },
      parentsRel: {
        select: { id: true, type: true, text: true, imageThumbnail: true },
      },
    },
  });
  return entity ? mapDbToEntity(entity, language, meaning) : entity;
};

export const getEntityByText = async (text: string, types: string[]) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entity = await db.entity.findFirst({
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
  });
  return entity ? mapDbToEntity(entity, LANGUAGE_SELECT_DEFAULT) : entity;
};

export const findEntities = async ({
  where,
  language,
  pagination,
  orderBy = { order: "asc" },
}: {
  where: Prisma.EntityFindManyArgs["where"];
  language: string;
  pagination?: PaginationState;
  orderBy?: Prisma.EntityFindManyArgs["orderBy"];
}) => {
  // console.dir({ filters, where }, { depth: 4 });

  const entities = await db.entity.findMany({
    ...(pagination
      ? {
          skip: pagination.pageIndex * pagination.pageSize,
          take: pagination.pageSize,
        }
      : {}),
    orderBy,
    where,
  });

  const entitiesCount = pagination
    ? await db.entity.count({
        where,
      })
    : entities.length;

  const results = entities.map((e) => mapDbToEntity(e, language));
  return { results, total: entitiesCount };
};

export const fetchEntities = async ({
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
}) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const whereFilters: Prisma.EntityFindManyArgs["where"] =
    convertColumnFiltersToPrisma(filters, columns);

  const orderBy: Prisma.EntityFindManyArgs["orderBy"] = convertSortingToPrisma(
    sorting,
    columns,
  );
  // console.dir({ sorting, orderBy }, { depth: 3 });
  const whereRest: Prisma.EntityFindManyArgs["where"] = {};
  if (query && query.length && query !== ".*") {
    whereRest.text = { some: { value: { contains: query } } };
    // whereRest.meaning = { some: { value: { contains: query } } };
  }

  const where: Prisma.EntityFindManyArgs["where"] = {
    ...whereFilters,
    ...whereRest,
    // userId: session.user.id,
  };

  // console.dir({ filters, where }, { depth: 4 });

  const entitiesCount = await db.entity.count({
    where,
  });

  const entities = await db.entity.findMany({
    skip: pagination.pageIndex * pagination.pageSize,
    take: pagination.pageSize,
    orderBy: sorting?.length ? (orderBy as any) : { order: "asc" },
    where,
    // include: {
    //   // children: true,
    //   childrenRel: { select: { id: true, type: true, text: true, imageThumbnail: true } },
    //   parentsRel: { select: { id: true, type: true, text: true, imageThumbnail: true } },
    // },
  });

  const results = entities.map((e) => mapDbToEntity(e, language));
  return { results, total: entitiesCount };
};

export async function uploadEntityWithChildren(
  entityId: string,
  parentId: string | null = null,
): Promise<any | null> {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return await uploadEntityWithChildrenInternal(entityId, parentId);
}

export async function uploadEntityWithChildrenInternal(
  entity: any,
  parentId: string | null = null,
) {
  const { children, ...entityData } = entity;

  const createEntityData = {
    ...entityData,
    parents: parentId ? [parentId] : [],
  };

  const response = await db.entity.create({
    data: createEntityData,
    select: { id: true },
  });

  if (!response) return null;

  const entityId = response.id;
  if (parentId) {
    await db.entity.update({
      where: { id: parentId },
      data: {
        children: {
          push: entityId,
        },
      },
    });
  }

  // children with children - create individual entities and update parent
  const childrenWithChildren = children?.filter(
    (c: any) => c.children && c.children.length > 0,
  );

  const childrenWithChildrenIds: string[] = [];
  for (const child of childrenWithChildren) {
    const childResponse = await uploadEntityWithChildrenInternal(
      child,
      entityId,
    );
    if (childResponse) {
      childrenWithChildrenIds.push(childResponse.id);
    }
  }

  // children without children - create all children and update parent
  const childrenWithoutChildren = children?.filter(
    (c: any) => !c.children || c.children.length === 0,
  );

  const childrenWithoutChildrenIds: string[] = [];
  if (childrenWithoutChildren?.length) {
    const childrenData = childrenWithoutChildren.map((c: any) => {
      const { children, ...childData } = c;
      return {
        ...childData,
        parents: [entityId],
      };
    });
    const childResponse = await db.entity.createMany({
      data: childrenData,
    });
    if (childResponse && childResponse.count > 0) {
      const childIds = await db.entity.findMany({
        where: { parents: { has: entityId } },
        select: { id: true },
      });
      childrenWithoutChildrenIds.push(...childIds.map((c) => c.id));
    }
  }
  if (childrenWithoutChildrenIds.length > 0) {
    await db.entity.update({
      where: { id: entityId },
      data: {
        children: {
          push: [...childrenWithoutChildrenIds],
        },
      },
    });
  }
  return response;
}

export async function fetchEntityHierarchy(
  entityId: string,
): Promise<any | null> {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return await fetchEntityHierarchyInternal(entityId);
}

export async function fetchEntityHierarchyInternal(
  entityId: string,
): Promise<any | null> {
  const entity = await db.entity.findUnique({
    where: { id: entityId },
  });

  if (!entity) return null;

  // read children
  const children =
    entity.children && entity.children.length
      ? await db.entity.findMany({
          where: { id: { in: [...entity.children] } },
        })
      : [];

  const mappedChildren = children.filter(Boolean).map(mapEntityToDownloadData);
  const finalChildren = [];
  for (const child of mappedChildren) {
    if (child.children && child.children.length) {
      const childChildren = await Promise.all(
        child.children.map((childId) => fetchEntityHierarchyInternal(childId)),
      );
      if (childChildren) {
        child.children = childChildren.filter(Boolean);
      }
    }
    finalChildren.push(child);
  }

  return {
    ...mapEntityToDownloadData(entity),
    children: finalChildren,
  };
}

function mapEntityToDownloadData(entity: Entity) {
  return {
    type: entity.type,
    imageThumbnail: entity.imageThumbnail || ENTITY_DEFAULT_IMAGE_THUMBNAIL,
    audio: entity.audio || "",
    order: entity.order,
    attributes: entity.attributes,
    meaning: entity.meaning,
    text: entity.text,
    notes: entity.notes,
    bookmarked: entity.bookmarked,
    children: entity.children,
  };
}

export async function fetchEntitySiblings(entityId: string): Promise<{
  currentEntityId: string;
  siblings: Array<{
    id: string;
    order: number;
  }>;
  prev: {
    id: string;
    order: number;
  } | null;
  next: {
    id: string;
    order: number;
  } | null;
}> {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get the current entity to find its parent and order
  const currentEntity = await db.entity.findUnique({
    where: { id: entityId },
    select: { id: true, order: true, parents: true, text: true },
  });

  if (
    !currentEntity ||
    !currentEntity.parents ||
    currentEntity.parents.length === 0
  ) {
    return {
      currentEntityId: entityId,
      siblings: [],
      prev: null,
      next: null,
    };
  }

  // Get the parent ID
  const parentId = currentEntity.parents[0];

  // Find all siblings (entities with the same parent)
  const siblings = await db.entity.findMany({
    where: {
      parents: {
        has: parentId,
      },
    },
    select: {
      id: true,
      order: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  // Map siblings without including text to keep response size small
  const siblingsWithOrder = siblings.map((sibling) => ({
    id: sibling.id,
    order: sibling.order,
  }));

  // Find the current entity's index in the siblings array
  const currentIndex = siblingsWithOrder.findIndex((s) => s.id === entityId);

  // Determine previous and next siblings
  const prevSibling =
    currentIndex > 0 ? siblingsWithOrder[currentIndex - 1] : null;
  const nextSibling =
    currentIndex < siblingsWithOrder.length - 1
      ? siblingsWithOrder[currentIndex + 1]
      : null;

  return {
    currentEntityId: entityId,
    siblings: siblingsWithOrder,
    prev: prevSibling,
    next: nextSibling,
  };
}

export async function generateAudioForEntity(
  entityId: string,
): Promise<string | null> {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entity = await db.entity.findUnique({
    where: { id: entityId },
  });

  if (!entity) return null;

  const telText = entity.text.find((t) => t.language === "TEL")?.value;
  if (!telText) return null;
  console.log(`Generating audio for entity: ${entityId}`);

  // Call TTS API to generate audio
  const audioBase64 = await callTTSApi({
    text: telText,
    // voiceKey: "tel_m_wiki_00001",
  });
  if (!audioBase64) return null;

  // save to base64 audio to data folder
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const audioFolder = path.resolve(`${config.dataFolder}/uploads/audios`);
  await mkdir(audioFolder, { recursive: true });
  const audioPath = path.join(audioFolder, `${entityId}.wav`);
  await writeFile(audioPath, audioBuffer);
  const audioUrl = `/api/assets/uploads/audios/${entityId}.wav`;

  // Update entity with audio URL
  await db.entity.update({
    where: { id: entityId },
    data: { audio: audioUrl },
  });

  return audioUrl;
}
