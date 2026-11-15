import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/constants";
import { requireAiConfig } from "@/lib/ai/providers";
import { fillEntity, loadSubject } from "@/lib/ai/fill";
import { FILL_TASKS } from "@/lib/ai/fill-format";
import {
  cancelFillJob,
  fillJobStatus,
  startFillJob,
} from "@/lib/ai/fill-job";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);
const model = z
  .object({
    providerId: z.string().min(1).max(64),
    model: z.string().min(1).max(200),
  })
  .nullable()
  .optional();
const language = z.enum(LANGUAGES);

const ActionSchema = z.discriminatedUnion("action", [
  // one entity: returns suggestions for the editor to review, saves nothing
  z.object({
    action: z.literal("suggest"),
    entityId: objectId,
    tasks: z.array(z.enum(FILL_TASKS)).min(1),
    language,
    /** the text as it stands in the editor, when not saved yet */
    text: z.string().max(20000).optional(),
    model,
  }),
  // a book or chapter: fills its verses in the background
  z.object({
    action: z.literal("start"),
    scopeId: objectId,
    meaning: z.boolean(),
    words: z.boolean(),
    schools: z.boolean(),
    overwrite: z.boolean().optional(),
    language,
    model,
  }),
  z.object({ action: z.literal("cancel"), jobId: objectId }),
]);

// web research on one verse can take a few minutes
export const maxDuration = 300;

/** The fill job running now and the last one of `?scopeId=`. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scopeId = objectId.safeParse(
    request.nextUrl.searchParams.get("scopeId"),
  );
  if (!scopeId.success) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  try {
    return NextResponse.json(await fillJobStatus(scopeId.data));
  } catch (error) {
    console.error("AI fill status failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  try {
    if (body.action === "suggest") {
      const config = await requireAiConfig(body.model, userId);
      const subject = await loadSubject(body.entityId, userId, body.text);
      if (!subject) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(
        await fillEntity(
          config,
          subject,
          body.tasks,
          body.language,
          request.signal,
        ),
      );
    }
    if (body.action === "start") {
      const jobId = await startFillJob(
        body.scopeId,
        {
          meaning: body.meaning,
          words: body.words,
          schools: body.schools,
          overwrite: body.overwrite ?? false,
          language: body.language,
        },
        userId,
        body.model,
      );
      return NextResponse.json({ jobId });
    }
    await cancelFillJob(body.jobId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    // configuration and "already running" problems are the user's to read
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 409 },
    );
  }
}
