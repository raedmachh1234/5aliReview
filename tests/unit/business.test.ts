import { describe, expect, it } from "vitest";
import {
  addressLines,
  businessJsonLd,
  groupOpeningHours,
  hasPhysicalLocation,
  homeSearchTitle,
  isGoogleUrl,
  normaliseForSearch,
  splitKeywords,
} from "@/lib/business";
import type { StoreSettings } from "@/lib/types";
import { parseOpeningHours, parseProductForm, parseSettingsForm } from "@/lib/validation";
import { defaultSettings } from "@/server/store/seed";

const shop: StoreSettings = {
  ...defaultSettings,
  storeName: "Test Shop",
  phone: "+216 71 000 000",
  address: "12 Rue de Marseille",
  postalCode: "1000",
  city: "Tunis",
  region: "Tunis",
  country: "TN",
  latitude: "36.8065",
  longitude: "10.1815",
  businessType: "ElectronicsStore",
  googleMapsUrl: "https://maps.app.goo.gl/abc123",
  openingHours: [
    { day: "Mo", opens: "09:00", closes: "18:00" },
    { day: "Tu", opens: "09:00", closes: "18:00" },
    { day: "We", opens: "09:00", closes: "18:00" },
    { day: "Th", opens: "09:00", closes: "18:00" },
    { day: "Fr", opens: "09:00", closes: "18:00" },
    { day: "Sa", opens: "09:00", closes: "13:00" },
  ],
};

describe("business details", () => {
  it("formats the address without repeating the city as region", () => {
    expect(addressLines(shop)).toEqual(["12 Rue de Marseille", "1000 Tunis", "Tunisia"]);
  });

  it("groups consecutive days with the same hours", () => {
    expect(groupOpeningHours(shop.openingHours)).toEqual([
      { days: "Mon–Fri", hours: "09:00–18:00" },
      { days: "Sat", hours: "09:00–13:00" },
      { days: "Sun", hours: "Closed" },
    ]);
  });

  it("describes a shop as a LocalBusiness with address, map position and hours", () => {
    const ld = businessJsonLd(shop, "https://shop.tn", { priceRange: "TND 19 – TND 149" });
    expect(ld).toMatchObject({
      "@type": "ElectronicsStore",
      name: "Test Shop",
      url: "https://shop.tn/",
      telephone: "+216 71 000 000",
      address: { "@type": "PostalAddress", streetAddress: "12 Rue de Marseille", addressLocality: "Tunis", addressCountry: "TN" },
      geo: { latitude: 36.8065, longitude: 10.1815 },
      hasMap: "https://maps.app.goo.gl/abc123",
      priceRange: "TND 19 – TND 149",
    });
    expect(ld.openingHoursSpecification).toHaveLength(6);
    expect((ld.openingHoursSpecification as { dayOfWeek: string }[])[0].dayOfWeek).toBe("https://schema.org/Monday");
  });

  it("falls back to an Organization for online-only stores or without an address", () => {
    expect(hasPhysicalLocation({ ...shop, businessType: "online" })).toBe(false);
    expect(businessJsonLd({ ...shop, businessType: "online" }, "https://shop.tn")["@type"]).toBe("Organization");
    expect(businessJsonLd({ ...shop, address: "" }, "https://shop.tn")).not.toHaveProperty("address");
  });

  it("uses the store name and tagline when no search title is set", () => {
    expect(homeSearchTitle({ seoTitle: "", storeName: "Shop", tagline: "Cards" })).toBe("Shop — Cards");
    expect(homeSearchTitle({ seoTitle: "Cartes NFC Tunisie", storeName: "Shop", tagline: "Cards" })).toBe("Cartes NFC Tunisie");
  });

  it("only accepts https Google links for Maps and reviews", () => {
    expect(isGoogleUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isGoogleUrl("https://g.page/r/CaBc/review")).toBe(true);
    expect(isGoogleUrl("https://www.google.com/maps/place/x")).toBe(true);
    expect(isGoogleUrl("https://search.google.com/local/writereview?placeid=x")).toBe(true);
    expect(isGoogleUrl("http://maps.app.goo.gl/abc")).toBe(false);
    expect(isGoogleUrl("https://google.com.evil.example/x")).toBe(false);
    expect(isGoogleUrl("https://evilgoogle.com/x")).toBe(false);
  });

  it("matches keywords regardless of accents and simple plurals", () => {
    expect(normaliseForSearch("Cartes NFC avis Google")).toContain(normaliseForSearch("carte NFC"));
    expect(normaliseForSearch("Présentoirs")).toBe(normaliseForSearch("presentoir"));
    expect(normaliseForSearch("Google reviews")).toContain(normaliseForSearch("Google review"));
  });

  it("de-duplicates keywords ignoring case and accents", () => {
    expect(splitKeywords("Carte NFC, carte nfc ,  Présentoir   NFC, presentoir nfc,,")).toEqual(["Carte NFC", "Présentoir NFC"]);
  });
});

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe("opening hours form", () => {
  it("keeps only open days", () => {
    const { hours, error } = parseOpeningHours(
      form({ open_Mo: "on", opens_Mo: "09:00", closes_Mo: "18:00", opens_Tu: "09:00", closes_Tu: "18:00" }),
    );
    expect(error).toBeUndefined();
    expect(hours).toEqual([{ day: "Mo", opens: "09:00", closes: "18:00" }]);
  });

  it("rejects missing or reversed times", () => {
    expect(parseOpeningHours(form({ open_Mo: "on", opens_Mo: "", closes_Mo: "18:00" })).error).toBeTruthy();
    expect(parseOpeningHours(form({ open_Mo: "on", opens_Mo: "18:00", closes_Mo: "09:00" })).error).toMatch(/later/);
  });
});

describe("settings form — location and search fields", () => {
  const base = Object.fromEntries(Object.entries(defaultSettings).filter(([, v]) => typeof v === "string")) as Record<string, string>;

  it("accepts a complete location", () => {
    const result = parseSettingsForm(
      form({
        ...base,
        address: "12 Rue de Marseille",
        city: "Tunis",
        country: "tn",
        latitude: "36.8065",
        longitude: "10.1815",
        googleMapsUrl: "https://maps.app.goo.gl/abc",
        seoKeywords: "carte NFC, Carte nfc, avis Google",
        open_Sa: "on",
        opens_Sa: "10:00",
        closes_Sa: "14:00",
      }),
    );
    expect(result.ok && result.data).toMatchObject({
      country: "TN",
      seoKeywords: "carte NFC, avis Google",
      openingHours: [{ day: "Sa", opens: "10:00", closes: "14:00" }],
    });
  });

  it("rejects bad coordinates, non-Google links and an unknown business type", () => {
    const result = parseSettingsForm(
      form({ ...base, latitude: "200", googleReviewUrl: "https://example.com/review", businessType: "Casino" }),
    );
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["businessType", "googleReviewUrl", "latitude"]);
  });

  it("limits product search titles and descriptions", () => {
    const result = parseProductForm(form({ name: "Card", price: "1", seoTitle: "x".repeat(71), seoDescription: "y".repeat(161) }), () => true);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(["seoDescription", "seoTitle"]);
  });
});
