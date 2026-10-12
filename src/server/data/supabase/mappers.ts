import "server-only";
import type {
  AuditLog,
  Business,
  BusinessStatus,
  CardStatus,
  ContactRequest,
  DeletionRequest,
  DeletionScope,
  DeletionStatus,
  Feedback,
  FeedbackSource,
  FeedbackStats,
  Invoice,
  InvoiceStatus,
  LegalDocument,
  LegalSlug,
  Locale,
  Location,
  MemberRole,
  NfcCard,
  OpeningHours,
  PublicBusiness,
  Rating,
  SocialLinks,
  Subscription,
  SubscriptionStatus,
} from "@/lib/types";
import { env } from "@/server/env";

/**
 * snake_case database rows → camelCase domain types. Row interfaces describe
 * exactly what the queries select; jsonb values are re-validated on the way
 * out because they are only shape-checked ("is an object") by the database.
 */

export const LOGO_BUCKET = "business-logos";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  logo_alt: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  description: string | null;
  google_review_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_hours: unknown;
  social_links: unknown;
  default_locale: string;
  status: BusinessStatus;
  feedback_retention_months: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationRow {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  google_review_url: string | null;
  opening_hours: unknown;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  code: string;
  business_id: string;
  location_id: string | null;
  label: string;
  status: CardStatus;
  created_at: string;
  updated_at: string;
}

export interface FeedbackRow {
  id: string;
  business_id: string;
  location_id: string | null;
  card_id: string | null;
  rating: number;
  source: FeedbackSource;
  created_at: string;
}

export const FEEDBACK_COLUMNS = "id, business_id, location_id, card_id, rating, source, created_at";

export interface MemberRow {
  business_id: string;
  user_id: string;
  role: MemberRole;
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  business_id: string;
  plan_id: string;
  interval: "month" | "year";
  status: SubscriptionStatus;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  business_id: string;
  number: string;
  amount_minor: number;
  currency: string;
  status: InvoiceStatus;
  description: string;
  issued_at: string;
  paid_at: string | null;
}

export interface DeletionRequestRow {
  id: string;
  email: string;
  scope: DeletionScope;
  details: string | null;
  business_id: string | null;
  requester_user_id: string | null;
  status: DeletionStatus;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: unknown;
  created_at: string;
}

export interface LegalDocumentRow {
  slug: LegalSlug;
  locale: string;
  title: string;
  body_md: string;
  version: number;
  published_at: string;
}

export interface ContactRequestRow {
  id: string;
  name: string;
  email: string;
  business_name: string | null;
  message: string;
  marketing_opt_in: boolean;
  created_at: string;
}

/** Shape returned by the get_public_business RPC. */
export interface PublicBusinessJson {
  name: string;
  slug: string;
  logo_path: string | null;
  logo_alt: string | null;
  brand_primary: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  opening_hours: unknown;
  social_links: unknown;
  default_locale: string;
  is_demo: boolean;
  has_google_review_url: boolean;
  location: { name: string; slug: string; address: string | null; phone: string | null } | null;
}

/** Shape returned by the get_feedback_stats RPC. */
export interface StatsJson {
  total: number;
  average: number | null;
  distribution: Partial<Record<"1" | "2" | "3" | "4" | "5", number>>;
  series: { day: string; count: number; average: number | null }[];
  events: Partial<Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SOCIAL = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickStrings<K extends string>(value: unknown, keys: readonly K[]): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  if (!isRecord(value)) return out;
  for (const key of keys) {
    const v = value[key];
    if (typeof v === "string" && v !== "") out[key] = v;
  }
  return out;
}

function toOpeningHours(value: unknown): OpeningHours {
  return pickStrings(value, DAYS);
}

function toSocialLinks(value: unknown): SocialLinks {
  return pickStrings(value, SOCIAL);
}

function toLocale(value: string): Locale {
  return value === "fr" || value === "ar" ? value : "en";
}

function toRating(value: number): Rating {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  throw new Error("Invalid rating in database");
}

