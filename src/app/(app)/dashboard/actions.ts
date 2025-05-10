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
