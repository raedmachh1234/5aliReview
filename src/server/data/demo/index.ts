import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import type {
  Actor,
  EventType,
  Feedback,
  FeedbackStats,
  Location,
  MemberRole,
  NfcCard,
  PublicBusiness,
  Rating,
} from "@/lib/types";
import { getPlan } from "@/config/plans";
import {
  AccessDeniedError,
  ConflictError,
  NotFoundError,
  roleAtLeast,
  type Repository,
} from "../repository";
import { createSeed, type DemoStore, type EventCount } from "./seed";

/**
 * In-memory repository for DEMO MODE (no Supabase credentials).
 * Data lives in process memory and resets on restart. It enforces the same
 * tenant isolation rules as the Postgres RLS policies so that authorization
 * bugs surface during development too.
 */

const globalForDemo = globalThis as unknown as { __5aliDemoStore?: DemoStore };

export function demoStore(): DemoStore {
  if (!globalForDemo.__5aliDemoStore) globalForDemo.__5aliDemoStore = createSeed();
  return globalForDemo.__5aliDemoStore;
}

/** Test helper: start from a fresh seed. */
export function resetDemoStore(now?: Date): DemoStore {
  globalForDemo.__5aliDemoStore = createSeed(now);
  return globalForDemo.__5aliDemoStore;
}

const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCardCode(existing: Set<string>): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!existing.has(code)) return code;
  }
}

function strip<T extends { logoPath?: unknown }>(b: T): Omit<T, "logoPath"> {
  const { logoPath: _ignored, ...rest } = b;
  void _ignored;
  return rest;
}

