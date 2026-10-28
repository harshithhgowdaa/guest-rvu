import { NextRequest, NextResponse } from "next/server";
import {
  createStaffSession,
  staffCookieName,
  staffSessionMaxAge,
  verifyStaffCode
} from "@/lib/auth";
import { allowLoginAttempt, clearLoginAttempts } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowLoginAttempt(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== "string" || !verifyStaffCode(body.code)) {
    return NextResponse.json({ error: "That staff code is not recognised." }, { status: 401 });
  }

  clearLoginAttempts(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: staffCookieName,
    value: createStaffSession(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: staffSessionMaxAge
  });
  return response;
}
