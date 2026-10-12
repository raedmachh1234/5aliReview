import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

/**
 * Public marketing and legal pages only. Customer feedback pages (/r, /t),
 * dashboards and admin are deliberately excluded and noindexed: they are
 * per-business utility pages, not content for search engines.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/pricing", "/faq", "/contact", "/signup", "/data-deletion", "/legal/privacy", "/legal/terms", "/legal/refunds", "/legal/cookies", "/legal/subprocessors"];
  return pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: p.startsWith("/legal") ? "monthly" : "weekly", priority: p === "/" ? 1 : 0.6 }));
}
