import { z } from "zod";
import { BUSINESS_TYPES, isGoogleUrl, splitKeywords } from "./business";
import { isHexColor } from "./contrast";
import { slugify } from "./slug";
import { DAYS, type OpeningHours, type ProductInput, type ProductSpec, type StoreSettings } from "./types";

/**
 * Parsing of the admin forms. Everything arrives as FormData strings, so each
 * field is trimmed, length-limited and converted here; the result is either
 * clean data or a map of field name → message for the form to display.
 */
export type ParseResult<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string> };

export const LIMITS = {
  name: 120,
  tagline: 160,
  description: 5000,
  sku: 64,
  category: 60,
  tags: 20,
  tag: 30,
  images: 12,
  specs: 30,
  specLabel: 60,
  specValue: 200,
  maxPrice: 10_000_000,
  maxStock: 1_000_000,
  // Google shows roughly 60 title and 155 description characters.
  seoTitle: 70,
  seoDescription: 160,
} as const;

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

/** Accepts "49", "49.5" and "49,5" (comma decimal separator). */
function parseAmount(raw: string): number | null {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(raw)) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ");
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

export function parseProductForm(formData: FormData, isAllowedImage: (url: string) => boolean): ParseResult<ProductInput> {
  const errors: Record<string, string> = {};
  const tooLong = (key: string, value: string, max: number, label: string) => {
    if (value.length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
  };

  const name = text(formData, "name");
  if (!name) errors.name = "Give the product a name.";
  tooLong("name", name, LIMITS.name, "Name");

  const rawSlug = text(formData, "slug");
  const slug = slugify(rawSlug || name);

  const tagline = text(formData, "tagline");
  tooLong("tagline", tagline, LIMITS.tagline, "Short description");

  const description = (formData.get("description") as string | null)?.replace(/\r\n/g, "\n").trim() ?? "";
  tooLong("description", description, LIMITS.description, "Description");

  const priceRaw = text(formData, "price");
  const price = parseAmount(priceRaw);
  if (!priceRaw) errors.price = "Enter a price.";
  else if (price === null || price > LIMITS.maxPrice) errors.price = "Enter a valid price, e.g. 49 or 49.500.";

  const compareRaw = text(formData, "compareAtPrice");
  let compareAtPrice: number | null = null;
  if (compareRaw) {
    compareAtPrice = parseAmount(compareRaw);
    if (compareAtPrice === null || compareAtPrice > LIMITS.maxPrice) errors.compareAtPrice = "Enter a valid amount.";
    else if (price !== null && compareAtPrice <= price) errors.compareAtPrice = "Must be higher than the price to show a discount.";
  }

  const sku = text(formData, "sku");
  tooLong("sku", sku, LIMITS.sku, "SKU");

  let stock: number | null = null;
  if (formData.get("trackStock") === "on") {
    const stockRaw = text(formData, "stock");
    const n = Number(stockRaw);
    if (!/^\d+$/.test(stockRaw) || n > LIMITS.maxStock) errors.stock = "Enter a whole number of 0 or more.";
    else stock = n;
  }

  const category = text(formData, "category").replace(/\s+/g, " ");
  tooLong("category", category, LIMITS.category, "Category");

  const tags = parseTags(text(formData, "tags"));
  if (tags.length > LIMITS.tags) errors.tags = `Use at most ${LIMITS.tags} tags.`;
  else if (tags.some((t) => t.length > LIMITS.tag)) errors.tags = `Each tag must be ${LIMITS.tag} characters or fewer.`;

  const images = formData.getAll("images").filter((v): v is string => typeof v === "string" && v.length > 0);
  if (images.length > LIMITS.images) errors.images = `Use at most ${LIMITS.images} images.`;
  else if (images.some((url) => !isAllowedImage(url))) errors.images = "One of the images is not valid. Remove it and upload it again.";

  const labels = formData.getAll("specLabel");
  const values = formData.getAll("specValue");
  const specs: ProductSpec[] = [];
  for (let i = 0; i < Math.max(labels.length, values.length); i++) {
    const label = String(labels[i] ?? "").trim();
    const value = String(values[i] ?? "").trim();
    if (!label && !value) continue;
    if (!label || !value) {
      errors.specs = "Each specification needs both a name and a value.";
      break;
    }
    if (label.length > LIMITS.specLabel || value.length > LIMITS.specValue) {
      errors.specs = `Keep names under ${LIMITS.specLabel} and values under ${LIMITS.specValue} characters.`;
      break;
    }
    specs.push({ label, value });
  }
  if (specs.length > LIMITS.specs) errors.specs = `Use at most ${LIMITS.specs} specifications.`;

  const status = formData.get("status") === "published" ? "published" : "draft";
  const featured = formData.get("featured") === "on";

  const seoTitle = text(formData, "seoTitle");
  tooLong("seoTitle", seoTitle, LIMITS.seoTitle, "Search title");
  const seoDescription = text(formData, "seoDescription").replace(/\s+/g, " ");
  tooLong("seoDescription", seoDescription, LIMITS.seoDescription, "Search description");

  if (Object.keys(errors).length > 0 || price === null) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: {
      slug,
      name,
      tagline,
      description,
      price,
      compareAtPrice,
      sku,
      stock,
      category,
      tags,
      images,
      specs,
      status,
      featured,
      seoTitle,
      seoDescription,
    },
  };
}

