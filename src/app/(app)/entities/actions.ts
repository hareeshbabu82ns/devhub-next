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
import { Prisma, Entity as DBEntity } from "@prisma/client";
import { Entity, EntityWithRelations } from "@/lib/types";

export const readEntity = async (entityId: string, language: string) => {
  const entity = await db.entity.findUnique({ where: { id: entityId } });
  return entity ? mapDbToEntity(entity, language) : entity;
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
  // console.dir({ filters, where }, { depth: 3 });

  const orderBy: Prisma.EntityFindManyArgs["orderBy"] = convertSortingToPrisma(
    sorting,
    columns,
  );
  // console.dir({ sorting, orderBy }, { depth: 3 });
  const whereRest: Prisma.EntityFindManyArgs["where"] = {};
  if (query) {
    whereRest.text = { some: { value: { contains: query } } };
    // whereRest.meaning = { some: { value: { contains: query } } };
  }

  const where: Prisma.EntityFindManyArgs["where"] = {
    ...whereFilters,
    ...whereRest,
    // userId: session.user.id,
  };

  const entitiesCount = await db.entity.count({
    where,
  });

  const entities = await db.entity.findMany({
    skip: pagination.pageIndex * pagination.pageSize,
    take: pagination.pageSize,
    orderBy: sorting?.length ? (orderBy as any) : { order: "desc" },
    where,
  });

  const results = entities.map((e) => mapDbToEntity(e, language));
  return { results, total: entitiesCount };
};

const mapDbToEntity = (e: DBEntity, language: string) => {
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
    childrenCount: e.children.length,
    parentsCount: e.parents.length,
  };
  item.text = (e.text.find((w) => w.language === language) || e.text[0]).value;
  item.meaning =
    e.meaning.length === 0
      ? ""
      : (e.meaning.find((w) => w.language === language) || e.meaning[0]).value;
  return item;
};
