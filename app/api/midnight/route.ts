import { NextResponse } from "next/server";
import { getMidnight } from "@/lib/moviebox-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMidnight();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ picks: [], anime: [] }, { status: 200 });
  }
}
