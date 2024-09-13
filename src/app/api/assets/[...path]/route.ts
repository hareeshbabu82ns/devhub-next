import config from "@/config";
import { parseForm } from "@/lib/parse-form";
import { readFile, stat } from "fs/promises";
import mime from "mime";
import { NextRequest, NextResponse } from "next/server";
import { extname, resolve } from "path";

export async function GET(request: NextRequest, response: NextResponse) {
  const reqUrl = new URL(request.url);
  const path = reqUrl.pathname.replace("/api/assets", config.dataFolder);
  const filePath = resolve(path);
  const fileName = path.split("/").pop() || "file";

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error("not a file");
    }
  } catch (e: any) {
    return new Response(`File not found: ${e.message}`, {
      status: 404,
    });
  }

  // send asset file
  try {
    const fileBuffer = await readFile(filePath);

    const fileExt = extname(fileName).toLowerCase();
    const mimeType = mime.getType(fileExt) || "application/octet-stream";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return new Response("File not found or error reading the file", {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const files = await parseForm(request);

    if (!files || files?.length === 0) {
      return new Response("No file was uploaded", {
        status: 400,
      });
    }

    const url = files.map((file) => file.url);

    return new Response(JSON.stringify({ data: { url } }), {
      status: 200,
    });
  } catch (e: any) {
    console.error(e);
    return new Response(`Upload error: ${e.message}`, {
      status: 500,
    });
  }
}
