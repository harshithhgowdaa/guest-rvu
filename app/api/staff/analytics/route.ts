import { cookies } from "next/headers";
import { staffCookieName } from "@/lib/auth";
import { createAttendanceReportResponse } from "@/lib/attendance-report";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  return createAttendanceReportResponse(cookieStore.get(staffCookieName)?.value);
}
