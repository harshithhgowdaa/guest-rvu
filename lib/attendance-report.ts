import { isValidStaffSession } from "./auth";
import { buildAttendanceWorkbook, type AttendanceSnapshot } from "./attendance-workbook";
import { getDashboard } from "./store";

const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function reportFilename(generatedAt: Date) {
  const reportDate = generatedAt.toISOString().slice(0, 10);
  return `xlri-alumni-bengaluru-get-together-attendance-${reportDate}.xlsx`;
}

export async function createAttendanceReportResponse(
  session: string | undefined,
  dashboardProvider: () => Promise<AttendanceSnapshot> = getDashboard,
  generatedAt: Date = new Date()
): Promise<Response> {
  if (!isValidStaffSession(session)) {
    return Response.json(
      { error: "Staff access required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  try {
    const snapshot = await dashboardProvider();
    const workbook = await buildAttendanceWorkbook(snapshot, generatedAt);
    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${reportFilename(generatedAt)}"`,
        "Content-Length": String(workbook.byteLength),
        "Content-Type": contentType
      }
    });
  } catch {
    return Response.json(
      { error: "The attendance report could not be generated." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
