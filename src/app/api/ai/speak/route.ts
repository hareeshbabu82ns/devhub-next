import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { synthesizeSpeech } from "@/lib/ai/speech";

const SpeakSchema = z.object({
  // the client sends one sentence or paragraph at a time
  text: z.string().trim().min(1).max(1500),
  voice: z
    .string()
    .regex(/^[\w-]{1,64}$/)
    .optional(),
});

/**
 * Reads a piece of an answer aloud with the first working local source
 * (library TTS server, then the speech model). On failure the client uses
 * the browser's voices instead.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = SpeakSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const { body, contentType, source } = await synthesizeSpeech(
      parsed.data.text,
      parsed.data.voice ?? "PAN_F_HAPPY_00001",
      request.signal,
    );
    return new Response(body as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Speech-Source": source,
      },
    });
  } catch (error) {
    console.error("Speech synthesis failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Speech failed" },
      { status: 502 },
    );
  }
}
