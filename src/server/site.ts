import "server-only";
import { headers } from "next/headers";
import { env } from "@/server/env";

/**
 * The public origin (no trailing slash) used for canonical links, the
 * sitemap, structured data and share text. Search engines need absolute URLs
 * on the real domain, so this prefers explicit configuration.
 */
export function configuredSiteUrl(): string | null {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  return null;
}

/** Configured origin, else the host of the current request, else localhost. */
export async function getSiteUrl(): Promise<string> {
  const configured = configuredSiteUrl();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host");
  // Only plain host[:port] values; anything else could inject markup into links.
  if (host && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) {
    const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (local ? "http" : "https");
    return `${proto === "http" ? "http" : "https"}://${host}`;
  }
  return "http://localhost:3000";
}

/** Turns a site-relative path (e.g. an uploaded photo) into an absolute URL. */
export function absoluteUrl(base: string, pathOrUrl: string): string {
  return pathOrUrl.startsWith("/") ? `${base}${pathOrUrl}` : pathOrUrl;
}
