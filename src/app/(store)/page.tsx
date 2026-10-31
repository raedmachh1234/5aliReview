import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ContactBand } from "@/components/store/contact-band";
import { Hero } from "@/components/store/hero";
import { HowItWorks, ProductShowcase } from "@/components/store/home-sections";
import { Icon } from "@/components/ui/icon";
import { businessJsonLd, homeSearchDescription, homeSearchTitle } from "@/lib/business";
import { contactLinks } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import { getPublishedProducts, getSettings, sortProducts } from "@/server/catalog";
import { absoluteUrl, getSiteUrl } from "@/server/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = homeSearchTitle(settings);
  const description = homeSearchDescription(settings);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description },
  };
}

/** How many products the homepage shows before "See all". */
const SHOWCASE_LIMIT = 8;

export default async function HomePage() {
  const [settings, products, base] = await Promise.all([getSettings(), getPublishedProducts(), getSiteUrl()]);
  const newest = sortProducts(products, "newest");
  const featured = newest.filter((p) => p.featured);
  // Featured first, then everything else by date.
  const ranked = [...featured, ...newest.filter((p) => !p.featured)];
  const lead = ranked.find((p) => p.images.length > 0);
  const showcase = (featured.length > 0 ? featured : newest).slice(0, SHOWCASE_LIMIT);
  const contacts = contactLinks(settings, `Hello ${settings.storeName}!`);

  // The site name for Google results, and the business behind it — a LocalBusiness with address,
  // hours and map position when there's a shop, which Google matches to the Business Profile.
  const prices = products.map((p) => p.price);
  const priceRange =
    prices.length > 0 ? `${formatPrice(Math.min(...prices), settings.currency)} – ${formatPrice(Math.max(...prices), settings.currency)}` : undefined;
  const cover = lead?.images[0];
  const siteLd = [
    { "@context": "https://schema.org", "@type": "WebSite", name: settings.storeName, url: `${base}/` },
    businessJsonLd(settings, base, { priceRange, image: cover ? absoluteUrl(base, cover) : undefined }),
  ];

  return (
    <>
      <JsonLd data={siteLd} />
      <Hero settings={settings} product={lead} hasContact={contacts.length > 0} />
      <HowItWorks photo={lead?.images[1]} />

      {products.length > 0 ? (
        <ProductShowcase
          title={showcase.length === 1 ? "Order yours" : featured.length > 0 ? "Featured products" : "Our products"}
          products={showcase}
          currency={settings.currency}
          href={products.length > showcase.length ? "/products" : undefined}
        />
      ) : (
        <section className="container-page py-16 sm:py-24">
          <div className="rounded-3xl border border-dashed border-line-strong px-6 py-20 text-center">
            <Icon name="box" size={36} className="mx-auto text-muted" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">New products are on the way</h2>
            <p className="mt-2 text-muted">Check back soon to see what’s new.</p>
          </div>
        </section>
      )}

      <ContactBand contacts={contacts} settings={settings} />
    </>
  );
}
