import { NextRequest, NextResponse } from "next/server";
import { checkIn } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { guestId?: unknown } | null;
  if (!body || typeof body.guestId !== "string") {
    return NextResponse.json({ error: "Select a guest before checking in." }, { status: 400 });
  }
  const result = await checkIn(body.guestId);
  if (result.status === "not_found") {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
