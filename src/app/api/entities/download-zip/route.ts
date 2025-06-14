import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@/lib/db";
import JSZip from "jszip";
import { ENTITY_TYPES_CHILDREN } from "@/lib/constants";
import { EntityTypeEnum } from "@/lib/types";
import { downloadEntityHierarchyZip } from "@/app/(app)/entities/actions-zip";

// Schema for validation
const downloadSchema = z.object({
  entityId: z.string().min(1, "Entity ID is required"),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get entityId from URL params
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get("entityId");

    // Validate input
    const validation = downloadSchema.safeParse({ entityId });
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
    }

    console.log(`Starting download for entity ID: ${validation.data.entityId}`);
    // Create ZIP file
    // const { zipData, filename } = await createEntityHierarchyZip(
    const { success, data, filename, error } = await downloadEntityHierarchyZip(
      validation.data.entityId,
      false,
    );
    if (!success) {
      console.error("Error generating ZIP:", error);
      return NextResponse.json({ error }, { status: 500 });
    }
    if (!data) {
      console.error("No data returned from ZIP generation");
      return NextResponse.json({ error: "No data returned" }, { status: 500 });
    }
    console.log(
      `Generated ZIP for entity ${validation.data.entityId} with size: ${(data!.length / 1024).toFixed(2)}KB`,
    );

    // Return ZIP file as response
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": data!.length.toString(),
      },
    });
  } catch (error) {
    console.error("Entity hierarchy download error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Download failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
