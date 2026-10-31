import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";
import { Price } from "./price";
import { ProductGrid } from "./product-card";
import { SectionHeading } from "./section-heading";

const STEPS = [
  { title: "Place it", detail: "Put the stand on your counter or a table, where customers can see it." },
  { title: "They tap", detail: "Customers hold their phone near it. There’s no app to install." },
  { title: "You get the review", detail: "Your Google review page opens on their phone, ready for their stars." },
];

/** Three plain steps, next to a photo of the product in use when there is one. */
export function HowItWorks({ photo }: { photo: string | undefined }) {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 bg-surface-2 py-16 sm:py-24">
      <div className={cn("container-page grid items-center gap-12 lg:gap-20", photo && "lg:grid-cols-2")}>
        {photo ? (
          <div className="relative aspect-3/2 overflow-hidden rounded-3xl bg-surface-3">
            <Image src={photo} alt="" fill sizes="(min-width: 1024px) 36rem, 100vw" className="object-cover" />
          </div>
        ) : null}
        <div className={photo ? undefined : "mx-auto w-full max-w-2xl"}>
          <p className="text-sm font-medium text-accent-text">How it works</p>
          <h2 id="how-title" className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
            Simple for you and your customers
          </h2>
          <ol className="mt-10 space-y-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-10 shrink-0 place-items-center rounded-t-full rounded-b-md bg-surface pt-1.5 font-semibold text-accent-text ring-1 ring-line"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-pretty text-ink-2">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** The products worth showing on the homepage: one wide card for a single product, a grid for more. */
export function ProductShowcase({
  title,
  products,
  currency,
  href,
}: {
  title: string;
  products: Product[];
  currency: string;
  href?: string;
}) {
  return (
    <section aria-labelledby="featured-title" className="container-page py-16 sm:py-24">
      <SectionHeading id="featured-title" title={title} href={href} linkLabel="See all" />
      {products.length === 1 ? <ProductFeature product={products[0]} currency={currency} /> : <ProductGrid products={products} currency={currency} />}
    </section>
  );
}

function ProductFeature({ product, currency }: { product: Product; currency: string }) {
  const specs = product.specs.slice(0, 4);
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group grid overflow-hidden rounded-3xl bg-surface ring-1 ring-line transition active:scale-[0.99] focus-visible:outline-offset-4 md:grid-cols-2"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2 md:aspect-auto md:min-h-112">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt=""
            fill
            sizes="(min-width: 768px) 40rem, 100vw"
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted">
            <Icon name="image" size={40} />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14">
        {product.category ? <p className="text-sm text-muted">{product.category}</p> : null}
        <h3 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">{product.name}</h3>
        {product.tagline ? <p className="mt-3 leading-relaxed text-pretty text-ink-2">{product.tagline}</p> : null}
        {specs.length > 0 ? (
          <ul className="mt-6 space-y-2.5 text-sm">
            {specs.map((spec, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-text" />
                <span>
                  <span className="text-muted">{spec.label}:</span> {spec.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} currency={currency} size="lg" />
          <span className={buttonClass("accent", "md")}>
            View details
            <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
