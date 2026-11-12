import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  latestExportJob,
  startExportJob,
  toJobInfo,
} from "@/lib/entity-archive/export-jobs";

/** Starts preparing a download of an entity and everything under it. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const entityId = typeof body?.entityId === "string" ? body.entityId : "";
  if (!/^[0-9a-f]{24}$/i.test(entityId)) {
    return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
  }
  try {
    const job = startExportJob(entityId, {
      id: session.user.id,
      isAdmin: session.user.role === "ADMIN",
    });
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start" },
      { status: 429 },
    );
  }
}

/** The current user's running or ready download of `?entityId=`, if any. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entityId = request.nextUrl.searchParams.get("entityId") ?? "";
  const job = latestExportJob(entityId, session.user.id);
  return NextResponse.json({ job: job ? toJobInfo(job) : null });
}
