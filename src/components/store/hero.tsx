import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatPrice, splitHighlight } from "@/lib/format";
import type { Product, StoreSettings } from "@/lib/types";

/**
 * Homepage opening: the headline and two actions beside the lead product's
 * photo, framed by two concentric arches like a Tunisian doorway. Nothing
 * moves; the photo carries the page.
 */
export function Hero({ settings, product, hasContact }: { settings: StoreSettings; product: Product | undefined; hasContact: boolean }) {
  const title = settings.heroTitle || settings.storeName;
  const photo = product?.images[0];

  return (
    <section
      className={cn(
        "container-page grid items-center gap-x-16 gap-y-16 pt-10 pb-20 sm:pt-16 sm:pb-24",
        photo && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]",
      )}
    >
      <div className={photo ? undefined : "mx-auto max-w-2xl text-center"}>
        {settings.tagline ? <p className="text-sm font-medium text-accent-text">{settings.tagline}</p> : null}
        <h1 className="mt-4 text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
          {splitHighlight(title).map((part, i) =>
            part.highlight ? (
              <span key={i} className="text-accent-text">
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </h1>
        {settings.heroSubtitle ? (
          <p className={cn("mt-5 max-w-lg text-lg leading-relaxed text-pretty text-ink-2", !photo && "mx-auto")}>{settings.heroSubtitle}</p>
        ) : null}
        <div className={cn("mt-9 flex flex-wrap gap-3", !photo && "justify-center")}>
          <ButtonLink href="/products" variant="accent" size="lg">
            Browse products
          </ButtonLink>
          {hasContact ? (
            <ButtonLink href="#contact" variant="secondary" size="lg">
              Contact us
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {product && photo ? (
        <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:me-0">
          <div aria-hidden="true" className="absolute -inset-3 rounded-t-full rounded-b-[1.75rem] bg-accent-soft" />
          <div className="relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-2xl bg-surface-2">
            <Image src={photo} alt={product.name} fill preload sizes="(min-width: 640px) 28rem, 100vw" className="object-cover" />
          </div>
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-x-4 -bottom-6 mx-auto flex w-fit max-w-full items-center gap-3 rounded-full bg-surface py-1.5 ps-4 pe-1.5 text-sm shadow-[0_10px_30px_-12px_rgb(22_32_44/0.35)] ring-1 ring-line transition active:scale-[0.97]"
          >
            <span className="min-w-0 truncate font-medium">{product.name}</span>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 font-semibold text-accent-contrast tabular">
              {formatPrice(product.price, settings.currency)}
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
