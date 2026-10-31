import "server-only";
import { z } from "zod";

/**
 * Server-side environment. `server-only` makes the build fail if a Client
 * Component imports this, so secrets never reach the browser bundle.
 */
/** Empty strings (e.g. copied from .env.example) count as "not set". */
const opt = <T extends z.ZodTypeAny>(inner: T) => z.preprocess((v) => (v === "" ? undefined : v), inner.optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: opt(z.url()),
  ADMIN_PASSWORD: opt(z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters")),
  SESSION_SECRET: opt(z.string().min(32, "SESSION_SECRET must be at least 32 characters")),
  DATA_DIR: opt(z.string()),
  SUPABASE_URL: opt(z.url()),
  SUPABASE_SERVICE_ROLE_KEY: opt(z.string().min(20)),
  GOOGLE_SITE_VERIFICATION: opt(z.string().regex(/^[\w-]+$/, "GOOGLE_SITE_VERIFICATION must be the code only")),
  // Set automatically by Vercel (production domain, without https://).
  VERCEL_PROJECT_PRODUCTION_URL: opt(z.string()),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Log variable names and rules only — never values.
  console.error("Invalid environment variables:", z.prettifyError(parsed.error));
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";

export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
