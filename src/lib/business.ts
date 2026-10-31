import { DAYS, type DayCode, type OpeningHours, type StoreSettings } from "./types";

/**
 * Business details as Google expects them: the same name, address, phone and
 * hours on the site, in structured data and in the Google Business Profile.
 */

/** schema.org LocalBusiness types offered in the admin ("online" = no shop to visit). */
export const BUSINESS_TYPES = [
  { value: "online", label: "Online only — no shop customers can visit" },
  { value: "Store", label: "Shop (general)" },
  { value: "ElectronicsStore", label: "Electronics store" },
  { value: "ComputerStore", label: "Computer store" },
  { value: "MobilePhoneStore", label: "Mobile phone store" },
  { value: "OfficeEquipmentStore", label: "Office equipment store" },
  { value: "ClothingStore", label: "Clothing store" },
  { value: "ShoeStore", label: "Shoe store" },
  { value: "JewelryStore", label: "Jewellery store" },
  { value: "HomeGoodsStore", label: "Home goods store" },
  { value: "FurnitureStore", label: "Furniture store" },
  { value: "HardwareStore", label: "Hardware store" },
  { value: "BookStore", label: "Book store" },
  { value: "ToyStore", label: "Toy store" },
  { value: "SportingGoodsStore", label: "Sporting goods store" },
  { value: "LocalBusiness", label: "Other local business" },
] as const;

export const DAY_NAMES: Record<DayCode, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

export function countryName(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  try {
    return new Intl.DisplayNames("en", { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "12 Rue de Marseille", "1000 Tunis", "Tunis", "Tunisia" — empty parts skipped. */
export function addressLines(s: Pick<StoreSettings, "address" | "postalCode" | "city" | "region" | "country">): string[] {
  const cityLine = [s.postalCode, s.city].filter(Boolean).join(" ");
  const region = s.region && s.region !== s.city ? s.region : "";
  return [s.address, cityLine, region, countryName(s.country)].filter(Boolean);
}

/** A shop customers can visit — the case Google Business Profile and LocalBusiness data are for. */
export function hasPhysicalLocation(s: Pick<StoreSettings, "businessType" | "address" | "city">): boolean {
  return s.businessType !== "online" && Boolean(s.address && s.city);
}

/** Groups consecutive days with the same hours: [{ days: "Mon–Fri", hours: "09:00–18:00" }, …]. */
export function groupOpeningHours(hours: OpeningHours[]): { days: string; hours: string }[] {
  const byDay = new Map(hours.map((h) => [h.day, `${h.opens}–${h.closes}`]));
  const groups: { first: DayCode; last: DayCode; hours: string }[] = [];
  for (const day of DAYS) {
    const value = byDay.get(day) ?? "Closed";
    const previous = groups.at(-1);
    if (previous && previous.hours === value) previous.last = day;
    else groups.push({ first: day, last: day, hours: value });
  }
  const short = (d: DayCode) => DAY_NAMES[d].slice(0, 3);
  return groups.map((g) => ({ days: g.first === g.last ? short(g.first) : `${short(g.first)}–${short(g.last)}`, hours: g.hours }));
}

const GOOGLE_HOSTS = /(^|\.)google\.[a-z.]{2,6}$|(^|\.)goo\.gl$|^g\.page$/i;

/** Google Maps / Business Profile links: maps.app.goo.gl, g.page, google.com/maps, search.google.com… */
export function isGoogleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && GOOGLE_HOSTS.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * schema.org data for the business: a LocalBusiness (with address, map
 * position and hours) when there is a shop to visit, otherwise an Organization.
 */
export function businessJsonLd(
  s: StoreSettings,
  base: string,
  extra: { image?: string; priceRange?: string } = {},
): Record<string, unknown> {
  const sameAs = [s.googleMapsUrl, s.instagram, s.facebook].filter(Boolean);
  const common = {
    "@context": "https://schema.org",
    "@id": `${base}/#business`,
    name: s.storeName,
    url: `${base}/`,
    logo: `${base}/icon.svg`,
    ...(s.tagline ? { description: s.tagline } : {}),
    ...(s.phone || s.whatsapp ? { telephone: s.phone || s.whatsapp } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
  if (!hasPhysicalLocation(s)) return { ...common, "@type": "Organization" };

  const lat = Number(s.latitude);
  const lng = Number(s.longitude);
  return {
    ...common,
    "@type": s.businessType,
    image: extra.image ?? `${base}/icon.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: s.city,
      ...(s.postalCode ? { postalCode: s.postalCode } : {}),
      ...(s.region ? { addressRegion: s.region } : {}),
      ...(s.country ? { addressCountry: s.country } : {}),
    },
    ...(s.latitude && s.longitude && Number.isFinite(lat) && Number.isFinite(lng)
      ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } }
      : {}),
    ...(s.googleMapsUrl ? { hasMap: s.googleMapsUrl } : {}),
    ...(s.openingHours.length > 0
      ? {
          openingHoursSpecification: s.openingHours.map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${DAY_NAMES[h.day]}`,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
    ...(extra.priceRange ? { priceRange: extra.priceRange } : {}),
  };
}

/** Homepage <title> in Google: the custom search title, else "Store — tagline". */
export function homeSearchTitle(s: Pick<StoreSettings, "seoTitle" | "storeName" | "tagline">): string {
  return s.seoTitle || (s.tagline ? `${s.storeName} — ${s.tagline}` : s.storeName);
}

/** Homepage description in Google: the custom one, else the intro text, else the tagline. */
export function homeSearchDescription(s: Pick<StoreSettings, "seoDescription" | "heroSubtitle" | "tagline">): string {
  return s.seoDescription || s.heroSubtitle || s.tagline;
}

/**
 * Lower-case, accent-free text for keyword matching ("Été" matches "ete"),
 * with simple plurals folded so "Cartes NFC" counts for "carte NFC".
 */
export function normaliseForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([a-z]{3,})[sx]\b/g, "$1");
}

export function splitKeywords(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(",")
    .map((k) => k.trim().replace(/\s+/g, " "))
    .filter((k) => {
      const key = normaliseForSearch(k);
      if (!k || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
