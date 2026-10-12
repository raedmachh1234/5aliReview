import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/server/env";
import { getRepository } from "@/server/data";
import { createBusinessFor } from "@/server/onboarding";
import { logger } from "@/server/security/logger";

/**
 * Supabase email-confirmation landing. Exchanges the one-time code for a
 * session, then creates the business the owner named at sign-up (stored in
 * user metadata until the email address was confirmed).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const fail = new URL("/login", request.url);
  if (isDemoMode || !code) return NextResponse.redirect(fail, 303);

  try {
    const { createUserClient } = await import("@/server/supabase/clients");
    const supabase = await createUserClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return NextResponse.redirect(fail, 303);

    const pending = data.user.user_metadata?.pending_business_name;
    if (typeof pending === "string" && pending.trim().length >= 2) {
      const actor = { userId: data.user.id, email: data.user.email ?? "", isPlatformAdmin: false };
      const repo = await getRepository();
      if ((await repo.listMemberships(actor)).length === 0) {
        await createBusinessFor(actor, pending.trim().slice(0, 120));
      }
      await supabase.auth.updateUser({ data: { pending_business_name: null } });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  } catch (err) {
    logger.error("auth_callback_failed", err);
    return NextResponse.redirect(fail, 303);
  }
}
