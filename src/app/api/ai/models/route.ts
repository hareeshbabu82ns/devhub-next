import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAiOptions } from "@/lib/ai/providers";

/**
 * The providers and models a request can choose from, and the default one.
 * Names only: base URLs and API keys stay on the server.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await listAiOptions(session.user.id));
  } catch (error) {
    console.error("Listing AI models failed:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
