import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { currency, getPlan } from "@/config/plans";
import type { Actor, BusinessStatus, InvoiceStatus, MemberRole } from "@/lib/types";
import { AccessDeniedError, NotFoundError, type AdminRepository } from "@/server/data/repository";
import { createUserClient } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { businessProfileColumns } from "./business";
import { assertUuid, check, list, maybe, single } from "./db";
import {
  FEEDBACK_COLUMNS,
  LOGO_BUCKET,
  mapAuditLog,
  mapBusiness,
  mapCard,
  mapContactRequest,
  mapDeletionRequest,
  mapFeedback,
  mapInvoice,
  mapLegalDocument,
  mapSubscription,
  type AuditLogRow,
  type BusinessRow,
  type CardRow,
  type ContactRequestRow,
  type DeletionRequestRow,
  type FeedbackRow,
  type InvoiceRow,
  type LegalDocumentRow,
  type LocationRow,
  type MemberRow,
  type ProfileRow,
  type SubscriptionRow,
} from "./mappers";

/**
 * Platform-admin operations. Two independent gates: the actor flag is checked
 * here, and every query runs with the admin's own JWT so RLS (is_platform_admin())
 * must agree. Lists are capped at PostgREST's default max-rows (1000).
 */

const LIST_CAP = 1000;
const INVOICE_STATUSES: readonly InvoiceStatus[] = ["open", "paid", "void", "refunded"];
const BUSINESS_STATUSES: readonly BusinessStatus[] = ["active", "suspended"];
const MEMBER_ROLES: readonly MemberRole[] = ["owner", "manager", "viewer"];

async function adminClient(actor: Actor): Promise<SupabaseClient> {
  if (!actor.isPlatformAdmin) throw new AccessDeniedError();
  return createUserClient();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(Number.isFinite(n) ? n : min)));
}

/** id → name lookup for joining lists without relying on embedded resources. */
async function businessNames(client: SupabaseClient): Promise<Map<string, Pick<BusinessRow, "name" | "slug">>> {
  const rows = list<Pick<BusinessRow, "id" | "name" | "slug">>(
    await client.from("businesses").select("id, name, slug").limit(LIST_CAP),
    "admin.businessNames",
  );
  return new Map(rows.map((b) => [b.id, { name: b.name, slug: b.slug }]));
}

