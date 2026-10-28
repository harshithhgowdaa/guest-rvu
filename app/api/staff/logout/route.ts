import { NextResponse } from "next/server";
import { staffCookieName } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: staffCookieName,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0
  });
  return response;
}
