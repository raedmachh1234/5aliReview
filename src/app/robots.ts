import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/server/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();
  return {
    // The admin is also sent with noindex headers; product photos under /media stay crawlable.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
