import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { normalizeName } from "./normalize";
import type {
  AttendanceRecord,
  CheckInResult,
  DashboardEntry,
  Guest
} from "./types";

const rosterPath = () => path.join(process.cwd(), "data", "guests.json");
const dataDirectory = () =>
  process.env.ATTENDANCE_DATA_DIR || path.join(process.cwd(), "data");
const attendancePath = () => path.join(dataDirectory(), "attendance.json");
const attendanceBlobPath = (guestId: string) => `attendance/${guestId}.json`;
const usesBlobStorage = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

let writeQueue: Promise<void> = Promise.resolve();

function isGuest(value: unknown): value is Guest {
  if (!value || typeof value !== "object") return false;
  const guest = value as Record<string, unknown>;
  return ["id", "name"].every(
    (key) => typeof guest[key] === "string" && Boolean((guest[key] as string).trim())
  ) && (guest.batch === undefined || guest.batch === null || typeof guest.batch === "string");
}

function isAttendanceRecord(value: unknown): value is AttendanceRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.guestId === "string" &&
    typeof record.checkedInAt === "string" &&
    !Number.isNaN(Date.parse(record.checkedInAt))
  );
}

async function readJson(filePath: string) {
  const source = await fs.readFile(filePath, "utf8");
  return JSON.parse(source) as unknown;
}

export async function getRoster(): Promise<Guest[]> {
  const parsed = await readJson(rosterPath());
  if (!Array.isArray(parsed) || !parsed.every(isGuest)) {
    throw new Error("The guest roster must be an array of id and name entries.");
  }

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const roster = parsed.map((guest) => ({
    id: guest.id.trim(),
    name: guest.name.trim(),
    batch: typeof guest.batch === "string" ? guest.batch.trim() || null : null
  }));

  for (const guest of roster) {
    const nameKey = normalizeName(guest.name);
    if (seenIds.has(guest.id) || seenNames.has(nameKey)) {
      throw new Error("Guest IDs and names must be unique.");
    }
    seenIds.add(guest.id);
    seenNames.add(nameKey);
  }

  return roster;
}

async function getLocalAttendance(): Promise<AttendanceRecord[]> {
  try {
    const parsed = await readJson(attendancePath());
    if (!Array.isArray(parsed) || !parsed.every(isAttendanceRecord)) {
      throw new Error("Attendance file is malformed.");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(dataDirectory(), { recursive: true });
      await writeLocalAttendance([]);
      return [];
    }
    throw error;
  }
}

async function writeLocalAttendance(records: AttendanceRecord[]) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  const destination = attendancePath();
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await fs.rename(temporary, destination);
}

async function readBlobAttendance(guestId: string): Promise<AttendanceRecord | null> {
  const result = await get(attendanceBlobPath(guestId), {
    access: "private",
    useCache: false
  });

  if (!result || result.statusCode !== 200) return null;
  const parsed = (await new Response(result.stream).json()) as unknown;
  if (!isAttendanceRecord(parsed) || parsed.guestId !== guestId) {
    throw new Error("Attendance record in Blob storage is malformed.");
  }
  return parsed;
}

async function getBlobAttendance(roster: Guest[]): Promise<AttendanceRecord[]> {
  const records = await Promise.all(
    roster.map((guest) => readBlobAttendance(guest.id))
  );
  return records.filter((record): record is AttendanceRecord => Boolean(record));
}

async function getAttendance(roster: Guest[]): Promise<AttendanceRecord[]> {
  return usesBlobStorage() ? getBlobAttendance(roster) : getLocalAttendance();
}

async function serializeWrite<T>(work: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

export async function listBatches(): Promise<string[]> {
  const roster = await getRoster();
  return [...new Set(roster.map((guest) => guest.batch).filter((batch): batch is string => Boolean(batch)))].sort(
    (a, b) => a.localeCompare(b)
  );
}

export async function searchGuests(query?: string) {
  const normalizedQuery = query ? normalizeName(query) : "";
  if (!normalizedQuery) return [];
  const roster = await getRoster();
  return roster
    .filter((guest) => normalizeName(guest.name).includes(normalizedQuery))
    .slice(0, 3);
}

export async function checkIn(guestId: string): Promise<CheckInResult> {
  const roster = await getRoster();
  const guest = roster.find((entry) => entry.id === guestId);
  if (!guest) return { status: "not_found" };

  if (usesBlobStorage()) {
    const existing = await readBlobAttendance(guest.id);
    if (existing) {
      return {
        status: "already_checked_in",
        guest,
        checkedInAt: existing.checkedInAt
      };
    }

    const checkedInAt = new Date().toISOString();
    try {
      await put(
        attendanceBlobPath(guest.id),
        JSON.stringify({ guestId: guest.id, checkedInAt }),
        {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json"
        }
      );
    } catch (error) {
      // A competing request may have created the guest's one permitted record.
      const winner = await readBlobAttendance(guest.id);
      if (winner) {
        return {
          status: "already_checked_in",
          guest,
          checkedInAt: winner.checkedInAt
        };
      }
      throw error;
    }

    return { status: "checked_in", guest, checkedInAt };
  }

  return serializeWrite(async () => {
    const attendance = await getLocalAttendance();
    const existing = attendance.find((entry) => entry.guestId === guest.id);
    if (existing) {
      return {
        status: "already_checked_in",
        guest,
        checkedInAt: existing.checkedInAt
      };
    }

    const checkedInAt = new Date().toISOString();
    await writeLocalAttendance([...attendance, { guestId: guest.id, checkedInAt }]);
    return { status: "checked_in", guest, checkedInAt };
  });
}

export async function getDashboard(query?: string) {
  const roster = await getRoster();
  const attendance = await getAttendance(roster);
  const attendanceByGuest = new Map(
    attendance.map((record) => [record.guestId, record.checkedInAt])
  );
  const normalizedQuery = query ? normalizeName(query) : "";

  const entries: DashboardEntry[] = roster
    .filter(
      (guest) =>
        (!normalizedQuery || normalizeName(guest.name).includes(normalizedQuery))
    )
    .map((guest) => {
      const checkedInAt = attendanceByGuest.get(guest.id) ?? null;
      return {
        ...guest,
        batch: guest.batch ?? null,
        checkedInAt,
        status: checkedInAt ? ("present" as const) : ("pending" as const)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const batches = new Map<string, { registered: number; present: number }>();
  for (const guest of roster) {
    if (!guest.batch) continue;
    const progress = batches.get(guest.batch) ?? { registered: 0, present: 0 };
    progress.registered += 1;
    if (attendanceByGuest.has(guest.id)) progress.present += 1;
    batches.set(guest.batch, progress);
  }

  const batchProgress = [...batches.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([batch, progress]) => ({
      batch,
      registered: progress.registered,
      present: progress.present,
      pending: progress.registered - progress.present,
      percentage: progress.registered ? Math.round((progress.present / progress.registered) * 100) : 0
    }));

  const present = roster.filter((guest) => attendanceByGuest.has(guest.id)).length;

  return {
    totals: {
      registered: roster.length,
      present,
      pending: roster.length - present
    },
    unassigned: roster.filter((guest) => !guest.batch).length,
    batchProgress,
    entries
  };
}

export async function clearAttendance(): Promise<void> {
  const roster = await getRoster();

  if (usesBlobStorage()) {
    if (roster.length === 0) return;
    await del(roster.map((guest) => attendanceBlobPath(guest.id)));
    return;
  }

  await serializeWrite(() => writeLocalAttendance([]));
}
