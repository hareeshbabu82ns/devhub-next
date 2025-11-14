import config from "@/config";
import { parseForm } from "@/lib/parse-form";
import { readFile, stat } from "fs/promises";
import mime from "mime";
import { NextRequest, NextResponse } from "next/server";
import { extname, resolve } from "path";

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const path = reqUrl.pathname.replace("/api/assets", config.dataFolder);
  const filePath = resolve(path);
  const fileName = path.split("/").pop() || "file";

  // Check if download is explicitly requested
  const shouldDownload = reqUrl.searchParams.get("download") === "true";

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("not a file");
    }
  } catch (e: any) {
    return new NextResponse(`File not found: ${e.message}`, {
      status: 404,
    });
  }

  // send asset file
  try {
    const fileBuffer = await readFile(filePath);

    const fileExt = extname(fileName).toLowerCase();
    const mimeType = mime.getType(fileExt) || "application/octet-stream";

    // Use inline disposition for images unless download is explicitly requested
    const isImage = mimeType.startsWith("image/");
    const disposition =
      shouldDownload || !isImage
        ? `attachment; filename=${fileName}`
        : `inline; filename=${fileName}`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        // Add cache headers for better performance
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return new NextResponse("File not found or error reading the file", {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const files = await parseForm(request);

    if (!files || files?.length === 0) {
      return new NextResponse("No file was uploaded", {
        status: 400,
      });
    }

    const url = files.map((file) => file.url);

    return new NextResponse(JSON.stringify({ data: { url } }), {
      status: 200,
    });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(`Upload error: ${e.message}`, {
      status: 500,
    });
  }
}
