import type { Locale } from "@/lib/types";

export const locales: Locale[] = ["en", "fr", "ar"];
export const defaultLocale: Locale = "en";
export const LOCALE_HEADER = "x-5ali-locale";
export const LOCALE_SOURCE_HEADER = "x-5ali-locale-source";
export const PATH_HEADER = "x-5ali-path";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Picks the best supported locale from an Accept-Language header, or null. */
export function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((x) => !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  for (const { lang } of ranked) if (isLocale(lang)) return lang;
  return null;
}

/** Replaces {name} tokens. Unknown tokens are left visible to make gaps obvious. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-TN-u-nu-latn" : locale === "fr" ? "fr-TN" : "en-GB";
}
