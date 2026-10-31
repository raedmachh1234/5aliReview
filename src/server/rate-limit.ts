import "server-only";
import { headers } from "next/headers";

/**
 * In-process fixed-window limiter for the login form. Keys live only in
 * memory and are never written anywhere.
 */
const windows = new Map<string, { start: number; count: number }>();

export function hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const entry = windows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 5_000) {
      for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
