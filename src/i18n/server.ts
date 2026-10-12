import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/lib/types";
import { defaultLocale, isLocale, LOCALE_HEADER, LOCALE_SOURCE_HEADER } from "./config";
import en, { type Dictionary } from "./dictionaries/en";
import fr from "./dictionaries/fr";
import ar from "./dictionaries/ar";

const dictionaries: Record<Locale, Dictionary> = { en, fr, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

/** Locale resolved by src/proxy.ts (?lang → cookie → Accept-Language → default). */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : defaultLocale;
}

/** True when the visitor explicitly chose a language or their browser matched one. */
export async function isLocaleExplicit(): Promise<boolean> {
  const source = (await headers()).get(LOCALE_SOURCE_HEADER);
  return source === "query" || source === "cookie" || source === "accept";
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
