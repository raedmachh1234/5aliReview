import type { Product } from "./types";

/** Whole amounts drop the decimals ("TND 49"); others keep the currency's own precision ("TND 49.500"). */
export function formatPrice(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Percentage saved versus the compare-at price, or null when there is no discount. */
export function discountPercent(product: Pick<Product, "price" | "compareAtPrice">): number | null {
  const { price, compareAtPrice } = product;
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export const LOW_STOCK_THRESHOLD = 5;

export type StockLevel = "untracked" | "in" | "low" | "out";

export function stockLevel(stock: number | null): StockLevel {
  if (stock === null) return "untracked";
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** Splits "Built for *every* table" into plain and highlighted parts. */
export function splitHighlight(text: string): { text: string; highlight: boolean }[] {
  return text
    .split(/\*([^*]+)\*/g)
    .map((part, i) => ({ text: part, highlight: i % 2 === 1 }))
    .filter((p) => p.text.length > 0);
}

/** "+216 20 123 456" → "21620123456" for wa.me / tel links. */
export function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}
