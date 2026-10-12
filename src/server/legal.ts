import "server-only";
import { company } from "@/config/company";
import { legalDefaults } from "@/content/legal/defaults.generated";
import type { LegalSlug, Locale } from "@/lib/types";
import { getRepository } from "@/server/data";
import { logger } from "@/server/security/logger";

export const LEGAL_SLUGS: LegalSlug[] = ["privacy", "terms", "refunds", "cookies", "subprocessors"];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as string[]).includes(value);
}

export interface ResolvedLegalDocument {
  slug: LegalSlug;
  locale: Locale;
  title: string;
  bodyMd: string;
  version: number | null;
  updatedAt: string;
  /** True when the requested language wasn't available and English is shown. */
  isFallback: boolean;
}

/** Fills {{company.*}} and {{lastUpdated}} placeholders. Unknown placeholders stay visible. */
export function fillPlaceholders(body: string, lastUpdated: string): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    if (key === "lastUpdated") return lastUpdated;
    if (key.startsWith("company.")) {
      const value = (company as Record<string, string>)[key.slice("company.".length)];
      if (typeof value === "string") return value;
    }
    return match;
  });
}

/**
 * Published version from the database (editable by admins) if any, else the
 * bundled default text. Falls back to English when a translation is missing.
 */
export async function getLegalDocument(slug: LegalSlug, locale: Locale): Promise<ResolvedLegalDocument | null> {
  const candidates: Locale[] = locale === "en" ? ["en"] : [locale, "en"];
  for (const loc of candidates) {
    try {
      const repo = await getRepository();
      const doc = await repo.getLegalDocument(slug, loc);
      if (doc) {
        const day = doc.publishedAt.slice(0, 10);
        return {
          slug,
          locale: loc,
          title: doc.title,
          bodyMd: fillPlaceholders(doc.bodyMd, day),
          version: doc.version,
          updatedAt: day,
          isFallback: loc !== locale,
        };
      }
    } catch (err) {
      logger.warn("legal_document_lookup_failed", err);
    }
    const fallback = legalDefaults[loc]?.[slug];
    if (fallback) {
      return {
        slug,
        locale: loc,
        title: fallback.title,
        bodyMd: fillPlaceholders(fallback.bodyMd, company.legalLastUpdated),
        version: null,
        updatedAt: company.legalLastUpdated,
        isFallback: loc !== locale,
      };
    }
  }
  return null;
}
