import { NextRequest, NextResponse } from "next/server";
import { getSuggest } from "@/lib/moviebox-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json([]);
    const data = await getSuggest(q);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json([], { status: 502 });
  }
}
