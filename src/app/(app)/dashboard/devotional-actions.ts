"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma";
import { mapDbToEntity } from "../entities/utils";
import { auth } from "@/lib/auth";
import {
  DevotionalCategory,
  DEVOTIONAL_CATEGORIES,
} from "@/lib/devotional-constants";

export type DevotionalContentResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/**
 * Fetch STHOTRAM and PURANAM entities tagged for quick access
 */
export const fetchEveryDayDevotionalContent = async ({
  language,
  pageIndex = 0,
  pageSize = 20,
}: {
  language: string;
  pageIndex?: number;
  pageSize?: number;
}): Promise<DevotionalContentResponse<{ results: any[]; total: number }>> => {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Unauthorized" };
    }

    // Query for STHOTRAM and PURANAM entities that have "quickAccess" attribute
    const where: Prisma.EntityWhereInput = {
      type: { in: ["STHOTRAM", "PURANAM"] },
      attributes: {
        some: {
          key: "quickAccess",
          value: DEVOTIONAL_CATEGORIES.EVERYDAY,
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
export const fetchDayOfWeekDevotionalContent = async ({
  language,
  dayCategory,
  pageIndex = 0,
  pageSize = 20,
}: {
  language: string;
  dayCategory: DevotionalCategory;
  pageIndex?: number;
  pageSize?: number;
}): Promise<DevotionalContentResponse<{ results: any[]; total: number }>> => {
  try {
    const session = await auth();
    if (!session) {
      return { status: "error", error: "Unauthorized" };
    }

    const where: Prisma.EntityWhereInput = {
      type: { in: ["STHOTRAM", "PURANAM"] },
      attributes: {
        some: {
          key: "quickAccess",
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
export const updateEntityDevotionalCategory = async ({
  entityId,
  category,
}: {
  entityId: string;
  category: DevotionalCategory | null;
}): Promise<DevotionalContentResponse<{ success: boolean }>> => {
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
      (attr) => attr.key !== "quickAccess",
    );

    // Add new devotional category if provided
    const updatedAttributes = category
      ? [...nonQuickAccessAttributes, { key: "quickAccess", value: category }]
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
