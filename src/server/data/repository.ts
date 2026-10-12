import type {
  Actor,
  AuditLog,
  Business,
  BusinessStatus,
  CardStatus,
  ContactRequest,
  DateRange,
  DeletionRequest,
  DeletionScope,
  DeletionStatus,
  EventType,
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
  Membership,
  NfcCard,
  PublicBusiness,
  Rating,
  Subscription,
  SubscriptionStatus,
  UserSummary,
} from "@/lib/types";
import type { BusinessProfileInput, LocationInput } from "@/lib/validation";

/**
 * Data-access contract. Two implementations:
 *  - supabase/: Postgres + RLS; queries run with the signed-in user's JWT so
 *    the database enforces tenant isolation as a second layer.
 *  - demo/: in-memory seeded data for local development without credentials.
 *
 * Every business-scoped method receives the `Actor` and MUST verify access
 * itself (defence in depth on top of the guards in server/auth/guards.ts).
 */

export class AccessDeniedError extends Error {
  constructor() {
    super("Access denied");
    this.name = "AccessDeniedError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(public readonly field: string) {
    super(`Conflict on ${field}`);
    this.name = "ConflictError";
  }
}

export interface MembershipWithBusiness {
  role: MemberRole;
  business: Pick<Business, "id" | "name" | "slug" | "logoUrl" | "status" | "isDemo">;
}

export interface FeedbackQuery {
  range: DateRange;
  locationId?: string | null;
  page?: number;
  pageSize?: number;
  rating?: Rating | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicRepository {
  getPublicBusiness(slug: string, locationSlug?: string): Promise<PublicBusiness | null>;
  /** Returns the stored, validated Google review URL (location override first). */
  getGoogleReviewUrl(slug: string, locationSlug?: string): Promise<string | null>;
  submitFeedback(input: {
    slug: string;
    locationSlug?: string;
    cardCode?: string;
    rating: Rating;
    source: FeedbackSource;
  }): Promise<"ok" | "not_found">;
  recordEvent(input: { slug: string; locationSlug?: string; cardCode?: string; type: EventType }): Promise<void>;
  resolveCard(code: string): Promise<{ slug: string; locationSlug: string | null } | null>;
  createContactRequest(input: Omit<ContactRequest, "id" | "createdAt">): Promise<void>;
  createPublicDeletionRequest(input: { email: string; scope: DeletionScope; details: string | null }): Promise<void>;
  /** Records explicit, opt-in marketing consent. tokenHash = sha256(raw unsubscribe token). */
  subscribeMarketing(input: { email: string; source: string; tokenHash: string }): Promise<void>;
  /** One-click unsubscribe. Returns false if the token is unknown. */
  unsubscribe(tokenHash: string): Promise<boolean>;
  getLegalDocument(slug: LegalSlug, locale: Locale): Promise<LegalDocument | null>;
}

export interface BusinessRepository {
  listMemberships(actor: Actor): Promise<MembershipWithBusiness[]>;
  /** Self-service signup: creates a business owned by the actor, with a trial subscription. */
  createOwnedBusiness(actor: Actor, input: { name: string; slug: string }): Promise<Business>;
  getRole(actor: Actor, businessId: string): Promise<MemberRole | null>;
  getBusiness(actor: Actor, businessId: string): Promise<Business>;
  updateBusinessProfile(actor: Actor, businessId: string, input: BusinessProfileInput): Promise<Business>;
  setBusinessLogo(actor: Actor, businessId: string, file: { bytes: Uint8Array; contentType: string }): Promise<string>;
  setRetention(actor: Actor, businessId: string, months: number): Promise<void>;

  listLocations(actor: Actor, businessId: string): Promise<Location[]>;
  createLocation(actor: Actor, businessId: string, input: LocationInput): Promise<Location>;
  updateLocation(actor: Actor, businessId: string, locationId: string, input: LocationInput): Promise<Location>;
  deleteLocation(actor: Actor, businessId: string, locationId: string): Promise<void>;

  getStats(actor: Actor, businessId: string, range: DateRange, locationId?: string | null): Promise<FeedbackStats>;
  listFeedback(actor: Actor, businessId: string, query: FeedbackQuery): Promise<Paged<Feedback>>;
  exportFeedback(actor: Actor, businessId: string): Promise<Feedback[]>;

