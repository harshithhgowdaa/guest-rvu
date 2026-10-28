import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "attendance_staff";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

type SessionPayload = { expiresAt: number };

const encoded = (value: string) => Buffer.from(value).toString("base64url");
const decoded = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export function hashStaffCode(code: string, salt: string) {
  return scryptSync(code, salt, 64).toString("base64");
}

export function verifyStaffCode(code: string) {
  const configured = process.env.STAFF_ACCESS_CODE_HASH;
  if (!configured) return false;
  const [salt, expected] = configured.split(":");
  if (!salt || !expected) return false;
  const actual = Buffer.from(hashStaffCode(code, salt), "base64");
  const expectedBuffer = Buffer.from(expected, "base64");
  return (
    actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
  );
}

function sessionSecret() {
  return process.env.STAFF_SESSION_SECRET || "";
}

export function createStaffSession() {
  const payload: SessionPayload = { expiresAt: Date.now() + SESSION_DURATION_MS };
  const encodedPayload = encoded(JSON.stringify(payload));
  const signature = createHmac("sha256", sessionSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function isValidStaffSession(value: string | undefined) {
  if (!value || !sessionSecret()) return false;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return false;
  const expected = createHmac("sha256", sessionSecret())
    .update(encodedPayload)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }
  try {
    const payload = JSON.parse(decoded(encodedPayload)) as SessionPayload;
    return typeof payload.expiresAt === "number" && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export const staffCookieName = COOKIE_NAME;
export const staffSessionMaxAge = SESSION_DURATION_MS / 1000;
