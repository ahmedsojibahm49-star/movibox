import { NextResponse } from "next/server";
import { getHome } from "@/lib/moviebox-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getHome();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
