/**
 * Subscription plans — the single source of truth for pricing.
 *
 * ⚠️ PLACEHOLDER PRICES. These numbers have not been set by the business yet.
 * While `PRICING_IS_PLACEHOLDER` is true, every price on the site shows a visible
 * "placeholder" badge so nobody mistakes them for a real offer.
 * Set real prices, tax treatment and trial length, then flip the flag to false.
 * The wording of the terms (tax, renewal, cancellation, trial) is translated:
 * see pricing.terms in src/i18n/dictionaries — keep it in sync with /legal/terms.
 */
export const PRICING_IS_PLACEHOLDER = true;

export const currency = "TND" as const;

/** Prices are stored in minor units (millimes: 1 TND = 1000). */
export const MINOR_UNITS_PER_MAJOR = 1000;

export interface Plan {
  id: "starter" | "business" | "multi";
  name: string;
  monthlyMinor: number;
  yearlyMinor: number;
  /** Trial length in days. 0 = no trial. */
  trialDays: number;
  maxLocations: number | null;
  includedCards: number;
  /* Feature lists are translated: see pricing.planFeatures in src/i18n/dictionaries. */
}

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyMinor: 29_000,
    yearlyMinor: 290_000,
    trialDays: 14,
    maxLocations: 1,
    includedCards: 1,
  },
  {
    id: "business",
    name: "Business",
    monthlyMinor: 59_000,
    yearlyMinor: 590_000,
    trialDays: 14,
    maxLocations: 3,
    includedCards: 5,
  },
  {
    id: "multi",
    name: "Multi-location",
    monthlyMinor: 129_000,
    yearlyMinor: 1_290_000,
    trialDays: 14,
    maxLocations: null,
    includedCards: 15,
  },
];


export function getPlan(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

export function formatMoney(minor: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-TN" : "en-TN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(minor / MINOR_UNITS_PER_MAJOR);
}
