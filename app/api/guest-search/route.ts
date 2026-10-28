import { NextRequest, NextResponse } from "next/server";
import { searchGuests } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const guests = await searchGuests(query);
  return NextResponse.json({ guests });
}
