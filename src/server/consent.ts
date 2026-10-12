"use server";

import { cookies } from "next/headers";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, CONSENT_VERSION, LOCALE_COOKIE, type ConsentState } from "@/config/cookies";
import { isLocale } from "@/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/**
 * Stores the visitor's cookie choices. Only "preferences" is an active
 * optional category today; analytics/marketing are recorded as false because
 * no such cookies exist. Withdrawing consent takes effect immediately.
 */
export async function saveConsent(choice: { preferences: boolean }): Promise<ConsentState> {
  const jar = await cookies();
  const state: ConsentState = {
    v: CONSENT_VERSION,
    preferences: choice.preferences === true,
    analytics: false,
    marketing: false,
    at: new Date().toISOString(),
  };
  // Next encodes cookie values itself.
  jar.set(CONSENT_COOKIE, JSON.stringify(state), { ...baseCookie, maxAge: CONSENT_MAX_AGE_SECONDS });

  // Re-issue the language cookie to match the new choice (persistent vs. session-only).
  const lang = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(lang)) {
    jar.set(LOCALE_COOKIE, lang, state.preferences ? { ...baseCookie, maxAge: ONE_YEAR } : baseCookie);
  }
  return state;
}

/** Form-action variant so cookie settings work without JavaScript (Cookie Policy page). */
export async function saveConsentForm(formData: FormData): Promise<void> {
  await saveConsent({ preferences: formData.get("preferences") === "on" });
}

