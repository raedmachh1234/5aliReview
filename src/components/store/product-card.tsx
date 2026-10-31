import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { stockLevel } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Price } from "./price";

type CardProduct = Pick<Product, "slug" | "name" | "category" | "price" | "compareAtPrice" | "stock" | "images">;

/**
 * Product tile used in every grid: photo, name, category and price, with a
 * struck-through old price for discounts. With `preview` it renders without
 * a link (the admin editor shows a live preview of the card).
 */
export function ProductCard({
  product,
  currency,
  priority,
  preview,
  className,
}: {
  product: CardProduct;
  currency: string;
  priority?: boolean;
  preview?: boolean;
  className?: string;
}) {
  const soldOut = stockLevel(product.stock) === "out";
  const cover = product.images[0];

  const body: ReactNode = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            loading={priority ? "eager" : undefined}
            sizes="(min-width: 1280px) 18rem, (min-width: 1024px) 25vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]",
              soldOut && "opacity-70 grayscale-[35%]",
            )}
          />
        ) : (
          <div className="grid size-full place-items-center text-muted">
            <Icon name="image" size={32} />
          </div>
        )}
        {soldOut ? (
          <span className="absolute start-3 top-3 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink shadow-sm">Sold out</span>
        ) : null}
      </div>
      <div className="mt-3.5 px-0.5">
        <h3 className="truncate font-medium text-ink">{product.name || "Untitled product"}</h3>
        {product.category ? <p className="mt-0.5 truncate text-sm text-muted">{product.category}</p> : null}
        <Price price={product.price} compareAtPrice={product.compareAtPrice} currency={currency} className="mt-2" />
      </div>
    </>
  );

  if (preview) return <div className={className}>{body}</div>;
  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group block rounded-2xl transition active:scale-[0.98] focus-visible:outline-offset-4", className)}
    >
      {body}
    </Link>
  );
}

export function ProductGrid({
  products,
  currency,
  priorityCount = 0,
  className,
}: {
  products: Product[];
  currency: string;
  priorityCount?: number;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4", className)}>
      {/* No entrance animation: grids re-render on every filter and sort, and motion there is just a wait. */}
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} currency={currency} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
