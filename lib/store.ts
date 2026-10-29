import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
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
const additionalGuestsPath = () => path.join(dataDirectory(), "additional-guests.json");
const attendanceBlobPath = (guestId: string) => `attendance/${guestId}.json`;
const additionalGuestBlobPrefix = "additional-guests/";
const additionalGuestBlobPath = (guestId: string) => `${additionalGuestBlobPrefix}${guestId}.json`;
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

function normalizeBatch(value: string) {
  return value.trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").toLocaleLowerCase();
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

async function getLocalAdditionalGuests(): Promise<Guest[]> {
  try {
    const parsed = await readJson(additionalGuestsPath());
    if (
      !Array.isArray(parsed) ||
      !parsed.every(isGuest) ||
      parsed.some((guest) => typeof guest.batch !== "string" || !guest.batch.trim())
    ) {
      throw new Error("Additional guest file is malformed.");
    }
    return parsed.map((guest) => ({
      id: guest.id.trim(),
      name: guest.name.trim(),
      batch: guest.batch!.trim()
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalAdditionalGuests(guests: Guest[]) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  const destination = additionalGuestsPath();
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(guests, null, 2)}\n`, "utf8");
  await fs.rename(temporary, destination);
}

async function readBlobAdditionalGuest(guestId: string): Promise<Guest | null> {
  const result = await get(additionalGuestBlobPath(guestId), {
    access: "private",
    useCache: false
  });
  if (!result || result.statusCode !== 200) return null;

  const parsed = (await new Response(result.stream).json()) as unknown;
  if (!isGuest(parsed) || parsed.id !== guestId || typeof parsed.batch !== "string" || !parsed.batch.trim()) {
    throw new Error("Additional guest record in Blob storage is malformed.");
  }
  return { id: parsed.id, name: parsed.name.trim(), batch: parsed.batch.trim() };
}

async function getBlobAdditionalGuests(): Promise<Guest[]> {
  const pathnames: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: additionalGuestBlobPrefix, limit: 1000, cursor });
    pathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const guests = await Promise.all(pathnames.map(async (pathname) => {
    const guestId = pathname.slice(additionalGuestBlobPrefix.length).replace(/\.json$/, "");
    return readBlobAdditionalGuest(guestId);
  }));
  return guests.filter((guest): guest is Guest => Boolean(guest));
}

async function getAdditionalGuests(): Promise<Guest[]> {
  return usesBlobStorage() ? getBlobAdditionalGuests() : getLocalAdditionalGuests();
}

async function getAllGuests(): Promise<Guest[]> {
  const [roster, additionalGuests] = await Promise.all([getRoster(), getAdditionalGuests()]);
  return [...roster, ...additionalGuests];
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
  const guests = await getAllGuests();
  return [...new Set(guests.map((guest) => guest.batch).filter((batch): batch is string => Boolean(batch)))].sort(
    (a, b) => a.localeCompare(b)
  );
}

export async function searchGuests(query?: string) {
  const normalizedQuery = query ? normalizeName(query) : "";
  if (!normalizedQuery) return [];
  const guests = await getAllGuests();
  return guests
    .filter((guest) => normalizeName(guest.name).includes(normalizedQuery))
    .slice(0, 3);
}

export async function checkIn(guestId: string): Promise<CheckInResult> {
  const guests = await getAllGuests();
  const guest = guests.find((entry) => entry.id === guestId);
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

export async function registerGuestAndCheckIn(nameInput: string, batchInput: string): Promise<CheckInResult> {
  const name = nameInput.trim().replace(/\s+/g, " ");
  const batch = batchInput.trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
  const normalizedName = normalizeName(name);
  const normalizedBatch = normalizeBatch(batch);
  const guests = await getAllGuests();

  const exactAdditionalGuest = guests.find(
    (guest) => guest.id.startsWith("extra-") && normalizeName(guest.name) === normalizedName && normalizeBatch(guest.batch ?? "") === normalizedBatch
  );
  const existingRosterGuest = guests.find(
    (guest) =>
      !guest.id.startsWith("extra-") &&
      normalizeName(guest.name) === normalizedName &&
      normalizeBatch(guest.batch ?? "") === normalizedBatch
  );
  let guest = exactAdditionalGuest ?? existingRosterGuest;

  if (!guest) {
    const digest = createHash("sha256")
      .update(`${normalizedName}\0${normalizedBatch}`)
      .digest("hex")
      .slice(0, 32);
    guest = { id: `extra-${digest}`, name, batch };

    if (usesBlobStorage()) {
      try {
        await put(additionalGuestBlobPath(guest.id), JSON.stringify(guest), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: "application/json"
        });
      } catch (error) {
        const existing = await readBlobAdditionalGuest(guest.id);
        if (
          !existing ||
          normalizeName(existing.name) !== normalizedName ||
          normalizeBatch(existing.batch ?? "") !== normalizedBatch
        ) {
          throw error;
        }
        guest = existing;
      }
    } else {
      await serializeWrite(async () => {
        const additionalGuests = await getLocalAdditionalGuests();
        const existing = additionalGuests.find(
          (entry) => normalizeName(entry.name) === normalizedName && normalizeBatch(entry.batch ?? "") === normalizedBatch
        );
        if (existing) {
          guest = existing;
        } else {
          await writeLocalAdditionalGuests([...additionalGuests, guest!]);
        }
      });
    }
  }

  return checkIn(guest.id);
}

export async function getDashboard(query?: string) {
  const guests = await getAllGuests();
  const attendance = await getAttendance(guests);
  const attendanceByGuest = new Map(
    attendance.map((record) => [record.guestId, record.checkedInAt])
  );
  const normalizedQuery = query ? normalizeName(query) : "";

  const entries: DashboardEntry[] = guests
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
  for (const guest of guests) {
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

  const present = guests.filter((guest) => attendanceByGuest.has(guest.id)).length;

  return {
    totals: {
      registered: guests.length,
      present,
      pending: guests.length - present
    },
    unassigned: guests.filter((guest) => !guest.batch).length,
    batchProgress,
    entries
  };
}

export async function clearAttendance(): Promise<void> {
  const guests = await getAllGuests();

  if (usesBlobStorage()) {
    if (guests.length === 0) return;
    await del(guests.map((guest) => attendanceBlobPath(guest.id)));
    return;
  }

  await serializeWrite(() => writeLocalAttendance([]));
}
