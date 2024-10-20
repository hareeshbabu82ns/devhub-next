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
import { Prisma, Entity } from "@prisma/client";
import { EntityTypeEnum, EntityWithRelations } from "@/lib/types";
import { transliteratedText } from "../sanscript/_components/utils";
import { mapDbToEntity } from "./utils";
import { LANGUAGE_SELECT_DEFAULT } from "@/lib/constants";

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

export const deleteEntity = async (
  id: Entity["id"],
  cascadingChildren: boolean = false,
): Promise<EntityWithRelations | null> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const res = await db.$transaction(async (txn) => {
    const entity = await txn.entity.delete({ where: { id } });

    if (cascadingChildren && entity.children) {
      await txn.entity.deleteMany({
        where: { parents: { has: id } },
      });
    }
    return entity ? mapDbToEntity(entity, LANGUAGE_SELECT_DEFAULT) : entity;
  });

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
