"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { mapDbToEntity } from "../entities/utils";

export const fetchBookmarkedEntities = async ( { language }: { language: string } ) => {
  const where: Prisma.EntityWhereInput = {
    type: "SLOKAM",
    bookmarked: true,
  };
  const entities = await db.entity.findMany( {
    where,
    orderBy: {
      updatedAt: "desc",
    },
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
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
  } );
  const entitiesCount = await db.entity.count( {
    where,
  } );

  const results = entities.map( ( e ) => mapDbToEntity( e, language ) );
  return { results, total: entitiesCount };
}