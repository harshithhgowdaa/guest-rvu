import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidStaffSession, staffCookieName } from "@/lib/auth";
import { getDashboard } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidStaffSession(cookieStore.get(staffCookieName)?.value)) {
    return NextResponse.json({ error: "Staff access required." }, { status: 401 });
  }
  const query = request.nextUrl.searchParams.get("query") ?? undefined;
  return NextResponse.json(await getDashboard(query));
}
