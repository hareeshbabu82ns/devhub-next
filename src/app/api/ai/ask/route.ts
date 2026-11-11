import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { AI_NOT_CONFIGURED, getAiConfig } from "@/lib/ai/config";
import { askLibrary } from "@/lib/ai/ask";

const AskSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  scopeId: z
    .string()
    .regex(/^[0-9a-f]{24}$/i)
    .nullable()
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(20000),
      }),
    )
    .max(20)
    .optional(),
});

/** Tells the UI whether the feature is available, without exposing settings. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ configured: !!getAiConfig() });
}

/**
 * Streams the answer as newline-delimited JSON events:
 * `sources` first, then `delta` chunks, then `done` (or `error`).
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
  const { question, scopeId, history } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const events = askLibrary(
          config,
          { question, scopeId: scopeId ?? null, history },
          userId,
          request.signal,
        );
        for await (const event of events) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } finally {
        controller.close();
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
