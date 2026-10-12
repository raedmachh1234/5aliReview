import { cookies } from "next/headers";
import { CONSENT_COOKIE, parseConsent } from "@/config/cookies";
import { getI18n } from "@/i18n/server";
import { saveConsentForm } from "@/server/consent";
import { Button } from "@/components/ui/button";

/** Cookie settings that work without JavaScript (target of the footer link fallback). */
export async function CookieSettingsForm() {
  const [{ t }, jar] = await Promise.all([getI18n(), cookies()]);
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value);
  return (
    <form action={saveConsentForm} className="mt-5 space-y-4">
      <div className="flex items-start gap-3">
        <input id="manage-essential" type="checkbox" checked disabled readOnly className="mt-1 size-5 accent-pine" />
        <label htmlFor="manage-essential" className="text-sm text-ink-2">
          <strong className="text-ink">{t.cookies.categories.essential.title}</strong> ({t.cookies.alwaysOn}) — {t.cookies.categories.essential.body}
        </label>
      </div>
      <div className="flex items-start gap-3">
        <input id="manage-preferences" name="preferences" type="checkbox" defaultChecked={consent?.preferences ?? false} className="mt-1 size-5 accent-pine" />
        <label htmlFor="manage-preferences" className="text-sm text-ink-2">
          <strong className="text-ink">{t.cookies.categories.preferences.title}</strong> — {t.cookies.categories.preferences.body}
        </label>
      </div>
      <p className="text-sm text-muted">
        {t.cookies.categories.analytics.title}: {t.cookies.notUsed}. {t.cookies.categories.marketing.title}: {t.cookies.notUsed}.
      </p>
      <Button type="submit">{t.cookies.save}</Button>
    </form>
  );
}
