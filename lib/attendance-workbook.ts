import ExcelJS from "exceljs-community";
import type { Cell, Row } from "exceljs-community";
import type { DashboardEntry } from "./types";

export type AttendanceSnapshot = {
  totals: { registered: number; present: number; pending: number };
  entries: DashboardEntry[];
};

export type BatchAnalytics = {
  batch: string;
  registered: number;
  present: number;
  pending: number;
  attendanceRate: number;
};

export type AttendanceAnalytics = {
  registered: number;
  present: number;
  pending: number;
  attendanceRate: number;
  batches: BatchAnalytics[];
};

const colors = {
  charcoal: "233039",
  teal: "004854",
  gold: "D7AC54",
  paper: "EFEFEE",
  line: "D2D5D3",
  muted: "5C6870",
  white: "FFFFFF"
} as const;

const argb = (hex: string) => `FF${hex}`;

export function calculateAttendanceAnalytics(snapshot: AttendanceSnapshot): AttendanceAnalytics {
  const registered = snapshot.totals.registered;
  const present = snapshot.totals.present;
  const batches = new Map<string, { registered: number; present: number }>();

  for (const guest of snapshot.entries) {
    const batch = guest.batch?.trim() || "Unassigned";
    const counts = batches.get(batch) ?? { registered: 0, present: 0 };
    counts.registered += 1;
    if (guest.status === "present") counts.present += 1;
    batches.set(batch, counts);
  }

  return {
    registered,
    present,
    pending: snapshot.totals.pending,
    attendanceRate: registered ? present / registered : 0,
    batches: [...batches.entries()]
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([batch, counts]) => ({
        batch,
        registered: counts.registered,
        present: counts.present,
        pending: counts.registered - counts.present,
        attendanceRate: counts.registered ? counts.present / counts.registered : 0
      }))
  };
}

function styleSectionTitle(cell: Cell) {
  cell.font = { name: "Aptos Display", size: 12, bold: true, color: { argb: argb(colors.charcoal) } };
  cell.border = { bottom: { style: "medium", color: { argb: argb(colors.gold) } } };
}

function styleTableHeader(row: Row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: argb(colors.white) } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(colors.charcoal) } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: argb(colors.gold) } } };
  });
}

function styleBody(row: Row, index: number) {
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, color: { argb: argb(colors.charcoal) } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "hair", color: { argb: argb(colors.line) } } };
    if (index % 2 === 0) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(colors.paper) } };
    }
  });
}

export async function buildAttendanceWorkbook(
  snapshot: AttendanceSnapshot,
  generatedAt: Date = new Date()
): Promise<Buffer> {
  const analytics = calculateAttendanceAnalytics(snapshot);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RV University Guest Attendance";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.subject = "Guest attendance analytics";
  workbook.title = "XLRI Alumni (Bengaluru) Get Together attendance report";

  const overview = workbook.addWorksheet("Overview", {
    properties: { tabColor: { argb: argb(colors.gold) } },
    views: [{ state: "frozen", ySplit: 9 }]
  });
  overview.columns = [
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 }
  ];
  overview.mergeCells("A1:E1");
  const title = overview.getCell("A1");
  title.value = "XLRI Alumni (Bengaluru) Get Together";
  title.font = { name: "Aptos Display", size: 20, bold: true, color: { argb: argb(colors.white) } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(colors.charcoal) } };
  title.alignment = { vertical: "middle" };
  overview.getRow(1).height = 38;

  overview.getCell("A2").value = "Report generated";
  overview.getCell("A2").font = { name: "Aptos", size: 9, bold: true, color: { argb: argb(colors.muted) } };
  overview.getCell("B2").value = generatedAt;
  overview.getCell("B2").numFmt = "dd mmm yyyy, hh:mm";
  overview.getCell("B2").font = { name: "Aptos", size: 10, color: { argb: argb(colors.charcoal) } };

  overview.getCell("A4").value = "Attendance overview";
  styleSectionTitle(overview.getCell("A4"));
  const summaryLabels = ["Registered guests", "Checked-in guests", "Pending guests", "Attendance rate"];
  const summaryValues: Array<number | string> = [
    analytics.registered,
    analytics.present,
    analytics.pending,
    analytics.attendanceRate
  ];
  summaryLabels.forEach((label, index) => {
    const column = index + 1;
    const labelCell = overview.getCell(5, column);
    labelCell.value = label;
    labelCell.font = { name: "Aptos", size: 9, bold: true, color: { argb: argb(colors.muted) } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(colors.paper) } };
    labelCell.alignment = { vertical: "middle", wrapText: true };

    const valueCell = overview.getCell(6, column);
    valueCell.value = summaryValues[index];
    valueCell.font = { name: "Aptos Display", size: 18, bold: true, color: { argb: argb(colors.charcoal) } };
    valueCell.border = { bottom: { style: "thin", color: { argb: argb(colors.gold) } } };
    valueCell.alignment = { vertical: "middle" };
    if (label === "Attendance rate") valueCell.numFmt = "0.0%";
  });
  overview.getRow(5).height = 32;
  overview.getRow(6).height = 36;

  overview.mergeCells("A8:E8");
  overview.getCell("A8").value = "Attendance by batch";
  styleSectionTitle(overview.getCell("A8"));
  const batchHeader = overview.getRow(9);
  batchHeader.values = ["Batch", "Registered", "Checked in", "Pending", "Attendance rate"];
  styleTableHeader(batchHeader);
  overview.autoFilter = {
    from: "A9",
    to: `E${Math.max(9, 9 + analytics.batches.length)}`
  };

  analytics.batches.forEach((batch, index) => {
    const row = overview.addRow([
      batch.batch,
      batch.registered,
      batch.present,
      batch.pending,
      batch.attendanceRate
    ]);
    styleBody(row, index);
    row.getCell(5).numFmt = "0.0%";
  });

  const attendees = workbook.addWorksheet("Attendee details", {
    properties: { tabColor: { argb: argb(colors.teal) } },
    views: [{ state: "frozen", ySplit: 1 }]
  });
  attendees.columns = [
    { header: "Guest name", key: "name", width: 34 },
    { header: "Batch", key: "batch", width: 18 },
    { header: "Check-in status", key: "status", width: 22 },
    { header: "Check-in time", key: "checkedInAt", width: 28 }
  ];
  styleTableHeader(attendees.getRow(1));
  attendees.autoFilter = {
    from: "A1",
    to: `D${Math.max(1, snapshot.entries.length + 1)}`
  };
  snapshot.entries.forEach((guest, index) => {
    const row = attendees.addRow({
      name: guest.name,
      batch: guest.batch || "Unassigned",
      status: guest.status === "present" ? "Present" : "Not checked in",
      checkedInAt: guest.checkedInAt ? new Date(guest.checkedInAt) : null
    });
    styleBody(row, index);
    const timeCell = row.getCell(4);
    timeCell.numFmt = "dd mmm yyyy, hh:mm";
    if (!guest.checkedInAt) timeCell.value = "";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
