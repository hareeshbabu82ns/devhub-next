import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExportJob } from "@/lib/entity-archive/export-jobs";

type Context = { params: Promise<{ jobId: string }> };

/** The finished ZIP of a background download. */
export async function GET(_request: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = getExportJob((await params).jobId, session.user.id);
  if (!job || job.status !== "ready" || !job.data || !job.filename) {
    return NextResponse.json(
      { error: "This download is not ready or has expired" },
      { status: 404 },
    );
  }
  return new NextResponse(new Uint8Array(job.data), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${job.filename}"; filename*=UTF-8''${encodeURIComponent(job.filename)}`,
      "Content-Length": String(job.data.length),
      "Cache-Control": "no-store",
    },
  });
}
