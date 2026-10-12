import "server-only";
import type { PublicRepository } from "@/server/data/repository";
import { createAnonClient } from "@/server/supabase/clients";
import { check, list, maybe } from "./db";
import { mapLegalDocument, mapPublicBusiness, type LegalDocumentRow, type PublicBusinessJson } from "./mappers";

/**
 * Customer-facing operations. They run without any session and only call the
 * SECURITY DEFINER RPCs from 0003_functions.sql — anon has no table access, so
 * a bug here cannot read or write tenant data beyond what the RPCs allow.
 */
export function createPublicRepository(): PublicRepository {
  return {
    async getPublicBusiness(slug, locationSlug) {
      const res = await createAnonClient().rpc("get_public_business", {
        p_slug: slug,
        p_location_slug: locationSlug ?? null,
      });
      const json = maybe<PublicBusinessJson>(res, "get_public_business");
      return json ? mapPublicBusiness(json) : null;
    },

    async getGoogleReviewUrl(slug, locationSlug) {
      const res = await createAnonClient().rpc("get_google_review_url", {
        p_slug: slug,
        p_location_slug: locationSlug ?? null,
      });
      return maybe<string>(res, "get_google_review_url");
    },

    async submitFeedback(input) {
      const res = await createAnonClient().rpc("submit_feedback", {
        p_slug: input.slug,
        p_location_slug: input.locationSlug ?? null,
        p_card_code: input.cardCode ?? null,
        p_rating: input.rating,
        p_source: input.source,
      });
      return maybe<boolean>(res, "submit_feedback") === true ? "ok" : "not_found";
    },

    async recordEvent(input) {
      const res = await createAnonClient().rpc("record_event", {
        p_slug: input.slug,
        p_location_slug: input.locationSlug ?? null,
        p_card_code: input.cardCode ?? null,
        p_type: input.type,
      });
      check(res, "record_event");
    },

    async resolveCard(code) {
      const res = await createAnonClient().rpc("resolve_card", { p_code: code });
      const row = list<{ slug: string; location_slug: string | null }>(res, "resolve_card")[0];
      return row ? { slug: row.slug, locationSlug: row.location_slug } : null;
    },

    async createContactRequest(input) {
      const res = await createAnonClient().rpc("create_contact_request", {
        p_name: input.name,
        p_email: input.email,
        p_business_name: input.businessName,
        p_message: input.message,
        p_marketing_opt_in: input.marketingOptIn,
      });
      check(res, "create_contact_request");
    },

    async createPublicDeletionRequest(input) {
      const res = await createAnonClient().rpc("create_public_deletion_request", {
        p_email: input.email,
        p_scope: input.scope,
        p_details: input.details,
      });
      check(res, "create_public_deletion_request");
    },

    async subscribeMarketing(input) {
      const res = await createAnonClient().rpc("subscribe_marketing", {
        p_email: input.email,
        p_source: input.source,
        p_token_hash: input.tokenHash,
      });
      check(res, "subscribe_marketing");
    },

    async unsubscribe(tokenHash) {
      const res = await createAnonClient().rpc("unsubscribe_marketing", { p_token_hash: tokenHash });
      return maybe<boolean>(res, "unsubscribe_marketing") === true;
    },

    async getLegalDocument(slug, locale) {
      const res = await createAnonClient().rpc("get_legal_document", { p_slug: slug, p_locale: locale });
      const row = list<LegalDocumentRow>(res, "get_legal_document")[0];
      return row ? mapLegalDocument(row) : null;
    },
  };
}
