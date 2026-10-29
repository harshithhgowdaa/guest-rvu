import { NextRequest, NextResponse } from "next/server";
import { checkIn, registerGuestAndCheckIn } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    guestId?: unknown;
    name?: unknown;
    batch?: unknown;
  } | null;

  try {
    if (body && typeof body.guestId === "string") {
      const result = await checkIn(body.guestId);
      if (result.status === "not_found") {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result);
    }

    const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const batch = typeof body?.batch === "string" ? body.batch.trim().replace(/\s*-\s*/g, "-") : "";
    if (!name || name.length > 100 || !/^(?:19|20)\d{2}$/.test(batch)) {
      return NextResponse.json(
        { error: "Enter your name and choose a four-digit batch year." },
        { status: 400 }
      );
    }

    const result = await registerGuestAndCheckIn(name, batch);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "We couldn’t save your check-in. Please try again or speak with event staff." },
      { status: 500 }
    );
  }
}
