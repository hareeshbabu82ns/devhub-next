import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { basename, join } from "path";
import { auth } from "@/lib/auth";
import config from "@/config";
import { cleanupDownloadFile } from "../../../(app)/dictionary/download-actions";

/**
 * Serves a ZIP made by downloadDictionary(). Only files inside the export
 * temp folder can be fetched: the client-supplied path is reduced to its
 * file name, so it cannot point anywhere else.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Please sign in", { status: 401 });
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const requested = searchParams.get("filepath") || searchParams.get("filename");
    if (!requested) {
      return new Response("Missing required parameters", { status: 400 });
    }
    const name = basename(requested);
    if (!/^dictionary_export_[\w.-]+\.zip$/.test(name)) {
      return new Response("Invalid file", { status: 400 });
    }
    const filepath = join(config.dataFolder, "temp", name);
    const fileBuffer = await readFile(filepath);

    const response = new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    cleanupDownloadFile(filepath).catch(console.error);
    return response;
  } catch (error) {
    console.error("Download error:", error);
    return new Response("File not found", { status: 404 });
  }
}
