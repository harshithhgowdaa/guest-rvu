import assert from "node:assert/strict";
import ExcelJS from "exceljs-community";
import test from "node:test";
import { createStaffSession } from "../lib/auth";
import { createAttendanceReportResponse } from "../lib/attendance-report";
import {
  buildAttendanceWorkbook,
  calculateAttendanceAnalytics,
  type AttendanceSnapshot
} from "../lib/attendance-workbook";

const generatedAt = new Date("2026-10-29T09:30:00.000Z");

async function loadWorkbook(buffer: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}

const populatedSnapshot: AttendanceSnapshot = {
  totals: { registered: 3, present: 1, pending: 2 },
  entries: [
    {
      id: "guest-a",
      name: "Abhinav Rajmalwar",
      batch: "2020",
      checkedInAt: "2026-10-29T09:00:00.000Z",
      status: "present"
    },
    {
      id: "guest-b",
      name: "Achyut Gupta",
      batch: "2018",
      checkedInAt: null,
      status: "pending"
    },
    {
      id: "guest-c",
      name: "Vanaja Kodungallur",
      batch: null,
      checkedInAt: null,
      status: "pending"
    }
  ]
};

test("attendance analytics calculate totals, rates, and unassigned batch counts", () => {
  const analytics = calculateAttendanceAnalytics(populatedSnapshot);

  assert.deepEqual(
    { registered: analytics.registered, present: analytics.present, pending: analytics.pending },
    { registered: 3, present: 1, pending: 2 }
  );
  assert.equal(analytics.attendanceRate, 1 / 3);
  assert.deepEqual(analytics.batches, [
    { batch: "2018", registered: 1, present: 0, pending: 1, attendanceRate: 0 },
    { batch: "2020", registered: 1, present: 1, pending: 0, attendanceRate: 1 },
    { batch: "Unassigned", registered: 1, present: 0, pending: 1, attendanceRate: 0 }
  ]);
});

test("workbook contains overview metrics, batch analytics, details, formatting, filters, and frozen headers", async () => {
  const buffer = await buildAttendanceWorkbook(populatedSnapshot, generatedAt);
  const workbook = await loadWorkbook(buffer);

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Overview", "Attendee details"]);

  const overview = workbook.getWorksheet("Overview")!;
  assert.equal(overview.getCell("A1").value, "XLRI Alumni (Bengaluru) Get Together");
  assert.equal((overview.getCell("B2").value as Date).toISOString(), generatedAt.toISOString());
  assert.deepEqual(
    [overview.getCell("A6").value, overview.getCell("B6").value, overview.getCell("C6").value],
    [3, 1, 2]
  );
  assert.equal(overview.getCell("D6").value, 1 / 3);
  assert.equal(overview.getCell("D6").numFmt, "0.0%");
  assert.equal(overview.getCell("A12").value, "Unassigned");
  assert.ok(overview.autoFilter);
  assert.equal(overview.views[0]?.state, "frozen");
  assert.equal((overview.views[0] as { ySplit?: number } | undefined)?.ySplit, 9);
  assert.ok((overview.getColumn(1).width ?? 0) >= 20);

  const attendees = workbook.getWorksheet("Attendee details")!;
  assert.equal(attendees.getCell("A1").value, "Guest name");
  assert.equal(attendees.getCell("C1").value, "Check-in status");
  assert.equal(attendees.getCell("A2").value, "Abhinav Rajmalwar");
  assert.equal(attendees.getCell("C2").value, "Present");
  assert.equal((attendees.getCell("D2").value as Date).toISOString(), "2026-10-29T09:00:00.000Z");
  assert.equal(attendees.getCell("D2").numFmt, "dd mmm yyyy, hh:mm");
  assert.equal(attendees.getCell("D3").value, "");
  assert.equal(attendees.getCell("C3").value, "Not checked in");
  assert.ok(attendees.autoFilter);
  assert.equal(attendees.views[0]?.state, "frozen");
  assert.equal((attendees.views[0] as { ySplit?: number } | undefined)?.ySplit, 1);
});

test("empty attendance produces a valid workbook with zero metrics and headers", async () => {
  const snapshot: AttendanceSnapshot = {
    totals: { registered: 0, present: 0, pending: 0 },
    entries: []
  };
  const buffer = await buildAttendanceWorkbook(snapshot, generatedAt);
  const workbook = await loadWorkbook(buffer);

  const overview = workbook.getWorksheet("Overview")!;
  const attendees = workbook.getWorksheet("Attendee details")!;
  assert.deepEqual(
    [overview.getCell("A6").value, overview.getCell("B6").value, overview.getCell("C6").value, overview.getCell("D6").value],
    [0, 0, 0, 0]
  );
  assert.equal(overview.getRow(10).cellCount, 0);
  assert.equal(attendees.getRow(1).cellCount, 4);
  assert.equal(attendees.rowCount, 1);
});

test("unauthorized export returns 401 without loading or exposing attendance", async () => {
  const priorSecret = process.env.STAFF_SESSION_SECRET;
  process.env.STAFF_SESSION_SECRET = "analytics-test-session-secret";
  let providerCalled = false;

  try {
    const response = await createAttendanceReportResponse(undefined, async () => {
      providerCalled = true;
      return populatedSnapshot;
    }, generatedAt);
    const body = await response.text();

    assert.equal(response.status, 401);
    assert.equal(providerCalled, false);
    assert.equal(body.includes("Abhinav Rajmalwar"), false);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  } finally {
    if (priorSecret === undefined) delete process.env.STAFF_SESSION_SECRET;
    else process.env.STAFF_SESSION_SECRET = priorSecret;
  }
});

test("authorized export streams an xlsx attachment with the event and report date in its filename", async () => {
  const priorSecret = process.env.STAFF_SESSION_SECRET;
  process.env.STAFF_SESSION_SECRET = "analytics-test-session-secret";

  try {
    const response = await createAttendanceReportResponse(
      createStaffSession(),
      async () => populatedSnapshot,
      generatedAt
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    assert.match(
      response.headers.get("content-disposition") ?? "",
      /xlri-alumni-bengaluru-get-together-attendance-2026-10-29\.xlsx/
    );
    const workbook = await loadWorkbook(new Uint8Array(await response.arrayBuffer()));
    assert.equal(workbook.getWorksheet("Attendee details")?.getCell("A2").value, "Abhinav Rajmalwar");
  } finally {
    if (priorSecret === undefined) delete process.env.STAFF_SESSION_SECRET;
    else process.env.STAFF_SESSION_SECRET = priorSecret;
  }
});
