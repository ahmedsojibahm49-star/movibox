import { NextRequest, NextResponse } from "next/server";
import { getSearch } from "@/lib/moviebox-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const data = await getSearch(q, page);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
