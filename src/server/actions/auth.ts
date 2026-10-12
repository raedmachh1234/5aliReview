"use server";

import { newUnsubscribeToken } from "@/server/email";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_SESSION_COOKIE } from "@/config/cookies";
import { siteConfig } from "@/config/site";
import { echoValues, fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { loginSchema, signupSchema } from "@/lib/validation";
import { getRepository, ConflictError } from "@/server/data";
import { createBusinessFor } from "@/server/onboarding";
import { isDemoMode } from "@/server/env";
import { createDemoSessionToken, DEMO_SESSION_TTL_SECONDS } from "@/server/auth/demo-session";
import { clientIpFrom, hashKey } from "@/server/security/request";
import { rateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { logger } from "@/server/security/logger";
import type { Actor } from "@/lib/types";

/** Only same-site relative paths are accepted as post-login destinations (no open redirect). */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const next = typeof value === "string" ? value : "";
  return /^\/(?!\/|\\)[\w\-/?=&%.]*$/.test(next) ? next : fallback;
}

async function setDemoSession(userId: string) {
  (await cookies()).set(DEMO_SESSION_COOKIE, createDemoSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  });
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, ["email"]);
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  const { email, password } = parsed.data;

  const ip = clientIpFrom(await headers());
  if (!(await rateLimit(hashKey("login", ip, email), RATE_LIMITS.login))) {
    return { status: "error", message: "errors.rateLimited", values };
  }

  let isAdmin = false;
  try {
    if (isDemoMode) {
      const { verifyDemoCredentials } = await import("@/server/data/demo");
      const user = await verifyDemoCredentials(email, password);
      if (!user) return { status: "error", message: "auth.invalidCredentials", values };
      await setDemoSession(user.id);
      isAdmin = user.isPlatformAdmin;
    } else {
      const { createUserClient } = await import("@/server/supabase/clients");
      const supabase = await createUserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      // Same message for unknown email and wrong password (no account enumeration).
      if (error || !data.user) return { status: "error", message: "auth.invalidCredentials", values };
      const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", data.user.id).maybeSingle();
      isAdmin = profile?.is_platform_admin === true;
    }
  } catch (err) {
    logger.error("sign_in_failed", err);
    return { status: "error", message: "errors.generic", values };
  }
  redirect(safeNext(formData.get("next"), isAdmin ? "/admin" : "/dashboard"));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, ["fullName", "email", "businessName"]);
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    businessName: formData.get("businessName"),
    acceptTerms: formData.get("acceptTerms") ?? undefined,
    marketingOptIn: formData.get("marketingOptIn") ?? undefined,
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  const { fullName, email, password, businessName, marketingOptIn } = parsed.data;

  if (!(await rateLimit(hashKey("signup", clientIpFrom(await headers())), RATE_LIMITS.signup))) {
    return { status: "error", message: "errors.rateLimited", values };
  }

  try {
    const repo = await getRepository();
    let actor: Actor | null = null;

    if (isDemoMode) {
      const { createDemoUser } = await import("@/server/data/demo");
      const { hashPassword } = await import("@/server/data/demo/seed");
      try {
        const user = createDemoUser({ email, fullName, passwordHash: hashPassword(password) });
        actor = { userId: user.id, email: user.email, isPlatformAdmin: false };
      } catch (err) {
        if (err instanceof ConflictError) return { status: "error", fieldErrors: { email: "validation.taken" }, values };
        throw err;
      }
    } else {
      const { createUserClient } = await import("@/server/supabase/clients");
      const supabase = await createUserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteConfig.url}/auth/callback`,
          // The business is created after the email is confirmed (see /auth/callback).
          data: { full_name: fullName, pending_business_name: businessName },
        },
      });
      if (error) {
        logger.warn("sign_up_rejected", { code: error.code });
        return { status: "error", message: "errors.generic", values };
      }
      if (data.session && data.user) actor = { userId: data.user.id, email, isPlatformAdmin: false };
    }

    if (marketingOptIn) {
      // Separate, explicit opt-in. Only a hash is stored; a fresh token is issued (and the
      // hash replaced) whenever a marketing email is actually sent — see server/email.
      await repo.subscribeMarketing({ email, source: "signup", tokenHash: newUnsubscribeToken().tokenHash });
    }

    if (!actor) return { status: "success", message: "auth.checkEmail" };

    await createBusinessFor(actor, businessName);
    if (isDemoMode) await setDemoSession(actor.userId);
  } catch (err) {
    logger.error("sign_up_failed", err);
    return { status: "error", message: "errors.generic", values };
  }
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  if (isDemoMode) {
    (await cookies()).delete(DEMO_SESSION_COOKIE);
  } else {
    const { createUserClient } = await import("@/server/supabase/clients");
    await (await createUserClient()).auth.signOut();
  }
  redirect("/login?signedOut=1");
}
