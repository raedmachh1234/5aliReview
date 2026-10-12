/**
 * Domain types shared by the server data layer and UI.
 * Note what is NOT here: customer names, emails, phones, IPs or device data.
 * Feedback is a rating + business/location identifiers + timestamp only.
 */

export type Locale = "en" | "fr" | "ar";

export type BusinessStatus = "active" | "suspended";
export type MemberRole = "owner" | "manager" | "viewer";
export type FeedbackSource = "nfc" | "qr" | "link";
export type CardStatus = "active" | "inactive";
export type EventType =
  | "page_view"
  | "nfc_visit"
  | "qr_scan"
  | "feedback_submitted"
  | "google_review_clicked";

export type Rating = 1 | 2 | 3 | 4 | 5;

export type OpeningHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", string>
>;

export type SocialLinks = Partial<Record<"instagram" | "facebook" | "tiktok" | "linkedin" | "x", string>>;

export interface Business {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoAlt: string | null;
  brandPrimary: string | null;
  brandAccent: string | null;
  description: string | null;
  googleReviewUrl: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingHours: OpeningHours;
  socialLinks: SocialLinks;
  defaultLocale: Locale;
  status: BusinessStatus;
  feedbackRetentionMonths: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  googleReviewUrl: string | null;
  openingHours: OpeningHours;
  createdAt: string;
  updatedAt: string;
}

/** Only fields safe to show to anonymous customers. */
export interface PublicBusiness {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoAlt: string | null;
  brandPrimary: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  openingHours: OpeningHours;
  socialLinks: SocialLinks;
  defaultLocale: Locale;
  hasGoogleReviewUrl: boolean;
  isDemo: boolean;
  location: { name: string; slug: string; address: string | null; phone: string | null } | null;
}

export interface Feedback {
  id: string;
  businessId: string;
  locationId: string | null;
  cardId: string | null;
  rating: Rating;
  source: FeedbackSource;
  createdAt: string;
}

export interface NfcCard {
  id: string;
  code: string;
  businessId: string;
  locationId: string | null;
  label: string;
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  businessId: string;
  userId: string;
  role: MemberRole;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  businessId: string;
  planId: string;
  interval: "month" | "year";
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export type InvoiceStatus = "open" | "paid" | "void" | "refunded";

export interface Invoice {
  id: string;
  businessId: string;
  number: string;
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
  description: string;
}

export type DeletionScope = "account" | "business" | "marketing" | "other";
export type DeletionStatus = "pending" | "in_progress" | "completed" | "rejected";

export interface DeletionRequest {
  id: string;
  email: string;
  scope: DeletionScope;
  details: string | null;
  businessId: string | null;
  requesterUserId: string | null;
  status: DeletionStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export type LegalSlug = "privacy" | "terms" | "refunds" | "cookies" | "subprocessors";

export interface LegalDocument {
  slug: LegalSlug;
  locale: Locale;
  title: string;
  bodyMd: string;
  version: number;
  publishedAt: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
  message: string;
  marketingOptIn: boolean;
  createdAt: string;
}

/** Date range used by dashboard analytics (inclusive start, exclusive end, ISO strings). */
export interface DateRange {
  from: string;
  to: string;
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  count: number;
  average: number | null;
}

export interface FeedbackStats {
  total: number;
  average: number | null;
  distribution: Record<Rating, number>;
  series: DailyPoint[];
  pageViews: number;
  nfcVisits: number;
  qrScans: number;
  googleClicks: number;
  feedbackSubmittedEvents: number;
}

export interface Actor {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
}
