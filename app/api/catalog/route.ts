import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/moviebox-server";
import type { CatalogType, SortKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const SORTS: SortKey[] = ["RECOMMEND", "HOT", "LATEST", "POPULAR"];

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const type = (sp.get("type") || "movies") as CatalogType;
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const sort = (SORTS.includes(sp.get("sort") as SortKey)
      ? sp.get("sort")
      : "RECOMMEND") as SortKey;
    const data = await getCatalog(type, page, sort);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
