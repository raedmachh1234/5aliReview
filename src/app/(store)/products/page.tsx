import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/store/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { getCategories, getSettings, isSortKey, searchProducts, SORT_OPTIONS } from "@/server/catalog";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Search and sorting only appear once there are more products than fit on one screen. */
const BROWSE_TOOLS_FROM = 9;

/**
 * One canonical URL per category (sorting doesn't create new pages), and
 * search results stay out of Google's index — they're thin, duplicate pages.
 */
export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const params = await searchParams;
  const category = one(params.category);
  const known = category && (await getCategories()).some((c) => c.name === category);
  return {
    title: known ? category : "Shop",
    alternates: { canonical: known ? `/products?category=${encodeURIComponent(category)}` : "/products" },
    ...(one(params.q) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CatalogPage({ searchParams }: PageProps<"/products">) {
  const params = await searchParams;
  const query = one(params.q).slice(0, 100);
  const sortParam = one(params.sort);
  const sort = isSortKey(sortParam) ? sortParam : "newest";

  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const categoryParam = one(params.category);
  const category = categories.some((c) => c.name === categoryParam) ? categoryParam : "";
  const products = await searchProducts({ query, category, sort });
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  const showSearch = total >= BROWSE_TOOLS_FROM || query !== "";
  const showSort = total >= BROWSE_TOOLS_FROM || sort !== "newest";
  const showCategories = categories.length > 1 || category !== "";

  const hrefFor = (nextCategory: string) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (nextCategory) next.set("category", nextCategory);
    if (sort !== "newest") next.set("sort", sort);
    const qs = next.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  const pill = (active: boolean) =>
    cn(
      "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition",
      active ? "border-accent/30 bg-accent-soft text-accent-text" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
    );

  return (
    <div className="container-page pt-12 pb-4 sm:pt-16">
      <header>
        <p className="text-sm font-medium text-accent-text">Shop</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {category || (query ? <>Results for “{query}”</> : "Our products")}
        </h1>
        <p className="mt-3 text-muted" aria-live="polite">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </header>

      {showCategories || showSearch || showSort ? (
        <div className="mt-8 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
          {showCategories ? (
            <nav aria-label="Categories" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              <ul className="flex gap-2">
                <li>
                  <Link href={hrefFor("")} className={pill(!category)} aria-current={!category ? "page" : undefined}>
                    All <span className="opacity-60 tabular">{total}</span>
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.name}>
                    <Link href={hrefFor(c.name)} className={pill(category === c.name)} aria-current={category === c.name ? "page" : undefined}>
                      {c.name} <span className="opacity-60 tabular">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {showSearch || showSort ? (
            <div className="flex gap-2 lg:ms-auto">
              {showSearch ? (
                <Form action="/products" role="search" className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
                  {category ? <input type="hidden" name="category" value={category} /> : null}
                  {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
                  <label htmlFor="catalog-search" className="sr-only">
                    Search products
                  </label>
                  <Icon name="search" size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    key={query}
                    id="catalog-search"
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="Search…"
                    className="h-11 w-full rounded-full border border-line bg-surface ps-10 pe-4 text-sm text-ink transition placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none"
                  />
                </Form>
              ) : null}
              {showSort ? (
                <Suspense>
                  <SortSelect value={sort} options={SORT_OPTIONS} />
                </Suspense>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10">
        {products.length > 0 ? (
          <ProductGrid products={products} currency={settings.currency} priorityCount={4} />
        ) : (
          <div className="rounded-3xl border border-dashed border-line-strong px-6 py-20 text-center">
            <Icon name="search" size={32} className="mx-auto text-muted" />
            <h2 className="mt-4 text-xl font-semibold tracking-tight">No products match your search</h2>
            <p className="mt-2 text-sm text-muted">Try a different word or browse all products.</p>
            <ButtonLink href="/products" variant="secondary" className="mt-6">
              Clear filters
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
