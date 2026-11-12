import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ArchiveError } from "@/lib/entity-archive/format";
import { importEntityArchive } from "@/lib/entity-archive/server";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Imports a downloaded entity archive (ZIP) or a legacy JSON tree. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const parentId = formData.get("parentId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 100MB." },
        { status: 413 },
      );
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".zip") && !name.endsWith(".json")) {
      return NextResponse.json(
        { success: false, error: "Only ZIP or JSON files are supported" },
        { status: 400 },
      );
    }

    const result = await importEntityArchive({
      data: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      parentId: typeof parentId === "string" && parentId ? parentId : null,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Entity archive upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: error instanceof ArchiveError ? 400 : 500 },
    );
  }
}
