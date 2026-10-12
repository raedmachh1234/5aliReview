import { cookies } from "next/headers";
import { categoryInfo, CONSENT_COOKIE, parseConsent } from "@/config/cookies";
import { getI18n } from "@/i18n/server";
import { CookieConsent } from "./cookie-consent";

/** Server wrapper: reads the stored choice and passes translated strings down. */
export async function ConsentRoot() {
  const [{ t }, jar] = await Promise.all([getI18n(), cookies()]);
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value);
  return (
    <CookieConsent
      t={{ ...t.cookies, close: t.common.close }}
      initial={consent ? { preferences: consent.preferences } : null}
      inUse={{
        essential: categoryInfo.essential.inUse,
        preferences: categoryInfo.preferences.inUse,
        analytics: categoryInfo.analytics.inUse,
        marketing: categoryInfo.marketing.inUse,
      }}
    />
  );
}
