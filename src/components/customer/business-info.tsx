import Link from "next/link";
import type { Locale, PublicBusiness } from "@/lib/types";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/brand/logo";
import { fmt, locales } from "@/i18n/config";

/** Logo + name. Only shows what the business actually provided. */
export function BusinessHeader({ business, demoLabel }: { business: PublicBusiness; demoLabel: string }) {
  const initials = business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <header className="flex flex-col items-center text-center">
      {business.logoUrl ? (
        // Business logos come from Supabase Storage or demo assets; a plain <img> avoids
        // routing user uploads through the image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={business.logoUrl}
          alt={business.logoAlt || business.name}
          width={72}
          height={72}
          className="size-[72px] rounded-2xl border border-line bg-surface object-contain p-1.5 shadow-sm"
        />
      ) : (
        <span aria-hidden="true" className="grid size-[72px] place-items-center rounded-2xl bg-[var(--brand)] text-2xl font-extrabold text-white shadow-sm">
          {initials}
        </span>
      )}
      <p className="mt-3 text-lg font-bold text-ink">
        {business.name}
        {business.location ? <span className="font-medium text-muted"> · {business.location.name}</span> : null}
      </p>
      {business.isDemo ? (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn-soft px-3 py-1 text-xs font-semibold text-warn">
          <Icon name="info" size={14} />
          {demoLabel}
        </p>
      ) : null}
    </header>
  );
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Optional business details, collapsed so the rating stays on the first screen. */
export function BusinessDetails({ business, t }: { business: PublicBusiness; t: Dictionary["customer"] }) {
  const address = business.location?.address || business.address;
  const phone = business.location?.phone || business.phone;
  const hours = DAY_KEYS.filter((d) => business.openingHours[d]);
  const socials = Object.entries(business.socialLinks).filter(([, url]) => url);
  const hasAny = business.description || address || phone || business.website || hours.length || socials.length;
  if (!hasAny) return null;

  return (
    <details className="group mt-5 rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {fmt(t.about, { business: business.name })}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-4 border-t border-line px-5 py-4 text-sm text-ink-2">
        {business.description ? <p>{business.description}</p> : null}
        <dl className="space-y-3">
          {address ? (
            <div className="flex gap-3">
              <dt className="shrink-0">
                <Icon name="pin" size={18} className="text-muted" />
                <span className="sr-only">{t.address}</span>
              </dt>
              <dd>{address}</dd>
            </div>
          ) : null}
          {phone ? (
            <div className="flex gap-3">
              <dt className="shrink-0">
                <Icon name="phone" size={18} className="text-muted" />
                <span className="sr-only">{t.phone}</span>
              </dt>
              <dd>
                <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} className="underline underline-offset-4" dir="ltr">
                  {phone}
                </a>
              </dd>
            </div>
          ) : null}
          {business.website ? (
            <div className="flex gap-3">
              <dt className="shrink-0">
                <Icon name="globe" size={18} className="text-muted" />
                <span className="sr-only">{t.website}</span>
              </dt>
              <dd>
                <a href={business.website} rel="noopener noreferrer nofollow" target="_blank" className="break-all underline underline-offset-4" dir="ltr">
                  {business.website.replace(/^https:\/\//, "")}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        {hours.length ? (
          <div>
            <p className="mb-1.5 font-semibold text-ink">{t.hours}</p>
            <table className="w-full text-start">
              <tbody>
                {hours.map((d) => (
                  <tr key={d}>
                    <th scope="row" className="py-0.5 pe-4 text-start font-medium">
                      {t.days[d]}
                    </th>
                    <td className="tabular py-0.5" dir="ltr">
                      {business.openingHours[d]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {socials.length ? (
          <ul className="flex flex-wrap gap-2" aria-label={t.social}>
            {socials.map(([network, url]) => (
              <li key={network}>
                <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-9 items-center rounded-full border border-control px-3 font-medium capitalize hover:bg-subtle">
                  {network}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

export function CustomerFooter({ locale, t, langHref }: { locale: Locale; t: Dictionary; langHref: (l: Locale) => string }) {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-6 text-center text-sm text-muted">
      <nav aria-label={t.common.language} className="mb-3">
        <ul className="flex justify-center gap-1">
          {locales.map((l) => (
            <li key={l}>
              <a
                href={langHref(l)}
                lang={l}
                hrefLang={l}
                aria-current={l === locale ? "true" : undefined}
                className="inline-flex min-h-10 items-center rounded-lg px-3 font-medium text-ink-2 hover:bg-subtle aria-[current=true]:bg-surface aria-[current=true]:font-bold aria-[current=true]:text-ink aria-[current=true]:shadow-sm"
              >
                {t.common.languages[l]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          {t.customer.poweredBy}
          <Link href="/" className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:text-ink" prefetch={false}>
            <LogoMark size={16} />
            5ali Review
          </Link>
        </span>
        <span aria-hidden="true">·</span>
        <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-ink" prefetch={false}>
          {t.customer.privacy}
        </Link>
      </p>
    </footer>
  );
}
