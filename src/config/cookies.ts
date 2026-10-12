/**
 * Cookie registry — the single source of truth used by the consent banner,
 * the cookie settings dialog and the Cookie Policy. If a cookie is not listed
 * here, the app must not set it.
 */
export type CookieCategory = "essential" | "preferences" | "analytics" | "marketing";

export interface CookieDefinition {
  name: string;
  category: CookieCategory;
  provider: string;
  purpose: string;
  duration: string;
}

export const CONSENT_COOKIE = "5ali_consent";
export const LOCALE_COOKIE = "5ali_lang";
export const DEMO_SESSION_COOKIE = "5ali_demo_session";
/** Bump when categories change so people are asked again. */
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182; // ~6 months

export const cookieRegistry: CookieDefinition[] = [
  {
    name: "sb-<project>-auth-token",
    category: "essential",
    provider: "5ali Review (Supabase Auth)",
    purpose: "Keeps business owners and admins signed in to the dashboard. Only set after you sign in.",
    duration: "Session; refreshed while you stay signed in",
  },
  {
    name: DEMO_SESSION_COOKIE,
    category: "essential",
    provider: "5ali Review",
    purpose: "Signs you in to the demo dashboard (demo mode only). Only set after you sign in.",
    duration: "8 hours",
  },
  {
    name: CONSENT_COOKIE,
    category: "essential",
    provider: "5ali Review",
    purpose: "Remembers your cookie choices so we don't ask on every page.",
    duration: "6 months",
  },
  {
    name: LOCALE_COOKIE,
    category: "preferences",
    provider: "5ali Review",
    purpose:
      "Remembers the language you picked. Without preference consent it is kept only until you close the browser.",
    duration: "1 year with consent; otherwise until the browser is closed",
  },
];

export const categoryInfo: Record<CookieCategory, { inUse: boolean; required: boolean }> = {
  essential: { inUse: true, required: true },
  preferences: { inUse: true, required: false },
  analytics: { inUse: false, required: false },
  marketing: { inUse: false, required: false },
};

export interface ConsentState {
  v: number;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of the choice. */
  at: string;
}

export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const text = raw.startsWith("%") ? decodeURIComponent(raw) : raw;
    const parsed = JSON.parse(text) as Partial<ConsentState>;
    if (parsed.v !== CONSENT_VERSION) return null;
    return {
      v: CONSENT_VERSION,
      preferences: parsed.preferences === true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      at: typeof parsed.at === "string" ? parsed.at : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}