  listCards(actor: Actor, businessId: string): Promise<NfcCard[]>;
  getCard(actor: Actor, businessId: string, cardId: string): Promise<NfcCard>;
  createCard(actor: Actor, businessId: string, input: { label: string; locationId: string | null }): Promise<NfcCard>;
  updateCard(
    actor: Actor,
    businessId: string,
    cardId: string,
    input: { label?: string; locationId?: string | null; status?: CardStatus },
  ): Promise<NfcCard>;

  getSubscription(actor: Actor, businessId: string): Promise<Subscription | null>;
  listInvoices(actor: Actor, businessId: string): Promise<Invoice[]>;
  setCancelAtPeriodEnd(actor: Actor, businessId: string, cancel: boolean): Promise<Subscription>;

  createDeletionRequest(
    actor: Actor,
    input: { scope: DeletionScope; details: string | null; businessId: string | null },
  ): Promise<void>;
  listMyDeletionRequests(actor: Actor): Promise<DeletionRequest[]>;
}

export interface AdminRepository {
  overview(actor: Actor): Promise<{
    businesses: number;
    activeBusinesses: number;
    users: number;
    feedbackLast30: number;
    googleClicksLast30: number;
    pendingDeletionRequests: number;
  }>;
  listBusinesses(actor: Actor): Promise<(Business & { locations: number; cards: number; feedback: number })[]>;
  getBusiness(actor: Actor, businessId: string): Promise<Business>;
  createBusiness(actor: Actor, input: BusinessProfileInput & { slug: string; status: BusinessStatus }): Promise<Business>;
  updateBusiness(actor: Actor, businessId: string, input: BusinessProfileInput & { slug: string; status: BusinessStatus }): Promise<Business>;
  setBusinessStatus(actor: Actor, businessId: string, status: BusinessStatus): Promise<void>;
  deleteBusiness(actor: Actor, businessId: string): Promise<void>;

  listAllCards(actor: Actor): Promise<(NfcCard & { businessName: string; businessSlug: string; locationSlug: string | null })[]>;
  listRecentFeedback(actor: Actor, limit: number): Promise<(Feedback & { businessName: string })[]>;

  listUsers(actor: Actor): Promise<(UserSummary & { memberships: (Membership & { businessName: string })[] })[]>;
  setMembership(actor: Actor, input: { email: string; businessId: string; role: MemberRole }): Promise<void>;
  removeMembership(actor: Actor, input: { userId: string; businessId: string }): Promise<void>;
  setPlatformAdmin(actor: Actor, userId: string, isAdmin: boolean): Promise<void>;

  listSubscriptions(actor: Actor): Promise<(Subscription & { businessName: string })[]>;
  upsertSubscription(
    actor: Actor,
    input: { businessId: string; planId: string; interval: "month" | "year"; status: SubscriptionStatus; currentPeriodEnd: string },
  ): Promise<void>;
  createInvoice(actor: Actor, input: { businessId: string; amountMinor: number; description: string }): Promise<void>;
  setInvoiceStatus(actor: Actor, invoiceId: string, status: InvoiceStatus): Promise<void>;
  listAllInvoices(actor: Actor): Promise<(Invoice & { businessName: string })[]>;

  listDeletionRequests(actor: Actor): Promise<DeletionRequest[]>;
  updateDeletionRequest(actor: Actor, id: string, status: DeletionStatus, note: string | null): Promise<void>;

  listContactRequests(actor: Actor): Promise<ContactRequest[]>;

  listAuditLogs(actor: Actor, limit: number): Promise<AuditLog[]>;

  listLegalDocuments(actor: Actor): Promise<LegalDocument[]>;
  publishLegalDocument(actor: Actor, input: { slug: LegalSlug; locale: Locale; title: string; bodyMd: string }): Promise<void>;
}

export interface AuditWriter {
  audit(actor: Actor | null, action: string, targetType: string, targetId: string | null, metadata?: AuditLog["metadata"]): Promise<void>;
}

export interface MaintenanceRepository {
  /** Deletes data past its retention period. Returns counts per table. */
  purgeExpiredData(): Promise<Record<string, number>>;
}

export interface Repository extends PublicRepository, BusinessRepository, AuditWriter {
  admin: AdminRepository;
  maintenance: MaintenanceRepository;
}

/** Role ordering for "at least this role" checks. */
export const ROLE_RANK: Record<MemberRole, number> = { viewer: 1, manager: 2, owner: 3 };

export function roleAtLeast(role: MemberRole | null, min: MemberRole): boolean {
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[min];
}
