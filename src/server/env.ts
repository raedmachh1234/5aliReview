import "server-only";
import { z } from "zod";

/**
 * Server-side environment. Never import this file from a Client Component —
 * `server-only` makes the build fail if that happens, so secrets such as the
 * service-role key can't leak into the browser bundle.
 */
/** Empty strings (e.g. copied from .env.example) count as "not set". */
const opt = <T extends z.ZodTypeAny>(inner: T) => z.preprocess((v) => (v === "" ? undefined : v), inner.optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: opt(z.url()),
  NEXT_PUBLIC_SUPABASE_URL: opt(z.url()),
  SUPABASE_ANON_KEY: opt(z.string().min(20)),
  SUPABASE_SERVICE_ROLE_KEY: opt(z.string().min(20)),
  CRON_SECRET: opt(z.string().min(24)),
  IP_HASH_SALT: opt(z.string().min(16)),
  DEMO_SESSION_SECRET: opt(z.string().min(32)),
  ALLOW_DEMO_MODE: opt(z.enum(["true", "false"])),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Log variable names only — never values.
  console.error("Invalid environment variables:", Object.keys(z.flattenError(parsed.error).fieldErrors).join(", "));
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export const isSupabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_ANON_KEY);

/**
 * Demo mode = no Supabase credentials. In production it must be switched on
 * explicitly so a misconfigured deployment never silently serves demo data.
 */
export const isDemoMode = !isSupabaseConfigured;

export function assertDemoModeAllowed(): void {
  if (isDemoMode && env.NODE_ENV === "production" && env.ALLOW_DEMO_MODE !== "true") {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ANON_KEY, or ALLOW_DEMO_MODE=true for a demo deployment.",
    );
  }
}

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me-0123456789abcdef";

export function getDemoSessionSecret(): string {
  if (env.DEMO_SESSION_SECRET) return env.DEMO_SESSION_SECRET;
  if (env.NODE_ENV === "production") throw new Error("DEMO_SESSION_SECRET is required in production demo mode");
  return DEV_FALLBACK_SECRET;
}

export function getIpHashSalt(): string {
  if (env.IP_HASH_SALT) return env.IP_HASH_SALT;
  if (env.NODE_ENV === "production") throw new Error("IP_HASH_SALT is required in production");
  return DEV_FALLBACK_SECRET;
}
