import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { cleanupDownloadFile } from "../../../(app)/dictionary/download-actions";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filepath = searchParams.get("filepath");
    const filename = searchParams.get("filename");

    if (!filepath || !filename) {
      return new Response("Missing required parameters", { status: 400 });
    }

    // Read the file
    const fileBuffer = await readFile(filepath);

    // Create response with file download
    const response = new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    // Clean up the file after sending (fire and forget)
    cleanupDownloadFile(filepath).catch(console.error);

    return response;
  } catch (error) {
    console.error("Download error:", error);
    return new Response("File not found or error occurred", { status: 500 });
  }
}
