import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor, Feedback, MemberRole } from "@/lib/types";
import type { BusinessProfileInput, LocationInput } from "@/lib/validation";
import {
  AccessDeniedError,
  ConflictError,
  NotFoundError,
  roleAtLeast,
  type BusinessRepository,
} from "@/server/data/repository";
import { createUserClient } from "@/server/supabase/clients";
import { writeAudit } from "./audit";
import { assertUuid, check, list, maybe, single, toDomainError } from "./db";
import {
  FEEDBACK_COLUMNS,
  LOGO_BUCKET,
  logoUrl,
  mapBusiness,
  mapCard,
  mapDeletionRequest,
  mapFeedback,
  mapInvoice,
  mapLocation,
  mapStats,
  mapSubscription,
  type BusinessRow,
  type CardRow,
  type DeletionRequestRow,
  type FeedbackRow,
  type InvoiceRow,
  type LocationRow,
  type MemberRow,
  type StatsJson,
  type SubscriptionRow,
} from "./mappers";

/**
 * Tenant-scoped operations. Every query runs with the signed-in user's JWT
 * (RLS is the hard boundary) AND each method checks the actor's role first,
 * so a missing/mis-written policy alone can't expose another tenant's data.
 * Platform admins pass the role checks; RLS grants them access too.
 */

const CARD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CARD_CODE_LENGTH = 8;
const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const EXPORT_CAP = 100_000;
/** PostgREST's default max-rows; larger reads are paged. */
const PAGE_LIMIT = 1000;

async function getRoleWith(client: SupabaseClient, actor: Actor, businessId: string): Promise<MemberRole | null> {
  const res = await client
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", actor.userId)
    .maybeSingle();
  return maybe<Pick<MemberRow, "role">>(res, "getRole")?.role ?? null;
}

/** Opens a user client after verifying the actor holds at least `min` on the business. */
async function authorize(actor: Actor, businessId: string, min: MemberRole): Promise<SupabaseClient> {
  assertUuid(businessId);
  const client = await createUserClient();
  if (actor.isPlatformAdmin) return client;
  if (!roleAtLeast(await getRoleWith(client, actor, businessId), min)) throw new AccessDeniedError();
  return client;
}

/** Card code over an alphabet without look-alikes (no I/O/0/1); matches the DB check. */
function generateCardCode(): string {
  let code = "";
  for (let i = 0; i < CARD_CODE_LENGTH; i++) code += CARD_ALPHABET[randomInt(CARD_ALPHABET.length)];
  return code;
}

/** Confirms the file really is the image type it claims (magic bytes), not just by header. */
function matchesImageSignature(bytes: Uint8Array, contentType: string): boolean {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  switch (contentType) {
    case "image/png":
      return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return starts([0xff, 0xd8, 0xff]);
    case "image/webp":
      return starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8); // "RIFF" … "WEBP"
    default:
      return false;
  }
}

/** Business profile form → columns. Shared with the admin repository. */
export function businessProfileColumns(input: BusinessProfileInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    website: input.website ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    logo_alt: input.logoAlt ?? null,
    brand_primary: input.brandPrimary ?? null,
    brand_accent: input.brandAccent ?? null,
    default_locale: input.defaultLocale,
    google_review_url: input.googleReviewUrl ?? null,
    opening_hours: input.openingHours,
    social_links: input.socialLinks,
  };
}

function locationColumns(input: LocationInput) {
  return {
    name: input.name,
    slug: input.slug,
    address: input.address ?? null,
    phone: input.phone ?? null,
    google_review_url: input.googleReviewUrl ?? null,
  };
}

function assertValidRange(from: string, to: string): void {
  const f = Date.parse(from);
  const t = Date.parse(to);
  if (Number.isNaN(f) || Number.isNaN(t) || t <= f) throw new Error("Invalid input");
}

