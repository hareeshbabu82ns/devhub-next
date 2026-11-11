"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AiChatDetail, AiChatSummary, CHAT_TITLE_MAX } from "@/lib/ai/chats";

type Response<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

const OBJECT_ID = /^[0-9a-f]{24}$/i;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unexpected error";

async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** My chats within a scope (null = the whole library), newest first. */
export async function listAiChats(
  scopeId: string | null,
): Promise<Response<AiChatSummary[]>> {
  try {
    const userId = await currentUserId();
    if (!userId) return { status: "error", error: "Unauthorized" };
    if (scopeId && !OBJECT_ID.test(scopeId)) {
      return { status: "error", error: "Invalid scope" };
    }
    const rows = await db.aiChat.findMany({
      where: { userId, scopeId: scopeId ?? null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true, turns: true, updatedAt: true },
    });
    return {
      status: "success",
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        turnCount: r.turns.length,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("listAiChats failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function getAiChat(id: string): Promise<Response<AiChatDetail>> {
  try {
    const userId = await currentUserId();
    if (!userId) return { status: "error", error: "Unauthorized" };
    if (!OBJECT_ID.test(id)) return { status: "error", error: "Not found" };
    const chat = await db.aiChat.findFirst({ where: { id, userId } });
    if (!chat) return { status: "error", error: "Not found" };
    return {
      status: "success",
      data: {
        id: chat.id,
        title: chat.title,
        scopeId: chat.scopeId,
        turnCount: chat.turns.length,
        updatedAt: chat.updatedAt.toISOString(),
        turns: chat.turns.map((t) => ({
          question: t.question,
          answer: t.answer,
          mode: t.mode ?? undefined,
          error: t.error ?? undefined,
          sources: t.sources.map((s) => ({
            ...s,
            parentId: s.parentId ?? null,
          })),
        })),
      },
    };
  } catch (error) {
    console.error("getAiChat failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function renameAiChat(
  id: string,
  title: string,
): Promise<Response<null>> {
  try {
    const userId = await currentUserId();
    if (!userId) return { status: "error", error: "Unauthorized" };
    const name = title.replace(/\s+/g, " ").trim().slice(0, CHAT_TITLE_MAX);
    if (!name) return { status: "error", error: "Name cannot be empty" };
    if (!OBJECT_ID.test(id)) return { status: "error", error: "Not found" };
    const { count } = await db.aiChat.updateMany({
      where: { id, userId },
      data: { title: name },
    });
    return count
      ? { status: "success", data: null }
      : { status: "error", error: "Not found" };
  } catch (error) {
    console.error("renameAiChat failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}

export async function deleteAiChat(id: string): Promise<Response<null>> {
  try {
    const userId = await currentUserId();
    if (!userId) return { status: "error", error: "Unauthorized" };
    if (!OBJECT_ID.test(id)) return { status: "error", error: "Not found" };
    await db.aiChat.deleteMany({ where: { id, userId } });
    return { status: "success", data: null };
  } catch (error) {
    console.error("deleteAiChat failed:", error);
    return { status: "error", error: errorMessage(error) };
  }
}
