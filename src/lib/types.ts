export type ProductStatus = "published" | "draft";

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** One-line summary shown on cards. */
  tagline: string;
  /** Long description; line breaks are preserved. */
  description: string;
  price: number;
  /** Original price, shown struck through when higher than `price`. */
  compareAtPrice: number | null;
  sku: string;
  /** `null` means stock is not tracked (always available). */
  stock: number | null;
  category: string;
  tags: string[];
  /** Ordered image URLs; the first one is the cover. */
  images: string[];
  specs: ProductSpec[];
  status: ProductStatus;
  featured: boolean;
  /** Title and description shown in Google results; empty falls back to name and tagline. */
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export function toProductInput(product: Product): ProductInput {
  const input: Partial<Product> = { ...product };
  delete input.id;
  delete input.createdAt;
  delete input.updatedAt;
  return input as ProductInput;
}

export const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
export type DayCode = (typeof DAYS)[number];

/** One opening interval per open day, "HH:MM" 24-hour times. Days not listed are closed. */
export interface OpeningHours {
  day: DayCode;
  opens: string;
  closes: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  /** Wrap a word in *asterisks* to highlight it. */
  heroTitle: string;
  heroSubtitle: string;
  /** Optional strip above the header; empty hides it. */
  announcement: string;
  /** ISO 4217 code, e.g. "TND". */
  currency: string;
  accentColor: string;
  whatsapp: string;
  phone: string;
  email: string;
  /** Street address (with postal code, city, region and country below). */
  address: string;
  postalCode: string;
  city: string;
  region: string;
  /** ISO 3166-1 alpha-2, e.g. "TN". */
  country: string;
  /** Decimal degrees as typed, e.g. "36.8065"; empty when unknown. */
  latitude: string;
  longitude: string;
  openingHours: OpeningHours[];
  /** schema.org LocalBusiness type, e.g. "Store", or "online" when there's no shop to visit. */
  businessType: string;
  /** Google Business Profile links. */
  googleMapsUrl: string;
  googleReviewUrl: string;
  instagram: string;
  facebook: string;
  /** Homepage title and description in Google results; empty falls back to name and tagline. */
  seoTitle: string;
  seoDescription: string;
  /** Comma-separated words customers search for; the admin checks your content against them. */
  seoKeywords: string;
  /** Google Search Console "HTML tag" verification code. */
  googleSiteVerification: string;
}

export type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const idleState: FormState = { status: "idle" };
