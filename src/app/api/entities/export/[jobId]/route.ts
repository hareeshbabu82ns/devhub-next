import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cancelExportJob,
  getExportJob,
  toJobInfo,
} from "@/lib/entity-archive/export-jobs";

type Context = { params: Promise<{ jobId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = getExportJob((await params).jobId, session.user.id);
  if (!job) {
    return NextResponse.json(
      { error: "This download is no longer available; start it again" },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { job: toJobInfo(job) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Cancels a running download, or discards a finished one. */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = cancelExportJob((await params).jobId, session.user.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
