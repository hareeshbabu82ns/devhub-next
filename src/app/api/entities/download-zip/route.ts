import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ArchiveError } from "@/lib/entity-archive/format";
import { exportEntityArchive } from "@/lib/entity-archive/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entityId = request.nextUrl.searchParams.get("entityId");
    if (!entityId) {
      return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
    }

    const result = await exportEntityArchive(entityId, {
      id: session.user.id,
      isAdmin: session.user.role === "ADMIN",
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      "Content-Length": result.data.length.toString(),
      "X-Entity-Count": String(result.totalEntities),
      "Cache-Control": "no-store",
    };
    if (result.warnings.length) {
      headers["X-Archive-Warnings"] = encodeURIComponent(
        result.warnings.join("\n"),
      );
    }

    return new NextResponse(new Uint8Array(result.data), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Entity hierarchy download error:", error);
    const status =
      error instanceof ArchiveError && error.message === "Entity not found"
        ? 404
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status },
    );
  }
}
