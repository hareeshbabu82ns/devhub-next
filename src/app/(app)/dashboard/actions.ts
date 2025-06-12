"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma";
import { mapDbToEntity } from "../entities/utils";
import { auth } from "@/lib/auth";

export const fetchBookmarkedEntities = async ({
  language,
  pageIndex = 0,
  pageSize = 100,
}: {
  language: string;
  pageIndex?: number;
  pageSize?: number;
}) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const where: Prisma.EntityWhereInput = {
    type: "SLOKAM",
    bookmarked: true,
  };

  const entitiesCount = await db.entity.count({
    where,
  });

  const entities = await db.entity.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    skip: pageIndex * pageSize,
    take: pageSize,
    include: {
      parentsRel: {
        include: {
          parentsRel: {
            include: {
              parentsRel: {
                include: {
                  parentsRel: {
                    include: {
                      parentsRel: {
                        include: {
                          parentsRel: {
                            select: {
                              id: true,
                              text: true,
                              type: true,
                              bookmarked: true,
                              imageThumbnail: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const results = entities.map((e) => mapDbToEntity(e, language));
  return { results, total: entitiesCount };
};

import {
  QuickAccessCategory,
  QUICK_ACCESS_CATEGORIES,
  QUICK_ACCESS_ATTRIBUTE_KEY,
  QUICK_ACCESS_ENTITIES,
} from "@/lib/quick-access-constants";
import { Entity } from "@/lib/types";

export type DailyEntitiesResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Fetch STHOTRAM and PURANAM entities tagged for quick access
 */
export const fetchEveryDayEntities = async ({
  language,
  pageIndex = 0,
  pageSize = 20,
}: {
  language: string;
  pageIndex?: number;
  pageSize?: number;
}): Promise<DailyEntitiesResponse<{ results: Entity[]; total: number }>> => {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Unauthorized" };
    }

    const where: Prisma.EntityWhereInput = {
      type: { in: QUICK_ACCESS_ENTITIES },
      attributes: {
        some: {
          key: QUICK_ACCESS_ATTRIBUTE_KEY,
          value: QUICK_ACCESS_CATEGORIES.EVERYDAY,
        },
      },
    };

    const entitiesCount = await db.entity.count({ where });

    const entities = await db.entity.findMany({
      where,
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
      skip: pageIndex * pageSize,
      take: pageSize,
    });

    const results = entities.map((e) => mapDbToEntity(e, language));
    return { status: "success", data: { results, total: entitiesCount } };
  } catch (error) {
    console.error("Error fetching quick access devotional content:", error);
    return {
      status: "error",
      error: "Failed to fetch quick access devotional content",
    };
  }
};

/**
 * Fetch STHOTRAM and PURANAM entities tagged for specific day of week quick access
 */
export const fetchDayOfWeekEntities = async ({
  language,
  dayCategory,
  pageIndex = 0,
  pageSize = 20,
}: {
  language: string;
  dayCategory: QuickAccessCategory;
  pageIndex?: number;
  pageSize?: number;
}): Promise<DailyEntitiesResponse<{ results: Entity[]; total: number }>> => {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Unauthorized" };
    }

    const where: Prisma.EntityWhereInput = {
      type: { in: QUICK_ACCESS_ENTITIES },
      attributes: {
        some: {
          key: QUICK_ACCESS_ATTRIBUTE_KEY,
          value: dayCategory,
        },
      },
    };

    const entitiesCount = await db.entity.count({ where });

    const entities = await db.entity.findMany({
      where,
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
      skip: pageIndex * pageSize,
      take: pageSize,
    });

    const results = entities.map((e) => mapDbToEntity(e, language));
    return { status: "success", data: { results, total: entitiesCount } };
  } catch (error) {
    console.error("Error fetching day of week quick access content:", error);
    return {
      status: "error",
      error: "Failed to fetch day of week quick access content",
    };
  }
};

/**
 * Add or update quick access category for an entity
 */
export const updateEntityQuickAccessAttr = async ({
  entityId,
  category,
}: {
  entityId: string;
  category: QuickAccessCategory | null;
}): Promise<DailyEntitiesResponse<{ success: boolean }>> => {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Unauthorized" };
    }

    // Get current entity
    const entity = await db.entity.findUnique({
      where: { id: entityId },
      select: { attributes: true },
    });

    if (!entity) {
      return { status: "error", error: "Entity not found" };
    }

    // Filter out existing quickAccess attributes
    const nonQuickAccessAttributes = entity.attributes.filter(
      (attr) => attr.key !== QUICK_ACCESS_ATTRIBUTE_KEY,
    );

    // Add new devotional category if provided
    const updatedAttributes = category
      ? [
          ...nonQuickAccessAttributes,
          { key: QUICK_ACCESS_ATTRIBUTE_KEY, value: category },
        ]
      : nonQuickAccessAttributes;

    // Update entity with new attributes
    await db.entity.update({
      where: { id: entityId },
      data: {
        attributes: updatedAttributes,
      },
    });

    return { status: "success", data: { success: true } };
  } catch (error) {
    console.error("Error updating entity quick access category:", error);
    return { status: "error", error: "Failed to update quick access category" };
  }
};
