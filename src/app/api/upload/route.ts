import { parseForm } from "@/lib/parse-form";
import { NextRequest } from "next/server";

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
