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
import {
  prepareTextForSave,
  setLanguageValue,
  syncScripts,
} from "@/lib/entity-text";
import { entityChildTypes, isEntityTypeCode } from "@/lib/entity-types";
import { EntityAudio, Track, trackTitle } from "@/lib/audio/queue";
import { getReadingNeighbours, ReadingRef } from "@/lib/db/entity-flow";
import { callTTSApi, mapDbToEntity } from "./utils";
import {
  ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  LANGUAGE_SELECT_DEFAULT,
} from "@/lib/constants";
import path from "path";
import { resolveAssetPath } from "@/lib/assets/server";
import { assetUrl } from "@/lib/assets/shared";
import { mkdir, writeFile } from "fs/promises";

// Enough for the largest books; keeps a play request on a deity or an author
// from walking the whole library.
const AUDIO_MAX_DEPTH = 6;
const AUDIO_MAX_NODES = 5000;

/**
 * Everything that can be played for an entity, in reading order: its own
 * recording and the recordings of what sits under it (verses of a chapter,
 * chapters and verses of a book). A chapter that has a recording of its own
 * is played as that one file, its verses are not added on top of it.
 */
export const fetchAudioTracks = async ({
  id,
  language,
}: {
  id: Entity["id"];
  language: string;
}): Promise<EntityAudio> => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const select = {
    id: true,
    type: true,
    order: true,
    audio: true,
    text: true,
    parents: true,
  };
  type Node = Prisma.EntityGetPayload<{ select: typeof select }>;

  const root = await db.entity.findUnique({ where: { id }, select });
  if (!root) return { label: "", own: null, tracks: [] };

  const textOf = (e: Node) =>
    (
      (e.text?.find((w) => w.language === language) || e.text?.[0])?.value ?? ""
    ).toString();
  const isContainer = (e: Node) => entityChildTypes(e.type).length > 0;
  const hrefOf = (e: Node, parentId?: string) =>
    !isContainer(e) && parentId
      ? `/entities/${parentId}/child/${e.id}`
      : `/entities/${e.id}`;

  // walk down level by level: one query per level, not one per chapter
  const childrenOf = new Map<string, Node[]>();
  const seen = new Set([root.id]);
  let level = isContainer(root) ? [root.id] : [];
  for (
    let depth = 0;
    depth < AUDIO_MAX_DEPTH && level.length > 0 && seen.size < AUDIO_MAX_NODES;
    depth++
  ) {
    const rows = await db.entity.findMany({
      where: { parents: { hasSome: level } },
      select,
      orderBy: [{ order: "asc" }, { id: "asc" }],
      take: AUDIO_MAX_NODES - seen.size + 1,
    });
    const inLevel = new Set(level);
    const next: string[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      const parentId = row.parents.find((p) => inLevel.has(p));
      if (!parentId) continue;
      seen.add(row.id);
      const siblings = childrenOf.get(parentId);
      if (siblings) siblings.push(row);
      else childrenOf.set(parentId, [row]);
      if (isContainer(row) && !row.audio) next.push(row.id);
    }
    level = next;
  }

  const tracks: Track[] = [];
  const walk = (parentId: string, parentTitle: string) => {
    for (const child of childrenOf.get(parentId) ?? []) {
      const number = `${(child.order ?? 0) + 1}`;
      if (child.audio) {
        const container = isContainer(child);
        tracks.push({
          id: child.id,
          src: child.audio,
          title: trackTitle(textOf(child), `${parentTitle} · ${number}`),
          subtitle: container ? parentTitle : `${parentTitle} · ${number}`,
          href: hrefOf(child, parentId),
        });
      } else if (isContainer(child)) {
        walk(child.id, trackTitle(textOf(child), number));
      }
    }
  };
  const label = trackTitle(textOf(root));
  walk(root.id, label);

  return {
    label,
    own: root.audio
      ? {
          id: root.id,
          src: root.audio,
          title: label,
          href: hrefOf(root, root.parents[0]),
        }
      : null,
    tracks,
  };
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

      // keep sibling numbering contiguous after the removal
      if (entity.parents?.[0]) {
        await txn.entity.updateMany({
          where: {
            parents: { has: entity.parents[0] },
            order: { gt: entity.order },
          },
          data: { order: { decrement: 1 } },
        });
      }

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
    text: data.entity.text
      ? prepareTextForSave(data.entity.text as any)
      : undefined,
  };
  if (entityData.text && entityData.text.length === 0) {
    throw new Error("Text cannot be empty");
  }

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
    text: prepareTextForSave(data.entity.text as any),
  };
  if (entityData.text.length === 0) {
    throw new Error("Text cannot be empty");
  }

  const res = await db.$transaction(async (txn) => {
    // No explicit order: append after the last sibling of the first parent.
    if (typeof entityData.order !== "number" || Number.isNaN(entityData.order)) {
      const connect = data.entity.parentsRel?.connect;
      const parentId = (Array.isArray(connect) ? connect[0] : connect)?.id;
      entityData.order = parentId ? await nextChildOrder(txn, parentId) : 0;
    }
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

/**
 * Reads one entity with its parents. Children are NOT loaded by default — a
 * chapter can have thousands of verses, and callers that list children page
 * through them with `fetchEntities` instead. `childIds` is always returned.
 */
export const readEntity = async (
  entityId: string,
  language: string,
  meaning?: string,
  options: { withChildren?: boolean } = {},
) => {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const entity = await db.entity.findUnique({
    where: { id: entityId },
    include: {
      ...(options.withChildren
        ? {
            childrenRel: {
              select: {
                id: true,
                type: true,
                text: true,
                imageThumbnail: true,
              },
            },
          }
        : {}),
      parentsRel: {
        select: { id: true, type: true, text: true, imageThumbnail: true },
      },
    },
  });
  return entity
    ? { ...mapDbToEntity(entity, language, meaning), childIds: entity.children }
    : entity;
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
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

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

  const [entitiesCount, entities] = await Promise.all([
    db.entity.count({ where }),
    db.entity.findMany({
      skip: pagination.pageIndex * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: sorting?.length ? (orderBy as any) : { order: "asc" },
      where,
    }),
  ]);

  // Lists only render tiles, so leave the per-language payload on the server.
  const results = entities.map((e) => {
    const { textData, meaningData, attributes, notes, ...tile } = mapDbToEntity(
      e,
      language,
    );
    return tile;
  });
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
  const childrenWithChildren: any[] =
    children?.filter((c: any) => c.children && c.children.length > 0) ?? [];

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
      // children created above (those with their own children) are already
      // linked to this entity, so only pick up the ones just inserted
      const childIds = await db.entity.findMany({
        where: {
          parents: { has: entityId },
          id: { notIn: childrenWithChildrenIds },
        },
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
  const audioAssetPath = `audios/${entityId}.wav`;
  const audioPath = resolveAssetPath(audioAssetPath);
  await mkdir(path.dirname(audioPath), { recursive: true });
  await writeFile(audioPath, audioBuffer);
  const audioUrl = assetUrl(audioAssetPath);

  // Update entity with audio URL
  await db.entity.update({
    where: { id: entityId },
    data: { audio: audioUrl },
  });

  return audioUrl;
}

//********** Fast content entry **********//

export type EntityActionResponse<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const MAX_BULK_ITEMS = 2000;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unexpected error";

/** Order value that places a new child after every existing child. */
const nextChildOrder = async (
  txn: Prisma.TransactionClient,
  parentId: string,
): Promise<number> => {
  const last = await txn.entity.findFirst({
    where: { parents: { has: parentId } },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return last ? last.order + 1 : 0;
};

/**
 * Rebuilds a parent's `children` list from the entities that point at it,
 * in display order. The child's `parents` field is the source of truth.
 */
const syncParentChildren = async (
  txn: Prisma.TransactionClient,
  parentId: string,
) => {
  const children = await txn.entity.findMany({
    where: { parents: { has: parentId } },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await txn.entity.update({
    where: { id: parentId },
    data: { children: { set: children.map((c) => c.id) } },
  });
};

/**
 * Creates many children under a parent in one go (e.g. every verse of a
 * stotram pasted as one block). Text is given in a single language; the other
 * scripts are generated. New children are appended, or inserted at `position`
 * (0-based) with the following children shifted down.
 */
export async function addChildEntities(input: {
  parentId: string;
  type: string;
  language: string;
  items: { text: string; meaning?: string }[];
  meaningLanguage?: string;
  position?: number;
}): Promise<EntityActionResponse<{ created: number; firstOrder: number }>> {
  try {
    const session = await auth();
    if (!session) return { status: "error", error: "Unauthorized" };

    const { parentId, type, language, meaningLanguage, position } = input;
    if (!isEntityTypeCode(type)) {
      return { status: "error", error: `Unknown entity type: ${type}` };
    }
    const items = (input.items ?? []).filter((item) => item.text?.trim());
    if (items.length === 0) {
      return { status: "error", error: "Nothing to add" };
    }
    if (items.length > MAX_BULK_ITEMS) {
      return {
        status: "error",
        error: `Too many items (${items.length}); add at most ${MAX_BULK_ITEMS} at a time`,
      };
    }

    const result = await db.$transaction(
      async (txn) => {
        const parent = await txn.entity.findUnique({
          where: { id: parentId },
          select: { id: true },
        });
        if (!parent) throw new Error("Parent not found");

        const endOrder = await nextChildOrder(txn, parentId);
        let firstOrder = endOrder;
        if (
          typeof position === "number" &&
          position >= 0 &&
          position < endOrder
        ) {
          firstOrder = Math.floor(position);
          await txn.entity.updateMany({
            where: { parents: { has: parentId }, order: { gte: firstOrder } },
            data: { order: { increment: items.length } },
          });
        }

        await txn.entity.createMany({
          data: items.map((item, idx) => ({
            type,
            order: firstOrder + idx,
            parents: [parentId],
            text: prepareTextForSave([{ language, value: item.text.trim() }]),
            meaning: item.meaning?.trim()
              ? [
                  {
                    language: meaningLanguage || language,
                    value: item.meaning.trim(),
                  },
                ]
              : [],
          })),
        });
        await syncParentChildren(txn, parentId);
        return { created: items.length, firstOrder };
      },
      { timeout: 60000 },
    );
    return { status: "success", data: result };
  } catch (error) {
    console.error("addChildEntities failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

/**
 * Edits the text and/or meaning of an entity in one language without sending
 * the whole document. With `syncScripts` the other transliterable scripts are
 * regenerated from the edited text so they never drift apart.
 */
export async function updateEntityContent(
  id: Entity["id"],
  input: {
    text?: { language: string; value: string };
    meaning?: { language: string; value: string };
    syncScripts?: boolean;
  },
): Promise<EntityActionResponse<{ id: string }>> {
  try {
    const session = await auth();
    if (!session) return { status: "error", error: "Unauthorized" };

    const entity = await db.entity.findUnique({
      where: { id },
      select: { text: true, meaning: true },
    });
    if (!entity) return { status: "error", error: "Entity not found" };

    const data: Prisma.EntityUpdateInput = {};
    if (input.text) {
      if (!input.text.value.trim()) {
        return { status: "error", error: "Text cannot be empty" };
      }
      let text = setLanguageValue(
        entity.text,
        input.text.language,
        input.text.value,
      );
      if (input.syncScripts) text = syncScripts(text, input.text.language);
      data.text = prepareTextForSave(text);
    }
    if (input.meaning) {
      data.meaning = setLanguageValue(
        entity.meaning,
        input.meaning.language,
        input.meaning.value,
      ).filter((m) => m.value.trim());
    }
    if (Object.keys(data).length > 0) {
      await db.entity.update({ where: { id }, data });
    }
    return { status: "success", data: { id } };
  } catch (error) {
    console.error("updateEntityContent failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

/**
 * Moves an entity to a new position (0-based) among its siblings, shifting
 * the entities in between so numbering stays contiguous.
 */
export async function moveEntity(
  id: Entity["id"],
  toOrder: number,
): Promise<EntityActionResponse<{ id: string; order: number }>> {
  try {
    const session = await auth();
    if (!session) return { status: "error", error: "Unauthorized" };
    if (!Number.isInteger(toOrder) || toOrder < 0) {
      return { status: "error", error: "Position must be 1 or greater" };
    }

    const order = await db.$transaction(
      async (txn) => {
        const entity = await txn.entity.findUnique({
          where: { id },
          select: { order: true, parents: true },
        });
        if (!entity) throw new Error("Entity not found");

        const parentId = entity.parents[0];
        let target = toOrder;
        if (parentId) {
          const last = (await nextChildOrder(txn, parentId)) - 1;
          target = Math.min(toOrder, Math.max(last, 0));
          if (target < entity.order) {
            await txn.entity.updateMany({
              where: {
                parents: { has: parentId },
                order: { gte: target, lt: entity.order },
              },
              data: { order: { increment: 1 } },
            });
          } else if (target > entity.order) {
            await txn.entity.updateMany({
              where: {
                parents: { has: parentId },
                order: { gt: entity.order, lte: target },
              },
              data: { order: { decrement: 1 } },
            });
          }
        }
        if (target !== entity.order) {
          await txn.entity.update({ where: { id }, data: { order: target } });
          if (parentId) await syncParentChildren(txn, parentId);
        }
        return target;
      },
      { timeout: 60000 },
    );
    return { status: "success", data: { id, order } };
  } catch (error) {
    console.error("moveEntity failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

//********** Reading flow **********//

/** Previous and next entity in reading order, crossing chapter boundaries. */
export async function fetchReadingNeighbours(
  entityId: string,
): Promise<{ prev: ReadingRef | null; next: ReadingRef | null }> {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return getReadingNeighbours(entityId);
}
