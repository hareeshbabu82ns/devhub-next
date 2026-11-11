import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildUniverse } from "@/lib/ai/rag/universe";

/** The graph of a scope (`?scopeId=`, omitted for the whole library). */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scopeId = request.nextUrl.searchParams.get("scopeId");
  if (scopeId && !/^[0-9a-f]{24}$/i.test(scopeId)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  try {
    return NextResponse.json(await buildUniverse(scopeId || null));
  } catch (error) {
    console.error("Universe graph failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
