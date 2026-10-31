import { describe, expect, it } from "vitest";
import { extractVerificationToken, parseProductForm, parseSettingsForm, parseTags } from "@/lib/validation";
import { defaultSettings } from "@/server/store/seed";

const allowAll = () => true;

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

const valid = {
  name: "  NFC Review Card ",
  tagline: "Tap to review",
  description: "Line one\r\nLine two",
  price: "35",
  compareAtPrice: "45",
  sku: "NFC-1",
  trackStock: "on",
  stock: "12",
  category: "NFC  Cards",
  tags: "nfc, Google reviews, NFC, ",
  images: ["/media/a.jpg", "/samples/card.svg"],
  specLabel: ["Chip", "", "Size"],
  specValue: ["NTAG215", "", "85 × 54 mm"],
  status: "published",
  featured: "on",
};

describe("parseProductForm", () => {
  it("normalises a complete product", () => {
    const result = parseProductForm(form(valid), allowAll);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      name: "NFC Review Card",
      slug: "nfc-review-card",
      description: "Line one\nLine two",
      price: 35,
      compareAtPrice: 45,
      stock: 12,
      category: "NFC Cards",
      tags: ["nfc", "Google reviews"],
      specs: [
        { label: "Chip", value: "NTAG215" },
        { label: "Size", value: "85 × 54 mm" },
      ],
      status: "published",
      featured: true,
    });
  });

  it("accepts a comma as decimal separator and untracked stock", () => {
    const result = parseProductForm(form({ name: "Tag", price: "19,5" }), allowAll);
    expect(result.ok && result.data).toMatchObject({ price: 19.5, stock: null, compareAtPrice: null, status: "draft", featured: false });
  });

  it("keeps an explicit slug, cleaned up", () => {
    const result = parseProductForm(form({ name: "Tag", slug: "My Custom URL!", price: "1" }), allowAll);
    expect(result.ok && result.data.slug).toBe("my-custom-url");
  });

  it("reports each invalid field", () => {
    const result = parseProductForm(
      form({ name: "", price: "abc", compareAtPrice: "1", trackStock: "on", stock: "-2", specLabel: ["Size"], specValue: [""] }),
      allowAll,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["name", "price", "specs", "stock"]);
  });

  it("requires the compare-at price to be higher than the price", () => {
    const result = parseProductForm(form({ name: "Tag", price: "50", compareAtPrice: "40" }), allowAll);
    expect(!result.ok && result.fieldErrors.compareAtPrice).toMatch(/higher/);
  });

  it("rejects images the store didn't upload", () => {
    const result = parseProductForm(form({ name: "Tag", price: "1", images: ["https://evil.example/x.png"] }), (url) => url.startsWith("/media/"));
    expect(!result.ok && result.fieldErrors.images).toBeTruthy();
  });
});

describe("parseTags", () => {
  it("trims, collapses spaces and de-duplicates case-insensitively", () => {
    expect(parseTags(" Gift ,gift,  best   value ,,")).toEqual(["Gift", "best value"]);
  });
});

describe("parseSettingsForm", () => {
  // Form fields are strings; opening hours are submitted as separate per-day fields.
  const base = Object.fromEntries(
    Object.entries({ ...defaultSettings, currency: "tnd", accentColor: "#4F46E5" }).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  it("accepts valid settings and normalises codes", () => {
    const result = parseSettingsForm(form(base));
    expect(result.ok && result.data).toMatchObject({ currency: "TND", accentColor: "#4f46e5" });
  });

  it("keeps only the code from a pasted Search Console tag", () => {
    const tag = '<meta name="google-site-verification" content="AbC_123-xyz" />';
    expect(extractVerificationToken(tag)).toBe("AbC_123-xyz");
    expect(extractVerificationToken("  AbC_123-xyz ")).toBe("AbC_123-xyz");
    const result = parseSettingsForm(form({ ...base, googleSiteVerification: tag }));
    expect(result.ok && result.data.googleSiteVerification).toBe("AbC_123-xyz");
  });

  it("rejects a verification value that isn't a code", () => {
    const result = parseSettingsForm(form({ ...base, googleSiteVerification: '"><script>alert(1)</script>' }));
    expect(!result.ok && result.fieldErrors.googleSiteVerification).toBeTruthy();
  });

  it("rejects bad currency, colour, email and non-https links", () => {
    const result = parseSettingsForm(
      form({ ...base, currency: "XYZW", accentColor: "blue", email: "nope", instagram: "http://instagram.com/x", storeName: "" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["accentColor", "currency", "email", "instagram", "storeName"]);
  });
});