export function createBusinessRepository(): BusinessRepository {
  return {
    async listMemberships(actor) {
      const client = await createUserClient();
      const members = list<Pick<MemberRow, "business_id" | "role">>(
        await client.from("business_members").select("business_id, role").eq("user_id", actor.userId),
        "listMemberships",
      );
      if (members.length === 0) return [];
      const businesses = list<Pick<BusinessRow, "id" | "name" | "slug" | "logo_path" | "status" | "is_demo">>(
        await client
          .from("businesses")
          .select("id, name, slug, logo_path, status, is_demo")
          .in(
            "id",
            members.map((m) => m.business_id),
          )
          .order("name"),
        "listMemberships.businesses",
      );
      const roleById = new Map(members.map((m) => [m.business_id, m.role]));
      return businesses.flatMap((b) => {
        const role = roleById.get(b.id);
        if (!role) return [];
        return [
          {
            role,
            business: {
              id: b.id,
              name: b.name,
              slug: b.slug,
              logoUrl: logoUrl(b.logo_path),
              status: b.status,
              isDemo: b.is_demo,
            },
          },
        ];
      });
    },

    async createOwnedBusiness(actor, input) {
      const client = await createUserClient();
      const id = single<string>(
        await client.rpc("create_owned_business", { p_name: input.name, p_slug: input.slug }),
        "create_owned_business",
      );
      const business = mapBusiness(
        single<BusinessRow>(await client.from("businesses").select("*").eq("id", id).maybeSingle(), "createOwnedBusiness"),
      );
      await writeAudit(actor, "business.create", "business", id, { selfService: true });
      return business;
    },

    async getRole(actor, businessId) {
      assertUuid(businessId);
      return getRoleWith(await createUserClient(), actor, businessId);
    },

    async getBusiness(actor, businessId) {
      const client = await authorize(actor, businessId, "viewer");
      return mapBusiness(
        single<BusinessRow>(await client.from("businesses").select("*").eq("id", businessId).maybeSingle(), "getBusiness"),
      );
    },

    async updateBusinessProfile(actor, businessId, input) {
      const client = await authorize(actor, businessId, "manager");
      const row = single<BusinessRow>(
        await client.from("businesses").update(businessProfileColumns(input)).eq("id", businessId).select("*").maybeSingle(),
        "updateBusinessProfile",
      );
      await writeAudit(actor, "business.update_profile", "business", businessId);
      return mapBusiness(row);
    },

    async setBusinessLogo(actor, businessId, file) {
      const client = await authorize(actor, businessId, "manager");
      const ext = LOGO_TYPES[file.contentType];
      if (!ext || file.bytes.byteLength === 0 || file.bytes.byteLength > MAX_LOGO_BYTES) throw new Error("Invalid input");
      if (!matchesImageSignature(file.bytes, file.contentType)) throw new Error("Invalid input");

      const previous = single<Pick<BusinessRow, "logo_path">>(
        await client.from("businesses").select("logo_path").eq("id", businessId).maybeSingle(),
        "setBusinessLogo.previous",
      ).logo_path;

      const path = `${businessId}/logo-${Date.now()}.${ext}`;
      const storage = client.storage.from(LOGO_BUCKET);
      const upload = await storage.upload(path, file.bytes, {
        contentType: file.contentType,
        upsert: false,
        cacheControl: "31536000", // unique file names, so cache forever
      });
      if (upload.error) {
        console.error("[storage] logo upload failed", { businessId });
        throw new Error("Upload failed");
      }

      const update = await client.from("businesses").update({ logo_path: path }).eq("id", businessId).select("id").maybeSingle();
      if (update.error || !update.data) {
        await storage.remove([path]); // don't leave an orphan behind
        if (update.error) throw toDomainError(update.error, "setBusinessLogo");
        throw new NotFoundError();
      }

      // Best effort: the old file is unreferenced now.
      if (previous && previous !== path) await storage.remove([previous]);

      await writeAudit(actor, "business.set_logo", "business", businessId);
      return logoUrl(path) ?? "";
    },

    async setRetention(actor, businessId, months) {
      if (!Number.isInteger(months) || months < 1 || months > 60) throw new Error("Invalid input");
      const client = await authorize(actor, businessId, "owner");
      single(
        await client
          .from("businesses")
          .update({ feedback_retention_months: months })
          .eq("id", businessId)
          .select("id")
          .maybeSingle(),
        "setRetention",
      );
      await writeAudit(actor, "business.set_retention", "business", businessId, { months });
    },

    // -- Locations ------------------------------------------------------------

    async listLocations(actor, businessId) {
      const client = await authorize(actor, businessId, "viewer");
      return list<LocationRow>(
        await client.from("locations").select("*").eq("business_id", businessId).order("name"),
        "listLocations",
      ).map(mapLocation);
    },

    async createLocation(actor, businessId, input) {
      const client = await authorize(actor, businessId, "manager");
      const row = single<LocationRow>(
        await client
          .from("locations")
          .insert({ business_id: businessId, ...locationColumns(input) })
          .select("*")
          .maybeSingle(),
        "createLocation",
      );
      await writeAudit(actor, "location.create", "location", row.id, { businessId });
      return mapLocation(row);
    },

    async updateLocation(actor, businessId, locationId, input) {
      assertUuid(locationId);
      const client = await authorize(actor, businessId, "manager");
      const row = single<LocationRow>(
        await client
          .from("locations")
          .update(locationColumns(input))
          .eq("id", locationId)
          .eq("business_id", businessId)
          .select("*")
          .maybeSingle(),
        "updateLocation",
      );
      await writeAudit(actor, "location.update", "location", locationId, { businessId });
      return mapLocation(row);
    },

    async deleteLocation(actor, businessId, locationId) {
      assertUuid(locationId);
      const client = await authorize(actor, businessId, "manager");
      const deleted = list<{ id: string }>(
        await client.from("locations").delete().eq("id", locationId).eq("business_id", businessId).select("id"),
        "deleteLocation",
      );
      if (deleted.length === 0) throw new NotFoundError();
      await writeAudit(actor, "location.delete", "location", locationId, { businessId });
    },

    // -- Analytics --------------------------------------------------------------

    async getStats(actor, businessId, range, locationId) {
      assertValidRange(range.from, range.to);
      if (locationId) assertUuid(locationId);
      const client = await authorize(actor, businessId, "viewer");
      const json = single<StatsJson>(
        await client.rpc("get_feedback_stats", {
          p_business_id: businessId,
          p_from: range.from,
          p_to: range.to,
          p_location_id: locationId ?? null,
        }),
        "get_feedback_stats",
      );
      return mapStats(json);
    },

    async listFeedback(actor, businessId, query) {
      assertValidRange(query.range.from, query.range.to);
      if (query.locationId) assertUuid(query.locationId);
      const client = await authorize(actor, businessId, "viewer");
      const page = Math.max(1, Math.floor(query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 25)));

      const build = (columns: string, head: boolean) => {
        let q = client
          .from("feedback")
          .select(columns, { count: "exact", head })
          .eq("business_id", businessId)
          .gte("created_at", query.range.from)
          .lt("created_at", query.range.to);
        if (query.locationId) q = q.eq("location_id", query.locationId);
        if (query.rating) q = q.eq("rating", query.rating);
        return q;
      };

      const from = (page - 1) * pageSize;
      const res = await build(FEEDBACK_COLUMNS, false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + pageSize - 1);

      // Past the last page PostgREST answers 416 (PGRST103): report the total with no items.
      if (res.error?.code === "PGRST103") {
        const countRes = await build("id", true);
        check(countRes, "listFeedback.count");
        return { items: [], total: countRes.count ?? 0, page, pageSize };
      }
      const items = list<FeedbackRow>(res, "listFeedback").map(mapFeedback);
      return { items, total: res.count ?? items.length, page, pageSize };
    },

    async exportFeedback(actor, businessId) {
      const client = await authorize(actor, businessId, "viewer");
      const out: Feedback[] = [];
      for (let from = 0; from < EXPORT_CAP; from += PAGE_LIMIT) {
        const rows = list<FeedbackRow>(
          await client
            .from("feedback")
            .select(FEEDBACK_COLUMNS)
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, Math.min(from + PAGE_LIMIT, EXPORT_CAP) - 1),
          "exportFeedback",
        );
        for (const r of rows) out.push(mapFeedback(r));
        if (rows.length < PAGE_LIMIT) break;
      }
      await writeAudit(actor, "feedback.export", "business", businessId, { rows: out.length });
      return out;
    },

    // -- NFC cards -----------------------------------------------------------------

    async listCards(actor, businessId) {
      const client = await authorize(actor, businessId, "viewer");
      return list<CardRow>(
        await client.from("nfc_cards").select("*").eq("business_id", businessId).order("created_at"),
        "listCards",
      ).map(mapCard);
    },

    async getCard(actor, businessId, cardId) {
      assertUuid(cardId);
      const client = await authorize(actor, businessId, "viewer");
      return mapCard(
        single<CardRow>(
          await client.from("nfc_cards").select("*").eq("id", cardId).eq("business_id", businessId).maybeSingle(),
          "getCard",
        ),
      );
    },

    async createCard(actor, businessId, input) {
      const label = input.label.trim();
      if (label.length < 1 || label.length > 80) throw new Error("Invalid input");
      if (input.locationId) assertUuid(input.locationId);
      const client = await authorize(actor, businessId, "manager");

      // Codes are random; on the (rare) collision just draw again.
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await client
          .from("nfc_cards")
          .insert({ code: generateCardCode(), business_id: businessId, location_id: input.locationId, label })
          .select("*")
          .maybeSingle();
        if (res.error?.code === "23505") continue;
        const row = single<CardRow>(res, "createCard");
        await writeAudit(actor, "card.create", "nfc_card", row.id, { businessId });
        return mapCard(row);
      }
      throw new ConflictError("code");
    },

    async updateCard(actor, businessId, cardId, input) {
      assertUuid(cardId);
      if (input.locationId) assertUuid(input.locationId);
      const patch: { label?: string; location_id?: string | null; status?: string } = {};
      if (input.label !== undefined) {
        const label = input.label.trim();
        if (label.length < 1 || label.length > 80) throw new Error("Invalid input");
        patch.label = label;
      }
      if (input.locationId !== undefined) patch.location_id = input.locationId;
      if (input.status !== undefined) patch.status = input.status;

      const client = await authorize(actor, businessId, "manager");
      const query = client.from("nfc_cards");
      const res =
        Object.keys(patch).length === 0
          ? await query.select("*").eq("id", cardId).eq("business_id", businessId).maybeSingle()
          : await query.update(patch).eq("id", cardId).eq("business_id", businessId).select("*").maybeSingle();
      const row = single<CardRow>(res, "updateCard");
      if (Object.keys(patch).length > 0) {
        await writeAudit(actor, "card.update", "nfc_card", cardId, { businessId, status: row.status });
      }
      return mapCard(row);
    },

    // -- Billing ----------------------------------------------------------------------

    async getSubscription(actor, businessId) {
      const client = await authorize(actor, businessId, "viewer");
      const row = maybe<SubscriptionRow>(
        await client.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle(),
        "getSubscription",
      );
      return row ? mapSubscription(row) : null;
    },

    async listInvoices(actor, businessId) {
      const client = await authorize(actor, businessId, "viewer");
      return list<InvoiceRow>(
        await client.from("invoices").select("*").eq("business_id", businessId).order("issued_at", { ascending: false }),
        "listInvoices",
      ).map(mapInvoice);
    },

    async setCancelAtPeriodEnd(actor, businessId, cancel) {
      const client = await authorize(actor, businessId, "owner");
      const row = single<SubscriptionRow>(
        await client.rpc("set_cancel_at_period_end", { p_business_id: businessId, p_cancel: cancel }),
        "set_cancel_at_period_end",
      );
      await writeAudit(actor, "subscription.set_cancel_at_period_end", "subscription", row.id, { businessId, cancel });
      return mapSubscription(row);
    },

    // -- Privacy requests ------------------------------------------------------------------

    async createDeletionRequest(actor, input) {
      if (input.businessId) await authorize(actor, input.businessId, "viewer");
      const client = await createUserClient();
      const row = single<{ id: string }>(
        await client
          .from("deletion_requests")
          .insert({
            email: actor.email.toLowerCase(),
            scope: input.scope,
            details: input.details,
            business_id: input.businessId,
            requester_user_id: actor.userId,
          })
          .select("id")
          .maybeSingle(),
        "createDeletionRequest",
      );
      await writeAudit(actor, "deletion_request.create", "deletion_request", row.id, { scope: input.scope });
    },

    async listMyDeletionRequests(actor) {
      const client = await createUserClient();
      return list<DeletionRequestRow>(
        await client
          .from("deletion_requests")
          .select("*")
          .eq("requester_user_id", actor.userId)
          .order("created_at", { ascending: false }),
        "listMyDeletionRequests",
      ).map(mapDeletionRequest);
    },
  };
}
