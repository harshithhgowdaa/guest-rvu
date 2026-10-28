import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("a missing attendance file is created and concurrent check-ins remain idempotent", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "attendance-test-"));
  process.env.ATTENDANCE_DATA_DIR = directory;
  const { checkIn, getDashboard } = await import("../lib/store");

  const results = await Promise.all(Array.from({ length: 5 }, () => checkIn("guest-001")));
  assert.equal(results.filter((result) => result.status === "checked_in").length, 1);
  assert.equal(results.filter((result) => result.status === "already_checked_in").length, 4);

  const records = JSON.parse(await readFile(path.join(directory, "attendance.json"), "utf8"));
  assert.equal(records.length, 1);
  const dashboard = await getDashboard();
  assert.equal(dashboard.totals.present, 1);
});
