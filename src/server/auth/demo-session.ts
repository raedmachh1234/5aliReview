import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDemoSessionSecret } from "@/server/env";

/**
 * Demo-mode session token: base64url(payload).base64url(HMAC-SHA256).
 * Stored in an HttpOnly, SameSite=Lax, Secure (in production) cookie.
 * The payload holds only the user id and expiry — roles are re-read from
 * the store on every request so revocations apply immediately.
 */
export const DEMO_SESSION_TTL_SECONDS = 8 * 60 * 60;

interface Payload {
  uid: string;
  exp: number;
}

function sign(data: string): string {
  return createHmac("sha256", getDemoSessionSecret()).update(data).digest("base64url");
}

export function createDemoSessionToken(userId: string, now = Date.now()): string {
  const payload: Payload = { uid: userId, exp: Math.floor(now / 1000) + DEMO_SESSION_TTL_SECONDS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyDemoSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < now) return null;
    return payload.uid;
  } catch {
    return null;
  }
}
