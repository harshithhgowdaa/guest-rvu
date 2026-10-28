import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidStaffSession, staffCookieName } from "@/lib/auth";
import { clearAttendance, getDashboard } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidStaffSession(cookieStore.get(staffCookieName)?.value)) {
    return NextResponse.json({ error: "Staff access required." }, { status: 401 });
  }
  const query = request.nextUrl.searchParams.get("query") ?? undefined;
  return NextResponse.json(await getDashboard(query));
}

export async function DELETE() {
  const cookieStore = await cookies();
  if (!isValidStaffSession(cookieStore.get(staffCookieName)?.value)) {
    return NextResponse.json({ error: "Staff access required." }, { status: 401 });
  }

  try {
    await clearAttendance();
    return NextResponse.json(await getDashboard());
  } catch {
    return NextResponse.json(
      { error: "Check-ins could not be cleared. Please try again." },
      { status: 500 }
    );
  }
}
