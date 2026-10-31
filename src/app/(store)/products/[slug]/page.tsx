import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/store/gallery";
import { Price } from "@/components/store/price";
import { ProductGrid } from "@/components/store/product-card";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/store/section-heading";
import { StockBadge } from "@/components/store/stock-badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { contactLinks } from "@/lib/contact";
import { discountPercent, formatPrice, stockLevel } from "@/lib/format";
import { getPublishedProductBySlug, getRelatedProducts, getSettings } from "@/server/catalog";
import { absoluteUrl, getSiteUrl } from "@/server/site";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getPublishedProductBySlug(slug), getSettings()]);
  if (!product) return { title: "Product not found" };
  const description =
    product.seoDescription ||
    product.tagline ||
    product.description.replace(/\s+/g, " ").slice(0, 160) ||
    `${product.name} — ${formatPrice(product.price, settings.currency)}`;
  return {
    // A custom search title replaces the whole <title>; otherwise "Name · Store".
    title: product.seoTitle ? { absolute: product.seoTitle } : product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.seoTitle || product.name, description, images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [product, settings, base] = await Promise.all([getPublishedProductBySlug(slug), getSettings(), getSiteUrl()]);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  const url = `${base}/products/${product.slug}`;
  const contacts = contactLinks(settings, `Hi! I’m interested in “${product.name}” — ${url}`);
  const orderLinks = contacts.filter((c) => c.key === "whatsapp" || c.key === "phone" || c.key === "email");
  const discount = discountPercent(product);
  const soldOut = stockLevel(product.stock) === "out";

  // Structured data lets Google show price, availability and breadcrumbs in results.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.tagline || undefined,
    sku: product.sku || undefined,
    image: product.images.map((src) => absoluteUrl(base, src)),
    category: product.category || undefined,
    brand: { "@type": "Brand", name: settings.storeName },
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: settings.currency,
      price: product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: settings.storeName },
    },
  };
  const crumbs = [
    { name: "Shop", url: `${base}/products` },
    ...(product.category ? [{ name: product.category, url: `${base}/products?category=${encodeURIComponent(product.category)}` }] : []),
    { name: product.name, url },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };

  return (
    <div className="container-page pt-8 sm:pt-10">
      <JsonLd data={[productLd, breadcrumbLd]} />

      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/products" className="transition hover:text-ink">
              Shop
            </Link>
          </li>
          {product.category ? (
            <>
              <li aria-hidden="true">
                <Icon name="chevronRight" size={14} />
              </li>
              <li>
                <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="transition hover:text-ink">
                  {product.category}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true">
            <Icon name="chevronRight" size={14} />
          </li>
          <li aria-current="page" className="truncate text-ink-2">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Gallery images={product.images} name={product.name} />
        </div>

        <div className="lg:py-4">
          <div className="flex flex-wrap items-center gap-3">
            {product.category ? (
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
                className="text-sm text-muted transition hover:text-ink"
              >
                {product.category}
              </Link>
            ) : null}
            <StockBadge stock={product.stock} />
          </div>

          <h1 className="mt-4 text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">{product.name}</h1>
          {product.tagline ? <p className="mt-4 text-lg leading-relaxed text-pretty text-muted">{product.tagline}</p> : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} currency={settings.currency} size="lg" />
            {discount ? (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-text">Save {discount}%</span>
            ) : null}
          </div>

          <div className="mt-8 rounded-2xl bg-surface-2 p-5 sm:p-6">
            {orderLinks.length > 0 ? (
              <>
                <p className="text-sm font-medium">{soldOut ? "Currently sold out — ask us about restocking" : "Order directly with us"}</p>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {orderLinks.map((link, i) => (
                    <li key={link.key} className={cn(i === 0 && "w-full sm:w-auto")}>
                      <a
                        href={link.href}
                        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={cn(
                          "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-semibold transition active:scale-[0.98]",
                          i === 0
                            ? "bg-accent text-accent-contrast shadow-lg shadow-accent/25 hover:brightness-110"
                            : "bg-surface text-ink ring-1 ring-line-strong ring-inset hover:ring-ink/40",
                        )}
                      >
                        <Icon name={link.icon} size={18} />
                        {link.key === "whatsapp" ? "Order on WhatsApp" : link.key === "phone" ? "Call to order" : "Email us"}
                      </a>
                    </li>
                  ))}
                </ul>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm text-muted">
                  {orderLinks.map((link) => (
                    <li key={link.key} className="inline-flex items-center gap-2">
                      <Icon name={link.icon} size={15} className="text-muted" />
                      <span className="text-ink-2 tabular select-all">{link.detail}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Icon name="info" size={16} />
                Contact details will be available soon.
              </p>
            )}
          </div>

          {product.description ? (
            <section aria-labelledby="about-title" className="mt-10">
              <h2 id="about-title" className="text-lg font-semibold">
                About this product
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-2">{product.description}</p>
            </section>
          ) : null}

          {product.specs.length > 0 ? (
            <section aria-labelledby="specs-title" className="mt-10">
              <h2 id="specs-title" className="text-lg font-semibold">
                Specifications
              </h2>
              <dl className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {product.specs.map((spec, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3.5 text-sm">
                    <dt className="text-muted">{spec.label}</dt>
                    <dd className="font-medium text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {product.tags.length > 0 || product.sku ? (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/products?q=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-ink-2 transition hover:bg-surface-3 hover:text-ink"
                >
                  #{tag}
                </Link>
              ))}
              {product.sku ? <span className="ms-auto text-xs text-muted tabular">SKU {product.sku}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-title" className="mt-24">
          <SectionHeading id="related-title" eyebrow="Keep browsing" title="You may also like" href="/products" />
          <ProductGrid products={related} currency={settings.currency} />
        </section>
      ) : null}
    </div>
  );
}
