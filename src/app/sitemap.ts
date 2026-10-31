import type { MetadataRoute } from "next";
import { getCategories, getPublishedProducts } from "@/server/catalog";
import { absoluteUrl, getSiteUrl } from "@/server/site";

/**
 * /sitemap.xml — submit this URL in Google Search Console. Lists every
 * published product (with its photos, for Google Images) and each category.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [base, products, categories] = await Promise.all([getSiteUrl(), getPublishedProducts(), getCategories()]);
  const latest = products.reduce<string | undefined>((max, p) => (!max || p.updatedAt > max ? p.updatedAt : max), undefined);
  return [
    { url: `${base}/`, lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${base}/products?category=${encodeURIComponent(c.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((src) => absoluteUrl(base, src)),
    })),
  ];
}