export function createDemoRepository(): Repository {
  const s = demoStore;

  const roleOf = (actor: Actor, businessId: string): MemberRole | null =>
    s().memberships.find((m) => m.businessId === businessId && m.userId === actor.userId)?.role ?? null;

  /** Mirrors has_business_role(): platform admins pass explicitly. */
  const requireRole = (actor: Actor, businessId: string, min: MemberRole) => {
    if (!s().businesses.some((b) => b.id === businessId)) throw new NotFoundError();
    if (actor.isPlatformAdmin) return;
    if (!roleAtLeast(roleOf(actor, businessId), min)) throw new AccessDeniedError();
  };

  const requireAdmin = (actor: Actor) => {
    const user = s().users.find((u) => u.id === actor.userId);
    if (!user?.isPlatformAdmin) throw new AccessDeniedError();
  };

  const businessById = (id: string) => {
    const b = s().businesses.find((x) => x.id === id);
    if (!b) throw new NotFoundError();
    return b;
  };

  const activeBusinessBySlug = (slug: string) => s().businesses.find((b) => b.slug === slug && b.status === "active");

  const bump = (e: Omit<EventCount, "count">) => {
    const existing = s().events.find(
      (x) => x.businessId === e.businessId && x.locationId === e.locationId && x.cardId === e.cardId && x.day === e.day && x.type === e.type,
    );
    if (existing) existing.count += 1;
    else s().events.push({ ...e, count: 1 });
  };

  const resolveTarget = (slug: string, locationSlug?: string, cardCode?: string) => {
    const business = activeBusinessBySlug(slug);
    if (!business) return null;
    const location = locationSlug
      ? s().locations.find((l) => l.businessId === business.id && l.slug === locationSlug) ?? null
      : null;
    const card = cardCode
      ? s().cards.find((c) => c.code === cardCode && c.businessId === business.id && c.status === "active") ?? null
      : null;
    return { business, location, card };
  };

  const audit: Repository["audit"] = async (actor, action, targetType, targetId, metadata = {}) => {
    s().auditLogs.unshift({
      id: randomUUID(),
      actorUserId: actor?.userId ?? null,
      action,
      targetType,
      targetId,
      metadata,
      createdAt: nowIso(),
    });
  };

  const assertUniqueSlug = (slug: string, exceptId?: string) => {
    if (s().businesses.some((b) => b.slug === slug && b.id !== exceptId)) throw new ConflictError("slug");
  };

  const repo: Repository = {
    // ── Public (anonymous customer flow) ───────────────────────────────────
    async getPublicBusiness(slug, locationSlug) {
      const t = resolveTarget(slug, locationSlug);
      if (!t) return null;
      const { business: b, location: l } = t;
      const result: PublicBusiness = {
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        logoAlt: b.logoAlt,
        brandPrimary: b.brandPrimary,
        description: b.description,
        website: b.website,
        phone: b.phone,
        address: b.address,
        openingHours: b.openingHours,
        socialLinks: b.socialLinks,
        defaultLocale: b.defaultLocale,
        hasGoogleReviewUrl: Boolean(l?.googleReviewUrl || b.googleReviewUrl),
        isDemo: b.isDemo,
        location: l ? { name: l.name, slug: l.slug, address: l.address, phone: l.phone } : null,
      };
      return result;
    },

    async getGoogleReviewUrl(slug, locationSlug) {
      const t = resolveTarget(slug, locationSlug);
      if (!t) return null;
      return t.location?.googleReviewUrl || t.business.googleReviewUrl || null;
    },

    async submitFeedback({ slug, locationSlug, cardCode, rating, source }) {
      if (![1, 2, 3, 4, 5].includes(rating)) return "not_found";
      const t = resolveTarget(slug, locationSlug, cardCode);
      if (!t) return "not_found";
      const locationId = t.location?.id ?? t.card?.locationId ?? null;
      s().feedback.unshift({
        id: randomUUID(),
        businessId: t.business.id,
        locationId,
        cardId: t.card?.id ?? null,
        rating,
        source,
        createdAt: nowIso(),
      });
      bump({ businessId: t.business.id, locationId, cardId: t.card?.id ?? null, day: today(), type: "feedback_submitted" });
      return "ok";
    },

    async recordEvent({ slug, locationSlug, cardCode, type }) {
      const t = resolveTarget(slug, locationSlug, cardCode);
      if (!t) return;
      bump({ businessId: t.business.id, locationId: t.location?.id ?? t.card?.locationId ?? null, cardId: t.card?.id ?? null, day: today(), type });
    },

    async resolveCard(code) {
      const card = s().cards.find((c) => c.code === code && c.status === "active");
      if (!card) return null;
      const business = s().businesses.find((b) => b.id === card.businessId && b.status === "active");
      if (!business) return null;
      const location = card.locationId ? s().locations.find((l) => l.id === card.locationId) : null;
      return { slug: business.slug, locationSlug: location?.slug ?? null };
    },

    async createContactRequest(input) {
      s().contactRequests.unshift({ ...input, id: randomUUID(), createdAt: nowIso() });
    },

    async createPublicDeletionRequest({ email, scope, details }) {
      s().deletionRequests.unshift({
        id: randomUUID(),
        email,
        scope,
        details,
        businessId: null,
        requesterUserId: null,
        status: "pending",
        resolutionNote: null,
        createdAt: nowIso(),
        resolvedAt: null,
      });
    },

    async subscribeMarketing({ email, source, tokenHash }) {
      const existing = s().emailSubscriptions.find((e) => e.email === email);
      if (existing) {
        Object.assign(existing, { consentAt: nowIso(), source, tokenHash, unsubscribedAt: null });
      } else {
        s().emailSubscriptions.push({ email, consentAt: nowIso(), source, tokenHash, unsubscribedAt: null });
      }
    },

    async unsubscribe(tokenHash) {
      const sub = s().emailSubscriptions.find((e) => e.tokenHash === tokenHash);
      if (!sub) return false;
      sub.unsubscribedAt ??= nowIso();
      return true;
    },

    async getLegalDocument(slug, locale) {
      return (
        s()
          .legalDocuments.filter((d) => d.slug === slug && d.locale === locale)
          .sort((a, b) => b.version - a.version)[0] ?? null
      );
    },

    // ── Business dashboard ─────────────────────────────────────────────────
    async listMemberships(actor) {
      return s()
        .memberships.filter((m) => m.userId === actor.userId)
        .map((m) => {
          const b = businessById(m.businessId);
          return { role: m.role, business: { id: b.id, name: b.name, slug: b.slug, logoUrl: b.logoUrl, status: b.status, isDemo: b.isDemo } };
        });
    },

    async createOwnedBusiness(actor, { name, slug }) {
      assertUniqueSlug(slug);
      const ts = nowIso();
      const business: DemoStore["businesses"][number] = {
        id: randomUUID(),
        name,
        slug,
        logoUrl: null,
        logoAlt: null,
        logoPath: null,
        brandPrimary: null,
        brandAccent: null,
        description: null,
        googleReviewUrl: null,
        website: null,
        phone: null,
        email: null,
        address: null,
        openingHours: {},
        socialLinks: {},
        defaultLocale: "en",
        status: "active",
        feedbackRetentionMonths: 24,
        isDemo: true,
        createdAt: ts,
        updatedAt: ts,
      };
      s().businesses.push(business);
      s().memberships.push({ businessId: business.id, userId: actor.userId, role: "owner", createdAt: ts });
      const trialDays = getPlan("starter")?.trialDays ?? 14;
      s().subscriptions.push({
        id: randomUUID(),
        businessId: business.id,
        planId: "starter",
        interval: "month",
        status: "trialing",
        currentPeriodEnd: new Date(Date.now() + trialDays * 86_400_000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: ts,
      });
      await audit(actor, "business.created", "business", business.id);
      return strip(business);
    },

    async getRole(actor, businessId) {
      return roleOf(actor, businessId);
    },

    async getBusiness(actor, businessId) {
      requireRole(actor, businessId, "viewer");
      return strip(businessById(businessId));
    },

    async updateBusinessProfile(actor, businessId, input) {
      requireRole(actor, businessId, "manager");
      const b = businessById(businessId);
      Object.assign(b, {
        name: input.name,
        description: input.description ?? null,
        website: input.website ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        logoAlt: input.logoAlt ?? null,
        brandPrimary: input.brandPrimary ?? null,
        brandAccent: input.brandAccent ?? null,
        defaultLocale: input.defaultLocale,
        googleReviewUrl: input.googleReviewUrl ?? null,
        openingHours: input.openingHours,
        socialLinks: input.socialLinks,
        updatedAt: nowIso(),
      });
      await audit(actor, "business.profile_updated", "business", businessId);
      return strip(b);
    },

    async setBusinessLogo(actor, businessId, file) {
      requireRole(actor, businessId, "manager");
      const b = businessById(businessId);
      // Demo mode keeps the logo in memory as a data URL; Supabase mode uses Storage.
      const url = `data:${file.contentType};base64,${Buffer.from(file.bytes).toString("base64")}`;
      b.logoUrl = url;
      b.updatedAt = nowIso();
      await audit(actor, "business.logo_updated", "business", businessId);
      return url;
    },

    async setRetention(actor, businessId, months) {
      requireRole(actor, businessId, "owner");
      businessById(businessId).feedbackRetentionMonths = months;
      await audit(actor, "business.retention_updated", "business", businessId, { months });
    },

    async listLocations(actor, businessId) {
      requireRole(actor, businessId, "viewer");
      return s()
        .locations.filter((l) => l.businessId === businessId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async createLocation(actor, businessId, input) {
      requireRole(actor, businessId, "manager");
      if (s().locations.some((l) => l.businessId === businessId && l.slug === input.slug)) throw new ConflictError("slug");
      const ts = nowIso();
      const loc: Location = {
        id: randomUUID(),
        businessId,
        name: input.name,
        slug: input.slug,
        address: input.address ?? null,
        phone: input.phone ?? null,
        googleReviewUrl: input.googleReviewUrl ?? null,
        openingHours: {},
        createdAt: ts,
        updatedAt: ts,
      };
      s().locations.push(loc);
      await audit(actor, "location.created", "location", loc.id);
      return loc;
    },

    async updateLocation(actor, businessId, locationId, input) {
      requireRole(actor, businessId, "manager");
      const loc = s().locations.find((l) => l.id === locationId && l.businessId === businessId);
      if (!loc) throw new NotFoundError();
      if (s().locations.some((l) => l.businessId === businessId && l.slug === input.slug && l.id !== locationId)) {
        throw new ConflictError("slug");
      }
      Object.assign(loc, {
        name: input.name,
        slug: input.slug,
        address: input.address ?? null,
        phone: input.phone ?? null,
        googleReviewUrl: input.googleReviewUrl ?? null,
        updatedAt: nowIso(),
      });
      await audit(actor, "location.updated", "location", locationId);
      return loc;
    },

    async deleteLocation(actor, businessId, locationId) {
      requireRole(actor, businessId, "manager");
      const store = s();
      if (!store.locations.some((l) => l.id === locationId && l.businessId === businessId)) throw new NotFoundError();
      store.locations = store.locations.filter((l) => l.id !== locationId);
      // Same as ON DELETE SET NULL in Postgres.
      for (const c of store.cards) if (c.locationId === locationId) c.locationId = null;
      for (const f of store.feedback) if (f.locationId === locationId) f.locationId = null;
      for (const e of store.events) if (e.locationId === locationId) e.locationId = null;
      await audit(actor, "location.deleted", "location", locationId);
    },

    async getStats(actor, businessId, range, locationId) {
      requireRole(actor, businessId, "viewer");
      const inRange = (iso: string) => iso >= range.from && iso < range.to;
      const fromDay = range.from.slice(0, 10);
      const toDay = range.to.slice(0, 10);
      const rows = s().feedback.filter(
        (f) => f.businessId === businessId && inRange(f.createdAt) && (!locationId || f.locationId === locationId),
      );
      const distribution: Record<Rating, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const byDay = new Map<string, { count: number; sum: number }>();
      let sum = 0;
      for (const f of rows) {
        distribution[f.rating] += 1;
        sum += f.rating;
        const day = f.createdAt.slice(0, 10);
        const d = byDay.get(day) ?? { count: 0, sum: 0 };
        d.count += 1;
        d.sum += f.rating;
        byDay.set(day, d);
      }
      const eventTotal = (type: EventType) =>
        s()
          .events.filter(
            (e) => e.businessId === businessId && e.type === type && e.day >= fromDay && e.day < toDay && (!locationId || e.locationId === locationId),
          )
          .reduce((acc, e) => acc + e.count, 0);
      const stats: FeedbackStats = {
        total: rows.length,
        average: rows.length ? sum / rows.length : null,
        distribution,
        series: [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, d]) => ({ day, count: d.count, average: d.sum / d.count })),
        pageViews: eventTotal("page_view"),
        nfcVisits: eventTotal("nfc_visit"),
        qrScans: eventTotal("qr_scan"),
        googleClicks: eventTotal("google_review_clicked"),
        feedbackSubmittedEvents: eventTotal("feedback_submitted"),
      };
      return stats;
    },

    async listFeedback(actor, businessId, { range, locationId, rating, page = 1, pageSize = 25 }) {
      requireRole(actor, businessId, "viewer");
      const rows = s().feedback.filter(
        (f) =>
          f.businessId === businessId &&
          f.createdAt >= range.from &&
          f.createdAt < range.to &&
          (!locationId || f.locationId === locationId) &&
          (!rating || f.rating === rating),
      );
      const start = (page - 1) * pageSize;
      return { items: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
    },

    async exportFeedback(actor, businessId) {
      requireRole(actor, businessId, "manager");
      await audit(actor, "feedback.exported", "business", businessId);
      return s().feedback.filter((f) => f.businessId === businessId).slice(0, 100_000);
    },

    async listCards(actor, businessId) {
      requireRole(actor, businessId, "viewer");
      return s()
        .cards.filter((c) => c.businessId === businessId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getCard(actor, businessId, cardId) {
      requireRole(actor, businessId, "viewer");
      const card = s().cards.find((c) => c.id === cardId && c.businessId === businessId);
      if (!card) throw new NotFoundError();
      return card;
    },

    async createCard(actor, businessId, { label, locationId }) {
      requireRole(actor, businessId, "manager");
      if (locationId && !s().locations.some((l) => l.id === locationId && l.businessId === businessId)) throw new NotFoundError();
      const ts = nowIso();
      const card: NfcCard = {
        id: randomUUID(),
        code: generateCardCode(new Set(s().cards.map((c) => c.code))),
        businessId,
        locationId,
        label,
        status: "active",
        createdAt: ts,
        updatedAt: ts,
      };
      s().cards.push(card);
      await audit(actor, "card.created", "card", card.id);
      return card;
    },

    async updateCard(actor, businessId, cardId, input) {
      requireRole(actor, businessId, "manager");
      const card = s().cards.find((c) => c.id === cardId && c.businessId === businessId);
      if (!card) throw new NotFoundError();
      if (input.locationId && !s().locations.some((l) => l.id === input.locationId && l.businessId === businessId)) {
        throw new NotFoundError();
      }
      if (input.label !== undefined) card.label = input.label;
      if (input.locationId !== undefined) card.locationId = input.locationId;
      if (input.status !== undefined) card.status = input.status;
      card.updatedAt = nowIso();
      await audit(actor, "card.updated", "card", cardId, { status: card.status });
      return card;
    },

    async getSubscription(actor, businessId) {
      requireRole(actor, businessId, "viewer");
      return s().subscriptions.find((x) => x.businessId === businessId) ?? null;
    },

    async listInvoices(actor, businessId) {
      requireRole(actor, businessId, "owner");
      return s()
        .invoices.filter((i) => i.businessId === businessId)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    },

    async setCancelAtPeriodEnd(actor, businessId, cancel) {
      requireRole(actor, businessId, "owner");
      const sub = s().subscriptions.find((x) => x.businessId === businessId);
      if (!sub) throw new NotFoundError();
      sub.cancelAtPeriodEnd = cancel;
      await audit(actor, cancel ? "subscription.cancel_requested" : "subscription.resumed", "subscription", sub.id);
      return sub;
    },

    async createDeletionRequest(actor, { scope, details, businessId }) {
      if (businessId) requireRole(actor, businessId, "owner");
      s().deletionRequests.unshift({
        id: randomUUID(),
        email: actor.email,
        scope,
        details,
        businessId,
        requesterUserId: actor.userId,
        status: "pending",
        resolutionNote: null,
        createdAt: nowIso(),
        resolvedAt: null,
      });
      await audit(actor, "deletion_request.created", "deletion_request", null, { scope });
    },

    async listMyDeletionRequests(actor) {
      return s().deletionRequests.filter((d) => d.requesterUserId === actor.userId);
    },

    audit,

    // ── Platform admin ─────────────────────────────────────────────────────
    admin: {
      async overview(actor) {
        requireAdmin(actor);
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        return {
          businesses: s().businesses.length,
          activeBusinesses: s().businesses.filter((b) => b.status === "active").length,
          users: s().users.length,
          feedbackLast30: s().feedback.filter((f) => f.createdAt >= since).length,
          googleClicksLast30: s()
            .events.filter((e) => e.type === "google_review_clicked" && e.day >= since.slice(0, 10))
            .reduce((a, e) => a + e.count, 0),
          pendingDeletionRequests: s().deletionRequests.filter((d) => d.status === "pending").length,
        };
      },

      async listBusinesses(actor) {
        requireAdmin(actor);
        return s().businesses.map((b) => ({
          ...strip(b),
          locations: s().locations.filter((l) => l.businessId === b.id).length,
          cards: s().cards.filter((c) => c.businessId === b.id).length,
          feedback: s().feedback.filter((f) => f.businessId === b.id).length,
        }));
      },

      async getBusiness(actor, businessId) {
        requireAdmin(actor);
        return strip(businessById(businessId));
      },

      async createBusiness(actor, input) {
        requireAdmin(actor);
        assertUniqueSlug(input.slug);
        const ts = nowIso();
        const b: DemoStore["businesses"][number] = {
          id: randomUUID(),
          name: input.name,
          slug: input.slug,
          logoUrl: null,
          logoPath: null,
          logoAlt: input.logoAlt ?? null,
          brandPrimary: input.brandPrimary ?? null,
          brandAccent: input.brandAccent ?? null,
          description: input.description ?? null,
          googleReviewUrl: input.googleReviewUrl ?? null,
          website: input.website ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          openingHours: input.openingHours,
          socialLinks: input.socialLinks,
          defaultLocale: input.defaultLocale,
          status: input.status,
          feedbackRetentionMonths: 24,
          isDemo: true,
          createdAt: ts,
          updatedAt: ts,
        };
        s().businesses.push(b);
        await audit(actor, "admin.business_created", "business", b.id);
        return strip(b);
      },

      async updateBusiness(actor, businessId, input) {
        requireAdmin(actor);
        assertUniqueSlug(input.slug, businessId);
        const b = businessById(businessId);
        Object.assign(b, {
          name: input.name,
          slug: input.slug,
          status: input.status,
          description: input.description ?? null,
          website: input.website ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          logoAlt: input.logoAlt ?? null,
          brandPrimary: input.brandPrimary ?? null,
          brandAccent: input.brandAccent ?? null,
          defaultLocale: input.defaultLocale,
          googleReviewUrl: input.googleReviewUrl ?? null,
          openingHours: input.openingHours,
          socialLinks: input.socialLinks,
          updatedAt: nowIso(),
        });
        await audit(actor, "admin.business_updated", "business", businessId);
        return strip(b);
      },

      async setBusinessStatus(actor, businessId, status) {
        requireAdmin(actor);
        businessById(businessId).status = status;
        await audit(actor, status === "suspended" ? "admin.business_suspended" : "admin.business_reactivated", "business", businessId);
      },

      async deleteBusiness(actor, businessId) {
        requireAdmin(actor);
        businessById(businessId);
        const store = s();
        // Mirrors ON DELETE CASCADE. Invoices are kept for accounting (business_id retained as a reference).
        store.businesses = store.businesses.filter((b) => b.id !== businessId);
        store.locations = store.locations.filter((l) => l.businessId !== businessId);
        store.memberships = store.memberships.filter((m) => m.businessId !== businessId);
        store.cards = store.cards.filter((c) => c.businessId !== businessId);
        store.feedback = store.feedback.filter((f) => f.businessId !== businessId);
        store.events = store.events.filter((e) => e.businessId !== businessId);
        store.subscriptions = store.subscriptions.filter((x) => x.businessId !== businessId);
        await audit(actor, "admin.business_deleted", "business", businessId);
      },

      async listAllCards(actor) {
        requireAdmin(actor);
        return s().cards.map((c) => {
          const b = s().businesses.find((x) => x.id === c.businessId);
          const l = c.locationId ? s().locations.find((x) => x.id === c.locationId) : null;
          return { ...c, businessName: b?.name ?? "—", businessSlug: b?.slug ?? "", locationSlug: l?.slug ?? null };
        });
      },

      async listRecentFeedback(actor, limit) {
        requireAdmin(actor);
        return s()
          .feedback.slice(0, limit)
          .map((f): Feedback & { businessName: string } => ({
            ...f,
            businessName: s().businesses.find((b) => b.id === f.businessId)?.name ?? "—",
          }));
      },

      async listUsers(actor) {
        requireAdmin(actor);
        return s().users.map(({ passwordHash: _ph, ...u }) => {
          void _ph;
          return {
            ...u,
            memberships: s()
              .memberships.filter((m) => m.userId === u.id)
              .map((m) => ({
                businessId: m.businessId,
                userId: m.userId,
                role: m.role,
                businessName: s().businesses.find((b) => b.id === m.businessId)?.name ?? "—",
              })),
          };
        });
      },

      async setMembership(actor, { email, businessId, role }) {
        requireAdmin(actor);
        businessById(businessId);
        const user = s().users.find((u) => u.email === email.toLowerCase());
        if (!user) throw new NotFoundError();
        const existing = s().memberships.find((m) => m.businessId === businessId && m.userId === user.id);
        if (existing) existing.role = role;
        else s().memberships.push({ businessId, userId: user.id, role, createdAt: nowIso() });
        await audit(actor, "admin.membership_set", "business", businessId, { userId: user.id, role });
      },

      async removeMembership(actor, { userId, businessId }) {
        requireAdmin(actor);
        s().memberships = s().memberships.filter((m) => !(m.userId === userId && m.businessId === businessId));
        await audit(actor, "admin.membership_removed", "business", businessId, { userId });
      },

      async setPlatformAdmin(actor, userId, isAdmin) {
        requireAdmin(actor);
        if (userId === actor.userId && !isAdmin) throw new ConflictError("self");
        const user = s().users.find((u) => u.id === userId);
        if (!user) throw new NotFoundError();
        user.isPlatformAdmin = isAdmin;
        await audit(actor, isAdmin ? "admin.admin_granted" : "admin.admin_revoked", "user", userId);
      },

      async listSubscriptions(actor) {
        requireAdmin(actor);
        return s().subscriptions.map((x) => ({
          ...x,
          businessName: s().businesses.find((b) => b.id === x.businessId)?.name ?? "—",
        }));
      },

      async upsertSubscription(actor, input) {
        requireAdmin(actor);
        businessById(input.businessId);
        const existing = s().subscriptions.find((x) => x.businessId === input.businessId);
        if (existing) Object.assign(existing, input);
        else s().subscriptions.push({ ...input, id: randomUUID(), cancelAtPeriodEnd: false, createdAt: nowIso() });
        await audit(actor, "admin.subscription_updated", "business", input.businessId, { planId: input.planId, status: input.status });
      },

      async createInvoice(actor, { businessId, amountMinor, description }) {
        requireAdmin(actor);
        businessById(businessId);
        const number = `INV-${new Date().getUTCFullYear()}-${String(s().invoices.length + 1).padStart(4, "0")}`;
        const invoice = {
          id: randomUUID(),
          businessId,
          number,
          amountMinor,
          currency: "TND",
          status: "open" as const,
          issuedAt: nowIso(),
          paidAt: null,
          description,
        };
        s().invoices.unshift(invoice);
        await audit(actor, "admin.invoice_created", "invoice", invoice.id, { amountMinor });
      },

      async setInvoiceStatus(actor, invoiceId, status) {
        requireAdmin(actor);
        const inv = s().invoices.find((i) => i.id === invoiceId);
        if (!inv) throw new NotFoundError();
        inv.status = status;
        inv.paidAt = status === "paid" ? nowIso() : inv.paidAt;
        await audit(actor, "admin.invoice_status", "invoice", invoiceId, { status });
      },

      async listAllInvoices(actor) {
        requireAdmin(actor);
        return s().invoices.map((i) => ({
          ...i,
          businessName: s().businesses.find((b) => b.id === i.businessId)?.name ?? "(deleted business)",
        }));
      },

      async listDeletionRequests(actor) {
        requireAdmin(actor);
        return [...s().deletionRequests];
      },

      async updateDeletionRequest(actor, id, status, note) {
        requireAdmin(actor);
        const req = s().deletionRequests.find((d) => d.id === id);
        if (!req) throw new NotFoundError();
        req.status = status;
        req.resolutionNote = note;
        req.resolvedAt = status === "completed" || status === "rejected" ? nowIso() : null;
        if (status === "completed" && req.scope === "marketing") {
          const sub = s().emailSubscriptions.find((e) => e.email === req.email);
          if (sub) sub.unsubscribedAt ??= nowIso();
        }
        await audit(actor, "admin.deletion_request_updated", "deletion_request", id, { status });
      },

      async listContactRequests(actor) {
        requireAdmin(actor);
        return [...s().contactRequests];
      },

      async listAuditLogs(actor, limit) {
        requireAdmin(actor);
        return s().auditLogs.slice(0, limit);
      },

      async listLegalDocuments(actor) {
        requireAdmin(actor);
        return [...s().legalDocuments].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      },

      async publishLegalDocument(actor, { slug, locale, title, bodyMd }) {
        requireAdmin(actor);
        const latest = s()
          .legalDocuments.filter((d) => d.slug === slug && d.locale === locale)
          .reduce((max, d) => Math.max(max, d.version), 0);
        s().legalDocuments.push({ slug, locale, title, bodyMd, version: latest + 1, publishedAt: nowIso() });
        await audit(actor, "admin.legal_published", "legal_document", slug, { locale, version: latest + 1 });
      },
    },

    maintenance: {
      async purgeExpiredData() {
        const store = s();
        const now = Date.now();
        const monthsAgo = (m: number) => new Date(now - m * 30.44 * 86_400_000).toISOString();
        const counts: Record<string, number> = {};
        const before = store.feedback.length;
        store.feedback = store.feedback.filter((f) => {
          const b = store.businesses.find((x) => x.id === f.businessId);
          return f.createdAt >= monthsAgo(b?.feedbackRetentionMonths ?? 24);
        });
        counts.feedback = before - store.feedback.length;
        const ev = store.events.length;
        store.events = store.events.filter((e) => {
          const b = store.businesses.find((x) => x.id === e.businessId);
          return e.day >= monthsAgo(b?.feedbackRetentionMonths ?? 24).slice(0, 10);
        });
        counts.event_daily_counts = ev - store.events.length;
        const cr = store.contactRequests.length;
        store.contactRequests = store.contactRequests.filter((c) => c.createdAt >= monthsAgo(12));
        counts.contact_requests = cr - store.contactRequests.length;
        const al = store.auditLogs.length;
        store.auditLogs = store.auditLogs.filter((a) => a.createdAt >= monthsAgo(24));
        counts.audit_logs = al - store.auditLogs.length;
        return counts;
      },
    },
  };

  return repo;
}

/** Demo-mode credential check (scrypt, constant-time compare). */
export async function verifyDemoCredentials(email: string, password: string) {
  const { scryptSync, timingSafeEqual } = await import("node:crypto");
  const user = demoStore().users.find((u) => u.email === email.toLowerCase());
  // Hash even when the user doesn't exist to keep timing uniform.
  const [, salt, hash] = (user?.passwordHash ?? "scrypt$00$00").split("$");
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash.padEnd(64, "0").slice(0, 64), "hex");
  const ok = timingSafeEqual(candidate, expected) && Boolean(user);
  return ok && user ? { id: user.id, email: user.email, fullName: user.fullName, isPlatformAdmin: user.isPlatformAdmin } : null;
}

export function getDemoUser(userId: string) {
  const u = demoStore().users.find((x) => x.id === userId);
  return u ? { id: u.id, email: u.email, fullName: u.fullName, isPlatformAdmin: u.isPlatformAdmin } : null;
}

export function createDemoUser(input: { email: string; fullName: string; passwordHash: string }) {
  const store = demoStore();
  if (store.users.some((u) => u.email === input.email)) throw new ConflictError("email");
  const user = { id: randomUUID(), email: input.email, fullName: input.fullName, isPlatformAdmin: false, createdAt: nowIso(), passwordHash: input.passwordHash };
  store.users.push(user);
  return { id: user.id, email: user.email, fullName: user.fullName, isPlatformAdmin: false };
}