/** Public URL of an object in the (public) logo bucket. */
export function logoUrl(path: string | null): string | null {
  if (!path || !env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${encoded}`;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapBusiness(r: BusinessRow): Business {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    logoUrl: logoUrl(r.logo_path),
    logoAlt: r.logo_alt,
    brandPrimary: r.brand_primary,
    brandAccent: r.brand_accent,
    description: r.description,
    googleReviewUrl: r.google_review_url,
    website: r.website,
    phone: r.phone,
    email: r.email,
    address: r.address,
    openingHours: toOpeningHours(r.opening_hours),
    socialLinks: toSocialLinks(r.social_links),
    defaultLocale: toLocale(r.default_locale),
    status: r.status,
    feedbackRetentionMonths: r.feedback_retention_months,
    isDemo: r.is_demo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapPublicBusiness(j: PublicBusinessJson): PublicBusiness {
  return {
    name: j.name,
    slug: j.slug,
    logoUrl: logoUrl(j.logo_path),
    logoAlt: j.logo_alt,
    brandPrimary: j.brand_primary,
    description: j.description,
    website: j.website,
    phone: j.phone,
    address: j.address,
    openingHours: toOpeningHours(j.opening_hours),
    socialLinks: toSocialLinks(j.social_links),
    defaultLocale: toLocale(j.default_locale),
    hasGoogleReviewUrl: j.has_google_review_url === true,
    isDemo: j.is_demo === true,
    location: j.location
      ? { name: j.location.name, slug: j.location.slug, address: j.location.address, phone: j.location.phone }
      : null,
  };
}

export function mapLocation(r: LocationRow): Location {
  return {
    id: r.id,
    businessId: r.business_id,
    name: r.name,
    slug: r.slug,
    address: r.address,
    phone: r.phone,
    googleReviewUrl: r.google_review_url,
    openingHours: toOpeningHours(r.opening_hours),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapCard(r: CardRow): NfcCard {
  return {
    id: r.id,
    code: r.code,
    businessId: r.business_id,
    locationId: r.location_id,
    label: r.label,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapFeedback(r: FeedbackRow): Feedback {
  return {
    id: r.id,
    businessId: r.business_id,
    locationId: r.location_id,
    cardId: r.card_id,
    rating: toRating(r.rating),
    source: r.source,
    createdAt: r.created_at,
  };
}

export function mapSubscription(r: SubscriptionRow): Subscription {
  return {
    id: r.id,
    businessId: r.business_id,
    planId: r.plan_id,
    interval: r.interval,
    status: r.status,
    currentPeriodEnd: r.current_period_end,
    cancelAtPeriodEnd: r.cancel_at_period_end,
    createdAt: r.created_at,
  };
}

export function mapInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    businessId: r.business_id,
    number: r.number,
    amountMinor: r.amount_minor,
    currency: r.currency,
    status: r.status,
    issuedAt: r.issued_at,
    paidAt: r.paid_at,
    description: r.description,
  };
}

export function mapDeletionRequest(r: DeletionRequestRow): DeletionRequest {
  return {
    id: r.id,
    email: r.email,
    scope: r.scope,
    details: r.details,
    businessId: r.business_id,
    requesterUserId: r.requester_user_id,
    status: r.status,
    resolutionNote: r.resolution_note,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

export function mapAuditLog(r: AuditLogRow): AuditLog {
  const metadata: AuditLog["metadata"] = {};
  if (isRecord(r.metadata)) {
    for (const [key, v] of Object.entries(r.metadata)) {
      if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") metadata[key] = v;
    }
  }
  return {
    id: r.id,
    actorUserId: r.actor_user_id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    metadata,
    createdAt: r.created_at,
  };
}

export function mapLegalDocument(r: LegalDocumentRow): LegalDocument {
  return {
    slug: r.slug,
    locale: toLocale(r.locale),
    title: r.title,
    bodyMd: r.body_md,
    version: r.version,
    publishedAt: r.published_at,
  };
}

export function mapContactRequest(r: ContactRequestRow): ContactRequest {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    businessName: r.business_name,
    message: r.message,
    marketingOptIn: r.marketing_opt_in,
    createdAt: r.created_at,
  };
}

export function mapStats(j: StatsJson): FeedbackStats {
  const d = j.distribution;
  const e = j.events;
  return {
    total: Number(j.total) || 0,
    average: j.average === null ? null : Number(j.average),
    distribution: { 1: d["1"] ?? 0, 2: d["2"] ?? 0, 3: d["3"] ?? 0, 4: d["4"] ?? 0, 5: d["5"] ?? 0 },
    series: j.series.map((p) => ({
      day: p.day,
      count: Number(p.count),
      average: p.average === null ? null : Number(p.average),
    })),
    pageViews: e.page_view ?? 0,
    nfcVisits: e.nfc_visit ?? 0,
    qrScans: e.qr_scan ?? 0,
    googleClicks: e.google_review_clicked ?? 0,
    feedbackSubmittedEvents: e.feedback_submitted ?? 0,
  };
}
