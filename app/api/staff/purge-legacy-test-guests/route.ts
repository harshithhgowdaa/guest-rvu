import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidStaffSession, staffCookieName } from "@/lib/auth";
import { purgeLegacyTestGuests } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  if (!isValidStaffSession(cookieStore.get(staffCookieName)?.value)) {
    return NextResponse.json({ error: "Staff access required." }, { status: 401 });
  }

  try {
    return NextResponse.json(await purgeLegacyTestGuests());
  } catch {
    return NextResponse.json({ error: "Legacy test records could not be removed." }, { status: 500 });
  }
}
