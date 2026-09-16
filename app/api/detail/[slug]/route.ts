import { NextResponse } from "next/server";
import { getDetail } from "@/lib/moviebox-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  try {
    const data = await getDetail(ctx.params.slug);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
