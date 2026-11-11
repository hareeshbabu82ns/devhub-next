"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Annotation, annotationKind } from "@/lib/annotations";
import { LANGUAGES } from "@/lib/constants";

type Response<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unexpected error";

const toAnnotation = (
  a: {
    id: string;
    entityId: string;
    kind: string;
    language: string;
    title: string | null;
    text: string;
    order: number;
    userId: string | null;
    updatedAt: Date;
  },
  userId: string,
): Annotation => ({
  id: a.id,
  entityId: a.entityId,
  kind: a.kind,
  language: a.language,
  title: a.title ?? "",
  text: a.text,
  order: a.order,
  mine: a.userId === userId,
  updatedAt: a.updatedAt.toISOString(),
});

/** Annotations of an entity: shared kinds from everyone, private kinds only mine. */
export async function listAnnotations(
  entityId: string,
): Promise<Response<Annotation[]>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { status: "error", error: "Unauthorized" };

    const rows = await db.entityAnnotation.findMany({
      where: { entityId },
      orderBy: [{ kind: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });
    return {
      status: "success",
      data: rows
        .filter((r) => !annotationKind(r.kind)?.private || r.userId === userId)
        .map((r) => toAnnotation(r, userId)),
    };
  } catch (error) {
    console.error("listAnnotations failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function saveAnnotation(input: {
  id?: string;
  entityId: string;
  kind: string;
  language: string;
  title?: string;
  text: string;
}): Promise<Response<Annotation>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { status: "error", error: "Unauthorized" };

    const kind = annotationKind(input.kind);
    if (!kind) return { status: "error", error: "Unknown kind" };
    if (!(LANGUAGES as readonly string[]).includes(input.language)) {
      return { status: "error", error: "Unknown language" };
    }
    const text = input.text.trim();
    if (!text) return { status: "error", error: "Write something first" };
    const title = input.title?.trim() ?? "";

    if (input.id) {
      const existing = await db.entityAnnotation.findUnique({
        where: { id: input.id },
      });
      if (!existing) return { status: "error", error: "Not found" };
      if (kind.private && existing.userId !== userId) {
        return { status: "error", error: "Not found" };
      }
      const updated = await db.entityAnnotation.update({
        where: { id: input.id },
        data: { language: input.language, title, text },
      });
      return { status: "success", data: toAnnotation(updated, userId) };
    }

    const entity = await db.entity.findUnique({
      where: { id: input.entityId },
      select: { id: true },
    });
    if (!entity) return { status: "error", error: "Entity not found" };
    const last = await db.entityAnnotation.findFirst({
      where: { entityId: input.entityId, kind: kind.code },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const created = await db.entityAnnotation.create({
      data: {
        entityId: input.entityId,
        kind: kind.code,
        language: input.language,
        title,
        text,
        order: last ? last.order + 1 : 0,
        userId,
      },
    });
    return { status: "success", data: toAnnotation(created, userId) };
  } catch (error) {
    console.error("saveAnnotation failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function deleteAnnotation(
  id: string,
): Promise<Response<{ id: string }>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { status: "error", error: "Unauthorized" };

    const existing = await db.entityAnnotation.findUnique({ where: { id } });
    if (!existing) return { status: "error", error: "Not found" };
    if (annotationKind(existing.kind)?.private && existing.userId !== userId) {
      return { status: "error", error: "Not found" };
    }
    await db.entityAnnotation.delete({ where: { id } });
    return { status: "success", data: { id } };
  } catch (error) {
    console.error("deleteAnnotation failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}
