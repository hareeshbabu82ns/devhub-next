"use server";

import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Response<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

/** A saved playground without its canvas, for listing */
export type EntityPlaygroundInfo = {
  id: string;
  entityId: string;
  title: string;
  updatedAt: string;
};

export type EntityPlaygroundGraph = EntityPlaygroundInfo & {
  nodes: unknown[];
  edges: unknown[];
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unexpected error";

const toInfo = (row: {
  id: string;
  entityId: string;
  title: string;
  updatedAt: Date;
}): EntityPlaygroundInfo => ({
  id: row.id,
  entityId: row.entityId,
  title: row.title,
  updatedAt: row.updatedAt.toISOString(),
});

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

// Only the shape the canvas needs to come back to life is checked; what a
// node carries in `data` is up to the playground.
const saveSchema = z.object({
  id: z.string().min(1).optional(),
  entityId: z.string().min(1),
  title: z.string().trim().min(1, "Give it a name").max(120),
  nodes: z
    .array(
      z.looseObject({
        id: z.string().min(1),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1, "There is nothing on the canvas to save")
    .max(1000, "Too many nodes to save"),
  edges: z
    .array(
      z.looseObject({
        id: z.string().min(1),
        source: z.string().min(1),
        target: z.string().min(1),
      }),
    )
    .max(3000, "Too many edges to save"),
});

/** Saved playgrounds of an entity, the most recently changed first */
export async function listEntityPlaygrounds(
  entityId: string,
): Promise<Response<EntityPlaygroundInfo[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { status: "error", error: "Unauthorized" };

    const rows = await db.entityPlayground.findMany({
      where: { entityId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, entityId: true, title: true, updatedAt: true },
    });
    return { status: "success", data: rows.map(toInfo) };
  } catch (error) {
    console.error("listEntityPlaygrounds failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function readEntityPlayground(
  id: string,
): Promise<Response<EntityPlaygroundGraph>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { status: "error", error: "Unauthorized" };

    const row = await db.entityPlayground.findUnique({ where: { id } });
    if (!row) return { status: "error", error: "Not found" };
    return {
      status: "success",
      data: {
        ...toInfo(row),
        nodes: asArray(row.nodes),
        edges: asArray(row.edges),
      },
    };
  } catch (error) {
    console.error("readEntityPlayground failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

/** Creates a saved playground, or overwrites the one with the given id */
export async function saveEntityPlayground(input: {
  id?: string;
  entityId: string;
  title: string;
  nodes: unknown[];
  edges: unknown[];
}): Promise<Response<EntityPlaygroundInfo>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { status: "error", error: "Unauthorized" };

    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        error: parsed.error.issues[0]?.message ?? "Invalid playground",
      };
    }
    const { id, entityId, title } = parsed.data;
    // through JSON: drops `undefined` fields, which the database rejects
    const graph = JSON.parse(
      JSON.stringify({ nodes: parsed.data.nodes, edges: parsed.data.edges }),
    ) as { nodes: Prisma.InputJsonValue; edges: Prisma.InputJsonValue };

    if (id) {
      const existing = await db.entityPlayground.findUnique({
        where: { id },
        select: { entityId: true },
      });
      if (!existing || existing.entityId !== entityId) {
        return { status: "error", error: "Not found" };
      }
      const updated = await db.entityPlayground.update({
        where: { id },
        data: { title, ...graph },
      });
      return { status: "success", data: toInfo(updated) };
    }

    const entity = await db.entity.findUnique({
      where: { id: entityId },
      select: { id: true },
    });
    if (!entity) return { status: "error", error: "Entity not found" };
    const created = await db.entityPlayground.create({
      data: { entityId, title, ...graph, userId },
    });
    return { status: "success", data: toInfo(created) };
  } catch (error) {
    console.error("saveEntityPlayground failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function deleteEntityPlayground(
  id: string,
): Promise<Response<{ id: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { status: "error", error: "Unauthorized" };

    const existing = await db.entityPlayground.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { status: "error", error: "Not found" };
    await db.entityPlayground.delete({ where: { id } });
    return { status: "success", data: { id } };
  } catch (error) {
    console.error("deleteEntityPlayground failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}
