import "server-only";
import { isDemoMode } from "@/server/env";
import { logger } from "./logger";

export interface RateLimitRule {
  /** Max requests per window. */
  max: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  feedback: { max: 10, windowSeconds: 60 },
  event: { max: 60, windowSeconds: 60 },
  login: { max: 8, windowSeconds: 300 },
  signup: { max: 5, windowSeconds: 3600 },
  contact: { max: 5, windowSeconds: 3600 },
  deletion: { max: 5, windowSeconds: 3600 },
  export: { max: 20, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

const memory = new Map<string, { windowStart: number; count: number }>();

/** In-process fixed window. Fine for dev/demo; production uses Postgres (shared across instances). */
export function memoryRateLimit(keyHash: string, rule: RateLimitRule, now = Date.now()): boolean {
  const windowStart = Math.floor(now / (rule.windowSeconds * 1000));
  const entry = memory.get(keyHash);
  if (!entry || entry.windowStart !== windowStart) {
    memory.set(keyHash, { windowStart, count: 1 });
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.windowStart !== windowStart) memory.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= rule.max;
}

/** Returns true when the request is allowed. Fails open on infrastructure errors (logged). */
export async function rateLimit(keyHash: string, rule: RateLimitRule): Promise<boolean> {
  if (isDemoMode) return memoryRateLimit(keyHash, rule);
  try {
    const { createAnonClient } = await import("@/server/supabase/clients");
    const { data, error } = await createAnonClient().rpc("check_rate_limit", {
      p_key_hash: keyHash,
      p_window_seconds: rule.windowSeconds,
      p_max: rule.max,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    logger.error("rate_limit_unavailable", err);
    return memoryRateLimit(keyHash, rule);
  }
}

export function resetMemoryRateLimits(): void {
  memory.clear();
}
