import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadEntityHierarchyZip } from "@/app/(app)/entities/actions-zip";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const parentId = formData.get("parentId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 50MB." },
        { status: 413 },
      );
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { success: false, error: "Only ZIP files are supported" },
        { status: 400 },
      );
    }

    // Convert file to base64 for the server action
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Data = btoa(binary);

    // Call the server action
    const result = await uploadEntityHierarchyZip(
      base64Data,
      parentId || undefined,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("ZIP upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