export function createAdminRepository(): AdminRepository {
  return {
    async overview(actor) {
      const client = await adminClient(actor);
      const j = single<Record<string, number>>(await client.rpc("admin_overview"), "admin_overview");
      return {
        businesses: Number(j.businesses ?? 0),
        activeBusinesses: Number(j.active_businesses ?? 0),
        users: Number(j.users ?? 0),
        feedbackLast30: Number(j.feedback_last_30 ?? 0),
        googleClicksLast30: Number(j.google_clicks_last_30 ?? 0),
        pendingDeletionRequests: Number(j.pending_deletion_requests ?? 0),
      };
    },

    async listBusinesses(actor) {
      const client = await adminClient(actor);
      const [rows, counts] = await Promise.all([
        client.from("businesses").select("*").order("name").limit(LIST_CAP),
        client.rpc("admin_business_counts"),
      ]);
      const countById = new Map(
        list<{ business_id: string; locations: number; cards: number; feedback: number }>(counts, "admin_business_counts").map(
          (c) => [c.business_id, c],
        ),
      );
      return list<BusinessRow>(rows, "admin.listBusinesses").map((r) => {
        const c = countById.get(r.id);
        return {
          ...mapBusiness(r),
          locations: Number(c?.locations ?? 0),
          cards: Number(c?.cards ?? 0),
          feedback: Number(c?.feedback ?? 0),
        };
      });
    },

    async getBusiness(actor, businessId) {
      assertUuid(businessId);
      const client = await adminClient(actor);
      return mapBusiness(
        single<BusinessRow>(await client.from("businesses").select("*").eq("id", businessId).maybeSingle(), "admin.getBusiness"),
      );
    },

    async createBusiness(actor, input) {
      const client = await adminClient(actor);
      const row = single<BusinessRow>(
        await client
          .from("businesses")
          .insert({ ...businessProfileColumns(input), slug: input.slug, status: input.status })
          .select("*")
          .maybeSingle(),
        "admin.createBusiness",
      );
      await writeAudit(actor, "admin.business.create", "business", row.id, { status: row.status });
      return mapBusiness(row);
    },

    async updateBusiness(actor, businessId, input) {
      assertUuid(businessId);
      const client = await adminClient(actor);
      const row = single<BusinessRow>(
        await client
          .from("businesses")
          .update({ ...businessProfileColumns(input), slug: input.slug, status: input.status })
          .eq("id", businessId)
          .select("*")
          .maybeSingle(),
        "admin.updateBusiness",
      );
      await writeAudit(actor, "admin.business.update", "business", businessId, { status: row.status });
      return mapBusiness(row);
    },

    async setBusinessStatus(actor, businessId, status) {
      assertUuid(businessId);
      if (!BUSINESS_STATUSES.includes(status)) throw new Error("Invalid input");
      const client = await adminClient(actor);
      single(
        await client.from("businesses").update({ status }).eq("id", businessId).select("id").maybeSingle(),
        "admin.setBusinessStatus",
      );
      await writeAudit(actor, "admin.business.set_status", "business", businessId, { status });
    },

    async deleteBusiness(actor, businessId) {
      assertUuid(businessId);
      const client = await adminClient(actor);
      const deleted = list<{ id: string }>(
        await client.from("businesses").delete().eq("id", businessId).select("id"),
        "admin.deleteBusiness",
      );
      if (deleted.length === 0) throw new NotFoundError();

      // Best effort: remove the business's logo files (rows are gone via cascade).
      const storage = client.storage.from(LOGO_BUCKET);
      const files = await storage.list(businessId, { limit: 100 });
      if (!files.error && files.data.length > 0) {
        await storage.remove(files.data.map((f) => `${businessId}/${f.name}`));
      }

      await writeAudit(actor, "admin.business.delete", "business", businessId);
    },

    async listAllCards(actor) {
      const client = await adminClient(actor);
      const [cards, names, locations] = await Promise.all([
        client.from("nfc_cards").select("*").order("created_at", { ascending: false }).limit(LIST_CAP),
        businessNames(client),
        client.from("locations").select("id, slug").limit(LIST_CAP),
      ]);
      const locationSlug = new Map(
        list<Pick<LocationRow, "id" | "slug">>(locations, "admin.listAllCards.locations").map((l) => [l.id, l.slug]),
      );
      return list<CardRow>(cards, "admin.listAllCards").map((r) => ({
        ...mapCard(r),
        businessName: names.get(r.business_id)?.name ?? "",
        businessSlug: names.get(r.business_id)?.slug ?? "",
        locationSlug: r.location_id ? (locationSlug.get(r.location_id) ?? null) : null,
      }));
    },

    async listRecentFeedback(actor, limit) {
      const client = await adminClient(actor);
      const [rows, names] = await Promise.all([
        client
          .from("feedback")
          .select(FEEDBACK_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(clamp(limit, 1, 500)),
        businessNames(client),
      ]);
      return list<FeedbackRow>(rows, "admin.listRecentFeedback").map((r) => ({
        ...mapFeedback(r),
        businessName: names.get(r.business_id)?.name ?? "",
      }));
    },

    async listUsers(actor) {
      const client = await adminClient(actor);
      const [profiles, members, names] = await Promise.all([
        client
          .from("profiles")
          .select("id, email, full_name, is_platform_admin, created_at")
          .order("created_at", { ascending: false })
          .limit(LIST_CAP),
        client.from("business_members").select("business_id, user_id, role").limit(LIST_CAP),
        businessNames(client),
      ]);
      const byUser = new Map<string, MemberRow[]>();
      for (const m of list<MemberRow>(members, "admin.listUsers.members")) {
        byUser.set(m.user_id, [...(byUser.get(m.user_id) ?? []), m]);
      }
      return list<ProfileRow>(profiles, "admin.listUsers").map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        isPlatformAdmin: p.is_platform_admin,
        createdAt: p.created_at,
        memberships: (byUser.get(p.id) ?? []).map((m) => ({
          businessId: m.business_id,
          userId: m.user_id,
          role: m.role,
          businessName: names.get(m.business_id)?.name ?? "",
        })),
      }));
    },

    async setMembership(actor, input) {
      assertUuid(input.businessId);
      if (!MEMBER_ROLES.includes(input.role)) throw new Error("Invalid input");
      const client = await adminClient(actor);
      const profile = maybe<{ id: string }>(
        await client.from("profiles").select("id").eq("email", input.email.trim().toLowerCase()).maybeSingle(),
        "admin.setMembership.profile",
      );
      if (!profile) throw new NotFoundError();
      check(
        await client
          .from("business_members")
          .upsert({ business_id: input.businessId, user_id: profile.id, role: input.role }, { onConflict: "business_id,user_id" }),
        "admin.setMembership",
      );
      // Ids only — the email used for the lookup is not recorded.
      await writeAudit(actor, "admin.membership.set", "business", input.businessId, { userId: profile.id, role: input.role });
    },

    async removeMembership(actor, input) {
      assertUuid(input.businessId);
      assertUuid(input.userId);
      const client = await adminClient(actor);
      const deleted = list<{ user_id: string }>(
        await client
          .from("business_members")
          .delete()
          .eq("business_id", input.businessId)
          .eq("user_id", input.userId)
          .select("user_id"),
        "admin.removeMembership",
      );
      if (deleted.length === 0) throw new NotFoundError();
      await writeAudit(actor, "admin.membership.remove", "business", input.businessId, { userId: input.userId });
    },

    async setPlatformAdmin(actor, userId, isAdmin) {
      assertUuid(userId);
      const client = await adminClient(actor);
      check(
        await client.rpc("admin_set_platform_admin", { p_user_id: userId, p_is_admin: isAdmin }),
        "admin_set_platform_admin",
      );
      await writeAudit(actor, "admin.user.set_platform_admin", "user", userId, { isAdmin });
    },

    async listSubscriptions(actor) {
      const client = await adminClient(actor);
      const [rows, names] = await Promise.all([
        client.from("subscriptions").select("*").order("current_period_end").limit(LIST_CAP),
        businessNames(client),
      ]);
      return list<SubscriptionRow>(rows, "admin.listSubscriptions").map((r) => ({
        ...mapSubscription(r),
        businessName: names.get(r.business_id)?.name ?? "",
      }));
    },

    async upsertSubscription(actor, input) {
      assertUuid(input.businessId);
      if (!getPlan(input.planId) || Number.isNaN(Date.parse(input.currentPeriodEnd))) throw new Error("Invalid input");
      const client = await adminClient(actor);
      check(
        await client.from("subscriptions").upsert(
          {
            business_id: input.businessId,
            plan_id: input.planId,
            interval: input.interval,
            status: input.status,
            current_period_end: input.currentPeriodEnd,
          },
          { onConflict: "business_id" },
        ),
        "admin.upsertSubscription",
      );
      await writeAudit(actor, "admin.subscription.upsert", "business", input.businessId, {
        planId: input.planId,
        interval: input.interval,
        status: input.status,
      });
    },

    async createInvoice(actor, input) {
      assertUuid(input.businessId);
      const description = input.description.trim();
      if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0 || description.length > 500) {
        throw new Error("Invalid input");
      }
      const client = await adminClient(actor);
      // The invoice number comes from the column default (INV-<year>-<seq>).
      const row = single<{ id: string }>(
        await client
          .from("invoices")
          .insert({ business_id: input.businessId, amount_minor: input.amountMinor, currency, description })
          .select("id")
          .maybeSingle(),
        "admin.createInvoice",
      );
      await writeAudit(actor, "admin.invoice.create", "invoice", row.id, {
        businessId: input.businessId,
        amountMinor: input.amountMinor,
      });
    },

    async setInvoiceStatus(actor, invoiceId, status) {
      assertUuid(invoiceId);
      if (!INVOICE_STATUSES.includes(status)) throw new Error("Invalid input");
      const client = await adminClient(actor);
      // paid → stamp paid_at; open/void → clear it; refunded keeps the original payment date.
      const patch: { status: InvoiceStatus; paid_at?: string | null } = { status };
      if (status === "paid") patch.paid_at = new Date().toISOString();
      if (status === "open" || status === "void") patch.paid_at = null;
      single(
        await client.from("invoices").update(patch).eq("id", invoiceId).select("id").maybeSingle(),
        "admin.setInvoiceStatus",
      );
      await writeAudit(actor, "admin.invoice.set_status", "invoice", invoiceId, { status });
    },

    async listAllInvoices(actor) {
      const client = await adminClient(actor);
      const [rows, names] = await Promise.all([
        client.from("invoices").select("*").order("issued_at", { ascending: false }).limit(LIST_CAP),
        businessNames(client),
      ]);
      return list<InvoiceRow>(rows, "admin.listAllInvoices").map((r) => ({
        ...mapInvoice(r),
        businessName: names.get(r.business_id)?.name ?? "",
      }));
    },

    async listDeletionRequests(actor) {
      const client = await adminClient(actor);
      return list<DeletionRequestRow>(
        await client.from("deletion_requests").select("*").order("created_at", { ascending: false }).limit(LIST_CAP),
        "admin.listDeletionRequests",
      ).map(mapDeletionRequest);
    },

    async updateDeletionRequest(actor, id, status, note) {
      assertUuid(id);
      const resolutionNote = note?.trim() || null;
      if (resolutionNote && resolutionNote.length > 2000) throw new Error("Invalid input");
      const client = await adminClient(actor);
      const resolved = status === "completed" || status === "rejected";
      single(
        await client
          .from("deletion_requests")
          .update({ status, resolution_note: resolutionNote, resolved_at: resolved ? new Date().toISOString() : null })
          .eq("id", id)
          .select("id")
          .maybeSingle(),
        "admin.updateDeletionRequest",
      );
      await writeAudit(actor, "admin.deletion_request.update", "deletion_request", id, { status });
    },

    async listContactRequests(actor) {
      const client = await adminClient(actor);
      return list<ContactRequestRow>(
        await client.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(LIST_CAP),
        "admin.listContactRequests",
      ).map(mapContactRequest);
    },

    async listAuditLogs(actor, limit) {
      const client = await adminClient(actor);
      return list<AuditLogRow>(
        await client
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(clamp(limit, 1, LIST_CAP)),
        "admin.listAuditLogs",
      ).map(mapAuditLog);
    },

    async listLegalDocuments(actor) {
      const client = await adminClient(actor);
      return list<LegalDocumentRow>(
        await client
          .from("legal_documents")
          .select("slug, locale, title, body_md, version, published_at")
          .order("slug")
          .order("locale")
          .order("version", { ascending: false })
          .limit(LIST_CAP),
        "admin.listLegalDocuments",
      ).map(mapLegalDocument);
    },

    async publishLegalDocument(actor, input) {
      const client = await adminClient(actor);
      const version = single<number>(
        await client.rpc("publish_legal_document", {
          p_slug: input.slug,
          p_locale: input.locale,
          p_title: input.title,
          p_body_md: input.bodyMd,
        }),
        "publish_legal_document",
      );
      await writeAudit(actor, "admin.legal_document.publish", "legal_document", `${input.slug}:${input.locale}`, { version });
    },
  };
}
