import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AI_NOT_CONFIGURED, getAiConfig } from "@/lib/ai/config";
import { AskEvent, AskSource, askLibrary } from "@/lib/ai/ask";
import { AiChatTurn, chatHistory, chatTitleFrom } from "@/lib/ai/chats";
import { speechStatus } from "@/lib/ai/speech";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

const AskSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  scopeId: objectId.nullable().optional(),
  /** continue this saved chat; omit to start a new one */
  chatId: objectId.nullable().optional(),
});

/**
 * Tells the UI which features are available (the chat model and the optional
 * local speech servers), without exposing their settings.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    configured: !!getAiConfig(),
    speech: speechStatus(),
  });
}

/**
 * Streams the answer as newline-delimited JSON events:
 * `chat` first (the saved conversation), then `sources`, `delta` chunks,
 * and `done` (or `error`). The turn is saved to the chat when the stream
 * ends — including a partial answer when the user stops it.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getAiConfig();
  if (!config) {
    return NextResponse.json({ error: AI_NOT_CONFIGURED }, { status: 503 });
  }
  const parsed = AskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { question } = parsed.data;

  let chat: { id: string; title: string; scopeId: string | null };
  let history: ReturnType<typeof chatHistory> = [];
  if (parsed.data.chatId) {
    const existing = await db.aiChat.findFirst({
      where: { id: parsed.data.chatId, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    chat = existing;
    history = chatHistory(existing.turns as AiChatTurn[]);
  } else {
    chat = await db.aiChat.create({
      data: {
        userId,
        title: chatTitleFrom(question),
        scopeId: parsed.data.scopeId ?? null,
        turns: [],
      },
    });
  }

  const turn = {
    question,
    answer: "",
    sources: [] as AskSource[],
    mode: null as string | null,
    error: null as string | null,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AskEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // the client went away; keep going so the turn is still saved
        }
      };
      try {
        send({ type: "chat", id: chat.id, title: chat.title });
        const events = askLibrary(
          config,
          { question, scopeId: chat.scopeId, history },
          userId,
          request.signal,
        );
        for await (const event of events) {
          if (event.type === "sources") {
            turn.sources = event.sources;
            turn.mode = event.mode;
          } else if (event.type === "delta") {
            turn.answer += event.text;
          } else if (event.type === "error") {
            turn.error = event.error;
          }
          send(event);
        }
      } finally {
        try {
          await db.aiChat.update({
            where: { id: chat.id },
            data: { turns: { push: { ...turn, createdAt: new Date() } } },
          });
        } catch (error) {
          console.error("Saving the AI chat turn failed:", error);
        }
        try {
          controller.close();
        } catch {
          // already closed by a disconnect
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
