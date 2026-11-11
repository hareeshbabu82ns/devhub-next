import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAiConfig } from "@/lib/ai/config";
import { getEmbedConfig } from "@/lib/ai/rag/embeddings";
import {
  cancelRagBuild,
  liveBuild,
  removeRagIndex,
  startRagBuild,
} from "@/lib/ai/rag/build";
import { ragCoverage } from "@/lib/ai/rag/store";
import type { RagBuildInfo, RagStatus } from "@/lib/ai/rag/types";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    scopeId: objectId.nullable().optional(),
    embeddings: z.boolean(),
    graph: z.boolean(),
    force: z.boolean().optional(),
  }),
  z.object({ action: z.literal("cancel"), buildId: objectId }),
  z.object({
    action: z.literal("remove"),
    scopeId: objectId.nullable().optional(),
  }),
]);

type BuildRow = NonNullable<Awaited<ReturnType<typeof liveBuild>>>;

const buildInfo = (build: BuildRow): RagBuildInfo => ({
  id: build.id,
  scopeId: build.scopeId,
  scopeTitle: build.scopeTitle,
  status: build.status as RagBuildInfo["status"],
  stage: build.stage,
  embeddings: build.embeddings,
  graph: build.graph,
  total: build.total,
  done: build.done,
  embedded: build.embedded,
  extracted: build.extracted,
  failed: build.failed,
  message: build.message ?? "",
  error: build.error,
  startedAt: build.startedAt.toISOString(),
  finishedAt: build.finishedAt?.toISOString() ?? null,
});

/**
 * How much of a scope (`?scopeId=`, omitted for the whole library) is in
 * the knowledge index, the build running right now (for any scope — only
 * one runs at a time) and the last build of this scope.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = request.nextUrl.searchParams.get("scopeId");
  const scopeId = raw ? objectId.safeParse(raw) : null;
  if (scopeId && !scopeId.success) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  try {
    const id = scopeId?.data ?? null;
    const [coverage, running, last] = await Promise.all([
      ragCoverage(id),
      liveBuild(),
      db.ragBuild.findFirst({
        where: { scopeId: id },
        orderBy: { startedAt: "desc" },
      }),
    ]);
    const status: RagStatus = {
      coverage,
      running: running ? buildInfo(running) : null,
      last: last ? buildInfo(last) : null,
      can: { embeddings: !!getEmbedConfig(), graph: !!getAiConfig() },
    };
    return NextResponse.json(status);
  } catch (error) {
    console.error("RAG status failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}

/** Starts or cancels a build, or removes the index of a scope. */
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
  try {
    const body = parsed.data;
    if (body.action === "start") {
      const buildId = await startRagBuild(
        body.scopeId ?? null,
        {
          embeddings: body.embeddings,
          graph: body.graph,
          force: body.force ?? false,
        },
        userId,
      );
      return NextResponse.json({ buildId });
    }
    if (body.action === "cancel") await cancelRagBuild(body.buildId);
    else await removeRagIndex(body.scopeId ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // configuration and "already running" problems are the user's to read
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 409 },
    );
  }
}
