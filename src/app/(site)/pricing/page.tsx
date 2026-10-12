import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { formatMoney, plans, PRICING_IS_PLACEHOLDER } from "@/config/plans";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Alert } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.pricingTitle, description: t.meta.pricingDescription, alternates: { canonical: "/pricing" } };
}

/**
 * Transparent pricing (requirements #10 and "no hidden fees"): price, billing
 * frequency, taxes, trial, renewal and cancellation terms are all on this page,
 * read from src/config/plans.ts — the same source the billing pages use.
 */
export default async function PricingPage() {
  const { t, locale } = await getI18n();
  const p = t.pricing;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{p.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">{p.lead}</p>

      {PRICING_IS_PLACEHOLDER ? (
        <Alert tone="warn" title={p.placeholderBadge} className="mt-8 max-w-3xl">
          {p.placeholderNote}
        </Alert>
      ) : null}

      <ul className="mt-10 grid gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <li
            key={plan.id}
            className={`flex flex-col rounded-card border bg-surface p-6 shadow-card ${i === 1 ? "border-pine" : "border-line"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold text-ink">{plan.name}</h2>
              {PRICING_IS_PLACEHOLDER ? <Badge tone="warn">{p.placeholderBadge}</Badge> : null}
            </div>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="tabular text-4xl font-extrabold tracking-tight text-ink">{formatMoney(plan.monthlyMinor, locale)}</span>
              <span className="text-ink-2">{p.perMonth}</span>
            </p>
            <p className="mt-1 text-sm text-ink-2">{p.billedMonthly}</p>
            <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-sm text-ink-2">
              {p.yearly}: <strong className="tabular text-ink">{formatMoney(plan.yearlyMinor, locale)}</strong> {p.perYear} — {p.billedYearly}
            </p>
            <p className="mt-3 text-sm text-ink-2">{p.terms.taxNote}</p>

            <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">{p.trialTerms}</dt>
                <dd className="text-end font-semibold text-ink">{plan.trialDays ? fmt(p.trial, { days: plan.trialDays }) : p.noTrial}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">{p.locations}</dt>
                <dd className="font-semibold text-ink">{plan.maxLocations ?? p.unlimited}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">{p.cards}</dt>
                <dd className="font-semibold text-ink">{plan.includedCards}</dd>
              </div>
            </dl>

            <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-2">
              {p.planFeatures[plan.id].map((f) => (
                <li key={f} className="flex gap-2">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonLink href={`/signup?plan=${plan.id}`} variant={i === 1 ? "primary" : "secondary"} className="mt-6 w-full">
              {fmt(p.choose, { plan: plan.name })}
            </ButtonLink>
          </li>
        ))}
      </ul>

      <section aria-labelledby="terms-title" className="mt-16 max-w-3xl">
        <h2 id="terms-title" className="text-2xl font-extrabold tracking-tight text-ink">{p.termsTitle}</h2>
        <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-surface">
          {[
            [p.taxes, p.terms.taxNote],
            [p.trialTerms, p.terms.trial],
            [p.renewal, p.terms.renewal],
            [p.cancellation, p.terms.cancellation],
            [p.extras, p.terms.extraCards],
          ].map(([term, desc]) => (
            <div key={term} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="font-semibold text-ink">{term}</dt>
              <dd className="text-ink-2">{desc}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">
          <Link href="/legal/refunds" className="font-semibold text-pine underline underline-offset-4">
            {p.refundsLink}
          </Link>
        </p>
      </section>
    </div>
  );
}
