import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { Product } from "@/lib/types";
import { getStore } from "@/server/store";

/**
 * Read helpers for pages. `connection()` keeps these out of build-time
 * prerendering: the catalogue lives in a file or database that changes at
 * runtime, so pages always render with current data.
 */
export type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
];

export function isSortKey(value: unknown): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

export const getSettings = cache(async () => {
  await connection();
  return getStore().getSettings();
});

const allProducts = cache(async () => {
  await connection();
  return getStore().listProducts();
});

const byNewest = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt);

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price || byNewest(a, b));
    case "price-desc":
      return list.sort((a, b) => b.price - a.price || byNewest(a, b));
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return list.sort(byNewest);
  }
}

export function matchesQuery(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.tagline, product.category, product.sku, ...product.tags].some((field) =>
    field.toLowerCase().includes(q),
  );
}

// ── Storefront (published products only) ───────────────────────────────────

export const getPublishedProducts = cache(async () => (await allProducts()).filter((p) => p.status === "published"));

export async function searchProducts(options: { query?: string; category?: string; sort?: SortKey }): Promise<Product[]> {
  const { query = "", category = "", sort = "newest" } = options;
  const products = (await getPublishedProducts()).filter(
    (p) => (!category || p.category === category) && matchesQuery(p, query),
  );
  return sortProducts(products, sort);
}

export async function getCategories(): Promise<{ name: string; count: number; image: string | null }[]> {
  const map = new Map<string, { count: number; image: string | null }>();
  for (const p of sortProducts(await getPublishedProducts(), "newest")) {
    if (!p.category) continue;
    const entry = map.get(p.category) ?? { count: 0, image: null };
    entry.count += 1;
    entry.image ??= p.images[0] ?? null;
    map.set(p.category, entry);
  }
  return [...map].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const getPublishedProductBySlug = cache(async (slug: string) => {
  return (await getPublishedProducts()).find((p) => p.slug === slug) ?? null;
});

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const others = sortProducts(
    (await getPublishedProducts()).filter((p) => p.id !== product.id),
    "newest",
  );
  const sameCategory = others.filter((p) => p.category && p.category === product.category);
  const rest = others.filter((p) => !sameCategory.includes(p));
  return [...sameCategory, ...rest].slice(0, limit);
}

// ── Admin (all products) ────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  return sortProducts(await allProducts(), "newest");
}
