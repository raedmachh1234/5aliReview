import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin session token: base64url(payload).base64url(HMAC-SHA256).
 * The signing key is derived from the session secret *and* the admin
 * password, so changing ADMIN_PASSWORD signs every existing session out.
 *
 * No `server-only` import: the proxy uses this module too.
 */
export const SESSION_COOKIE = "store_admin";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

interface Payload {
  sub: "admin";
  exp: number;
}

export function sessionKey(secret: string, password: string): Buffer {
  return createHash("sha256").update(`${secret}\u0000${password}`).digest();
}

function sign(data: string, key: Buffer): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function createSessionToken(key: Buffer, now = Date.now()): string {
  const payload: Payload = { sub: "admin", exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, key)}`;
}

export function verifySessionToken(token: string | undefined, key: Buffer, now = Date.now()): boolean {
  if (!token) return false;
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra !== undefined) return false;
  const expected = Buffer.from(sign(data, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp * 1000 > now;
  } catch {
    return false;
  }
}

/** Constant-time password comparison (hashing first makes the lengths equal). */
export function passwordMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const DEV_PASSWORD = "admin";
const DEV_SECRET = "dev-only-insecure-session-secret-change-me-0123456789";

/**
 * Reads the admin credentials from process.env. In development they fall back
 * to a well-known password so the panel works out of the box; in production
 * both must be set or the admin area stays locked.
 */
export function resolveAdminCredentials(e: NodeJS.ProcessEnv = process.env): { password: string; key: Buffer } | null {
  const production = e.NODE_ENV === "production";
  const password = e.ADMIN_PASSWORD || (production ? "" : DEV_PASSWORD);
  const secret = e.SESSION_SECRET || (production ? "" : DEV_SECRET);
  if (!password || !secret) return null;
  return { password, key: sessionKey(secret, password) };
}

export function isUsingDevPassword(e: NodeJS.ProcessEnv = process.env): boolean {
  return e.NODE_ENV !== "production" && !e.ADMIN_PASSWORD;
}
