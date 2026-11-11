import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSttConfig, transcribe } from "@/lib/ai/speech";

const MAX_BYTES = 25 * 1024 * 1024;

/** Turns a recorded question into text with the local speech server. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = getSttConfig();
  if (!config) {
    return NextResponse.json(
      { error: "No local speech-to-text server is configured" },
      { status: 503 },
    );
  }
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Recording is too long" },
      { status: 413 },
    );
  }
  const language = form?.get("language");
  const name = audio instanceof File && audio.name ? audio.name : "speech.webm";
  try {
    const text = await transcribe(
      config,
      audio,
      name,
      typeof language === "string" && /^[a-z]{2,3}$/.test(language)
        ? language
        : undefined,
      request.signal,
    );
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 502 },
    );
  }
}
