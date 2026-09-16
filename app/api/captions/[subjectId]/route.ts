import { NextRequest, NextResponse } from "next/server";
import { getCaptions } from "@/lib/moviebox-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: { subjectId: string } }) {
  try {
    const sp = req.nextUrl.searchParams;
    const slug = sp.get("slug") || "";
    const se = Math.max(1, parseInt(sp.get("se") || "1", 10) || 1);
    const ep = Math.max(1, parseInt(sp.get("ep") || "1", 10) || 1);
    const data = await getCaptions(ctx.params.subjectId, slug, se, ep);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json([], { status: 502 });
  }
}
