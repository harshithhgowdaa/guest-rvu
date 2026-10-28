import assert from "node:assert/strict";
import test from "node:test";
import { createStaffSession, hashStaffCode, isValidStaffSession, verifyStaffCode } from "../lib/auth";

test("staff code hashes and signed sessions verify correctly", () => {
  const salt = "test-salt";
  process.env.STAFF_ACCESS_CODE_HASH = `${salt}:${hashStaffCode("correct-code", salt)}`;
  process.env.STAFF_SESSION_SECRET = "a-long-test-secret";

  assert.equal(verifyStaffCode("correct-code"), true);
  assert.equal(verifyStaffCode("wrong-code"), false);
  assert.equal(isValidStaffSession(createStaffSession()), true);
  assert.equal(isValidStaffSession("not-a-session"), false);
});
