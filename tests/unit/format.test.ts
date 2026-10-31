import { describe, expect, it } from "vitest";
import { contactLinks } from "@/lib/contact";
import { contrastRatio, readableTextOn } from "@/lib/contrast";
import { discountPercent, formatPrice, splitHighlight, stockLevel } from "@/lib/format";
import { slugify, uniqueSlug } from "@/lib/slug";
import { defaultSettings } from "@/server/store/seed";

// Intl separates the currency code with a non-breaking space, which \s also matches.
const price = (amount: number, currency: string) => formatPrice(amount, currency).replace(/\s/g, " ");

describe("formatPrice", () => {
  it("drops decimals for whole amounts and keeps the currency's precision otherwise", () => {
    expect(price(49, "TND")).toBe("TND 49");
    expect(price(49.5, "TND")).toBe("TND 49.500");
    expect(price(129.5, "EUR")).toBe("€129.50");
  });

  it("falls back gracefully for an unknown currency", () => {
    expect(formatPrice(10, "??")).toBe("10 ??");
  });
});

describe("product helpers", () => {
  it("computes the discount only when the compare-at price is higher", () => {
    expect(discountPercent({ price: 35, compareAtPrice: 45 })).toBe(22);
    expect(discountPercent({ price: 35, compareAtPrice: 35 })).toBeNull();
    expect(discountPercent({ price: 35, compareAtPrice: null })).toBeNull();
  });

  it("classifies stock levels", () => {
    expect([null, 0, 3, 5, 6].map(stockLevel)).toEqual(["untracked", "out", "low", "low", "in"]);
  });

  it("splits *highlighted* words out of a headline", () => {
    expect(splitHighlight("Tap. Scan. *Grow* your business.")).toEqual([
      { text: "Tap. Scan. ", highlight: false },
      { text: "Grow", highlight: true },
      { text: " your business.", highlight: false },
    ]);
  });
});

describe("slugs", () => {
  it("transliterates accents and strips symbols", () => {
    expect(slugify("Carte NFC Été — Édition #1!")).toBe("carte-nfc-ete-edition-1");
    expect(slugify("بطاقة")).toBe("");
  });

  it("finds the first free variant", () => {
    expect(uniqueSlug("card", new Set(["card", "card-2"]))).toBe("card-3");
    expect(uniqueSlug("", new Set())).toBe("product");
  });
});

describe("contrast", () => {
  it("picks the more readable text colour for an accent", () => {
    expect(readableTextOn("#4f46e5")).toBe("#ffffff");
    expect(readableTextOn("#facc15")).toBe("#0b0b0c");
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});

describe("contactLinks", () => {
  it("only lists configured methods and builds safe links", () => {
    const links = contactLinks({ ...defaultSettings, whatsapp: "+216 20 123 456", phone: "", email: "shop@example.com" }, "Hi & hello");
    expect(links.map((l) => l.key)).toEqual(["whatsapp", "email"]);
    expect(links[0].href).toBe("https://wa.me/21620123456?text=Hi%20%26%20hello");
    expect(links[1].href).toBe("mailto:shop@example.com?subject=Hi%20%26%20hello");
  });
});