const phone = z
  .string()
  .max(30, "Keep it under 30 characters.")
  .regex(/^[+\d\s().-]*$/, "Use digits, spaces and + only.");

const optionalUrl = z.union([z.literal(""), z.url({ protocol: /^https$/, error: "Enter a full https:// link." })]);

const optionalGoogleUrl = z.union([
  z.literal(""),
  z.string().refine(isGoogleUrl, "Paste the https:// link Google gives you (maps.app.goo.gl, g.page or google.com)."),
]);

const coordinate = (max: number) =>
  z.union([
    z.literal(""),
    z
      .string()
      .regex(/^-?\d{1,3}(\.\d{1,8})?$/, "Use decimal degrees, e.g. 36.8065.")
      .refine((v) => Math.abs(Number(v)) <= max, `Must be between -${max} and ${max}.`),
  ]);

/**
 * Search Console's "HTML tag" method gives a whole tag:
 * <meta name="google-site-verification" content="abc123" />. Accept either
 * that or just the code, and keep only the code.
 */
export function extractVerificationToken(raw: string): string {
  const fromTag = raw.match(/content\s*=\s*["']([^"']*)["']/i);
  return (fromTag ? fromTag[1] : raw).trim();
}

const settingsSchema = z.object({
  storeName: z.string().min(1, "Give your store a name.").max(60, "Keep it under 60 characters."),
  tagline: z.string().max(120, "Keep it under 120 characters."),
  heroTitle: z.string().max(120, "Keep it under 120 characters."),
  heroSubtitle: z.string().max(280, "Keep it under 280 characters."),
  announcement: z.string().max(140, "Keep it under 140 characters."),
  currency: z.string().refine(isSupportedCurrency, "Choose a valid currency code, e.g. TND."),
  accentColor: z.string().refine(isHexColor, "Use a hex colour such as #4f46e5."),
  whatsapp: phone,
  phone,
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  address: z.string().max(200, "Keep it under 200 characters."),
  postalCode: z.string().max(12, "Keep it under 12 characters.").regex(/^[\w -]*$/, "Use letters, digits and spaces."),
  city: z.string().max(80, "Keep it under 80 characters."),
  region: z.string().max(80, "Keep it under 80 characters."),
  country: z.union([z.literal(""), z.string().regex(/^[A-Z]{2}$/, "Use the 2-letter country code, e.g. TN.")]),
  latitude: coordinate(90),
  longitude: coordinate(180),
  businessType: z.enum(BUSINESS_TYPES.map((t) => t.value) as [string, ...string[]], "Choose a business type."),
  googleMapsUrl: optionalGoogleUrl,
  googleReviewUrl: optionalGoogleUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  seoTitle: z.string().max(LIMITS.seoTitle, `Keep it under ${LIMITS.seoTitle} characters.`),
  seoDescription: z.string().max(LIMITS.seoDescription, `Keep it under ${LIMITS.seoDescription} characters.`),
  seoKeywords: z
    .string()
    .max(1000, "That’s a lot of keywords — keep the list under 1000 characters.")
    .refine((v) => splitKeywords(v).length <= 30, "Use at most 30 keywords — focus on the ones that matter most."),
  googleSiteVerification: z
    .string()
    .max(100, "That code is too long — paste only the content value.")
    .regex(/^[\w-]*$/, "Paste the code from Search Console (letters, numbers, - and _)."),
});

export function isSupportedCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Opening hours arrive as open_Mo (checkbox), opens_Mo and closes_Mo for each day. */
export function parseOpeningHours(formData: FormData): { hours: OpeningHours[]; error?: string } {
  const hours: OpeningHours[] = [];
  for (const day of DAYS) {
    if (formData.get(`open_${day}`) !== "on") continue;
    const opens = text(formData, `opens_${day}`);
    const closes = text(formData, `closes_${day}`);
    if (!TIME.test(opens) || !TIME.test(closes)) return { hours, error: "Enter opening and closing times for each open day." };
    if (opens >= closes) return { hours, error: "Closing time must be later than opening time." };
    hours.push({ day, opens, closes });
  }
  return { hours };
}

export function parseSettingsForm(formData: FormData): ParseResult<StoreSettings> {
  const raw = Object.fromEntries(Object.keys(settingsSchema.shape).map((key) => [key, text(formData, key)]));
  raw.currency = raw.currency.toUpperCase();
  raw.accentColor = raw.accentColor.toLowerCase();
  raw.country = raw.country.toUpperCase();
  raw.seoDescription = raw.seoDescription.replace(/\s+/g, " ");
  raw.googleSiteVerification = extractVerificationToken(raw.googleSiteVerification);
  const result = settingsSchema.safeParse(raw);
  const { hours, error: hoursError } = parseOpeningHours(formData);

  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
  }
  if (hoursError) fieldErrors.openingHours = hoursError;
  if (!result.success || hoursError) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: { ...result.data, seoKeywords: splitKeywords(result.data.seoKeywords).join(", "), openingHours: hours },
  };
}
