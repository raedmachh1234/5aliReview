import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getIpHashSalt } from "@/server/env";

/**
 * Client IPs are never stored. For rate limiting we use a salted SHA-256
 * hash, rotated daily (the date is part of the input), kept at most 1 day.
 */
export function clientIpFrom(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export function hashKey(...parts: string[]): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update([getIpHashSalt(), day, ...parts].join("|")).digest("hex");
}

export async function requestIpHash(scope: string): Promise<string> {
  return hashKey(scope, clientIpFrom(await headers()));
}

/**
 * CSRF defence for route handlers that change state: the Origin (or Referer)
 * must match the Host. Server Actions get the same check from Next.js.
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!host || !origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
