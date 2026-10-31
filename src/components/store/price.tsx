import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export function Price({
  price,
  compareAtPrice,
  currency,
  size = "md",
  className,
}: {
  price: number;
  compareAtPrice: number | null;
  currency: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const onSale = compareAtPrice !== null && compareAtPrice > price;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 tabular", className)}>
      <span className={cn("font-semibold tracking-tight text-ink", size === "lg" ? "text-3xl sm:text-4xl" : "text-[0.95rem]")}>
        {onSale ? <span className="sr-only">Sale price: </span> : null}
        {formatPrice(price, currency)}
      </span>
      {onSale ? (
        <s className={cn("text-muted", size === "lg" ? "text-lg" : "text-sm")}>
          <span className="sr-only">Original price: </span>
          {formatPrice(compareAtPrice, currency)}
        </s>
      ) : null}
    </p>
  );
}
