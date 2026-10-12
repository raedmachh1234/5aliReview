import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/server/env";

/**
 * Supabase clients. All three are server-only:
 *  - user client: the signed-in user's JWT from cookies → RLS applies.
 *  - anon client: no session at all → can only call the public RPCs.
 *  - service client: bypasses RLS → maintenance/cron only, never request-driven reads.
 * Create a fresh client per request; never share one across requests.
 */

function requireConfig(): { url: string; anonKey: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return { url, anonKey };
}

/**
 * Auth cookies are only read on the server (no browser Supabase client), so
 * they can be httpOnly: injected scripts can't steal the session.
 */
const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export async function createUserClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireConfig();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS });
          }
        } catch {
          // Server Components can't set cookies. Safe to ignore as long as the
          // proxy/middleware refreshes the session on each request.
        }
      },
    },
  });
}

export function createAnonClient(): SupabaseClient {
  const { url, anonKey } = requireConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createServiceClient(): SupabaseClient {
  const { url } = requireConfig();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Whether a service-role key is available (e.g. for system audit entries). */
export function hasServiceRoleKey(): boolean {
  return Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}
