import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Actor } from "@/lib/types";
import { DEMO_SESSION_COOKIE } from "@/config/cookies";
import { isDemoMode } from "@/server/env";
import { verifyDemoSessionToken } from "./demo-session";

export interface SessionUser extends Actor {
  fullName: string | null;
}

/**
 * The signed-in user for this request, or null. Cached per request.
 * `isPlatformAdmin` is always read from the database/store, never from a
 * client-controlled value.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (isDemoMode) {
    const userId = verifyDemoSessionToken((await cookies()).get(DEMO_SESSION_COOKIE)?.value);
    if (!userId) return null;
    const { getDemoUser } = await import("@/server/data/demo");
    const user = getDemoUser(userId);
    return user ? { userId: user.id, email: user.email, fullName: user.fullName, isPlatformAdmin: user.isPlatformAdmin } : null;
  }

  const { createUserClient } = await import("@/server/supabase/clients");
  const supabase = await createUserClient();
  // getUser() validates the JWT with Supabase Auth (getSession() would trust the cookie).
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_platform_admin")
    .eq("id", data.user.id)
    .maybeSingle<{ full_name: string | null; is_platform_admin: boolean }>();
  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    fullName: profile?.full_name ?? null,
    isPlatformAdmin: profile?.is_platform_admin === true,
  };
});
