"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MemberRole } from "@/lib/types";
import { businessToProfileInput } from "@/lib/business";
import { echoValues, fieldErrorsFrom, type FormState } from "@/lib/form-state";
import {
  businessProfileSchema,
  cardSchema,
  googleReviewUrlSchema,
  locationSchema,
  uuidSchema,
} from "@/lib/validation";
import { authorizeBusiness, type BusinessContext } from "@/server/auth/guards";
import { getSessionUser } from "@/server/auth/session";
import { AccessDeniedError, ConflictError, NotFoundError } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * Dashboard mutations. Every action re-authorizes on the server (the
 * businessId in the form is untrusted input) with the minimum role needed:
 *   viewer  — read only (no actions here)
 *   manager — profile, locations, cards
 *   owner   — billing, retention, deletion of the business
 */

const DENIED: FormState = { status: "error", message: "errors.forbidden" };
const GENERIC: FormState = { status: "error", message: "errors.generic" };

async function authorize(formData: FormData, min: MemberRole): Promise<{ ctx: BusinessContext; businessId: string } | null> {
  const businessId = String(formData.get("businessId") ?? "");
  if (!uuidSchema.safeParse(businessId).success) return null;
  const ctx = await authorizeBusiness(await getSessionUser(), businessId, min);
  return ctx ? { ctx, businessId } : null;
}

function handle(err: unknown, values?: Record<string, string>): FormState {
  if (err instanceof ConflictError) return { status: "error", fieldErrors: { [err.field]: "validation.taken" }, values };
  if (err instanceof AccessDeniedError || err instanceof NotFoundError) return DENIED;
  logger.error("dashboard_action_failed", err);
  return GENERIC;
}

const refresh = (businessId: string) => revalidatePath(`/dashboard/${businessId}`, "layout");

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SOCIALS = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;

const PROFILE_FIELDS = [
  "name", "description", "website", "phone", "email", "address", "logoAlt", "brandPrimary", "brandAccent", "defaultLocale", "googleReviewUrl",
  ...DAYS.map((d) => `hours_${d}`),
  ...SOCIALS.map((s) => `social_${s}`),
];

function profileFromForm(formData: FormData) {
  const str = (k: string) => String(formData.get(k) ?? "");
  return {
    name: str("name"),
    description: str("description"),
    website: str("website"),
    phone: str("phone"),
    email: str("email"),
    address: str("address"),
    logoAlt: str("logoAlt"),
    brandPrimary: str("brandPrimary"),
    brandAccent: str("brandAccent"),
    defaultLocale: str("defaultLocale"),
    googleReviewUrl: str("googleReviewUrl"),
    openingHours: Object.fromEntries(DAYS.map((d) => [d, str(`hours_${d}`)])),
    socialLinks: Object.fromEntries(SOCIALS.map((s) => [s, str(`social_${s}`)])),
  };
}

/** Maps nested zod paths (openingHours.mon) back to form field names (hours_mon). */
function profileFieldErrors(errors: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [k.replace(/^openingHours\./, "hours_").replace(/^socialLinks\./, "social_"), v]),
  );
}

export async function updateBusinessProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "manager");
  if (!auth) return DENIED;
  const values = echoValues(formData, PROFILE_FIELDS);
  const parsed = businessProfileSchema.safeParse(profileFromForm(formData));
  if (!parsed.success) return { status: "error", fieldErrors: profileFieldErrors(fieldErrorsFrom(parsed.error)), values };
  try {
    await auth.ctx.repo.updateBusinessProfile(auth.ctx.user, auth.businessId, parsed.data);
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err, values);
  }
}

export async function updateGoogleUrlAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "manager");
  if (!auth) return DENIED;
  const values = echoValues(formData, ["googleReviewUrl"]);
  const parsed = googleReviewUrlSchema.safeParse(String(formData.get("googleReviewUrl") ?? ""));
  if (!parsed.success) return { status: "error", fieldErrors: { googleReviewUrl: parsed.error.issues[0]?.message ?? "validation.googleUrl" }, values };
  try {
    const { repo, user } = auth.ctx;
    const current = await repo.getBusiness(user, auth.businessId);
    await repo.updateBusinessProfile(user, auth.businessId, { ...businessToProfileInput(current), googleReviewUrl: parsed.data ?? null });
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err, values);
  }
}

const LOGO_TYPES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // "RIFF" (+ "WEBP" at offset 8, checked below)
};

export async function uploadLogoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "manager");
  if (!auth) return DENIED;
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000 || !(file.type in LOGO_TYPES)) {
    return { status: "error", fieldErrors: { logo: "validation.file" } };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check the real file signature — the declared content type is client-controlled.
  const magicOk = LOGO_TYPES[file.type].every((b, i) => bytes[i] === b);
  const webpOk = file.type !== "image/webp" || String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!magicOk || !webpOk) return { status: "error", fieldErrors: { logo: "validation.file" } };
  try {
    await auth.ctx.repo.setBusinessLogo(auth.ctx.user, auth.businessId, { bytes, contentType: file.type });
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err);
  }
}

const LOCATION_FIELDS = ["name", "slug", "address", "phone", "googleReviewUrl"];

function locationFromForm(formData: FormData) {
  return Object.fromEntries(LOCATION_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
}

export async function saveLocationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "manager");
  if (!auth) return DENIED;
  const values = echoValues(formData, LOCATION_FIELDS);
  const parsed = locationSchema.safeParse(locationFromForm(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  const locationId = String(formData.get("locationId") ?? "");
  try {
    const { repo, user } = auth.ctx;
    if (locationId) {
      if (!uuidSchema.safeParse(locationId).success) return DENIED;
      await repo.updateLocation(user, auth.businessId, locationId, parsed.data);
    } else {
      await repo.createLocation(user, auth.businessId, parsed.data);
    }
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err, values);
  }
}

export async function deleteLocationAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData, "manager");
  const locationId = String(formData.get("locationId") ?? "");
  if (!auth || !uuidSchema.safeParse(locationId).success) return;
  try {
    await auth.ctx.repo.deleteLocation(auth.ctx.user, auth.businessId, locationId);
    refresh(auth.businessId);
  } catch (err) {
    handle(err);
  }
}

export async function createCardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "manager");
  if (!auth) return DENIED;
  const values = echoValues(formData, ["label", "locationId"]);
  const parsed = cardSchema.safeParse({ label: formData.get("label") ?? "", locationId: formData.get("locationId") ?? "" });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (parsed.data.locationId && !uuidSchema.safeParse(parsed.data.locationId).success) return DENIED;
  try {
    await auth.ctx.repo.createCard(auth.ctx.user, auth.businessId, parsed.data);
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err, values);
  }
}

export async function updateCardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "manager");
  if (!auth) return DENIED;
  const cardId = String(formData.get("cardId") ?? "");
  if (!uuidSchema.safeParse(cardId).success) return DENIED;
  const values = echoValues(formData, ["label", "locationId"]);
  const parsed = cardSchema.safeParse({ label: formData.get("label") ?? "", locationId: formData.get("locationId") ?? "" });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (parsed.data.locationId && !uuidSchema.safeParse(parsed.data.locationId).success) return DENIED;
  try {
    await auth.ctx.repo.updateCard(auth.ctx.user, auth.businessId, cardId, parsed.data);
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err, values);
  }
}

export async function setCardStatusAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData, "manager");
  const cardId = String(formData.get("cardId") ?? "");
  const status = z.enum(["active", "inactive"]).safeParse(formData.get("status"));
  if (!auth || !uuidSchema.safeParse(cardId).success || !status.success) return;
  try {
    await auth.ctx.repo.updateCard(auth.ctx.user, auth.businessId, cardId, { status: status.data });
    refresh(auth.businessId);
  } catch (err) {
    handle(err);
  }
}

export async function setRetentionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const auth = await authorize(formData, "owner");
  if (!auth) return DENIED;
  const months = z.coerce.number().int().min(1).max(60).safeParse(formData.get("months"));
  if (!months.success) return { status: "error", fieldErrors: { months: "validation.invalid" } };
  try {
    await auth.ctx.repo.setRetention(auth.ctx.user, auth.businessId, months.data);
    refresh(auth.businessId);
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return handle(err);
  }
}

export async function requestDeletionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const scope = z.enum(["account", "business"]).safeParse(formData.get("scope"));
  if (!scope.success) return { status: "error", fieldErrors: { scope: "validation.required" } };
  // Deleting the whole business needs the owner; deleting your own account needs only membership.
  const auth = await authorize(formData, scope.data === "business" ? "owner" : "viewer");
  if (!auth) return DENIED;
  const details = String(formData.get("details") ?? "").trim().slice(0, 2000) || null;
  try {
    await auth.ctx.repo.createDeletionRequest(auth.ctx.user, {
      scope: scope.data,
      details,
      businessId: scope.data === "business" ? auth.businessId : null,
    });
    refresh(auth.businessId);
    return { status: "success", message: "dashboard.privacy.deletionSent" };
  } catch (err) {
    return handle(err);
  }
}

export async function setCancelAtPeriodEndAction(formData: FormData): Promise<void> {
  const auth = await authorize(formData, "owner");
  if (!auth) return;
  try {
    await auth.ctx.repo.setCancelAtPeriodEnd(auth.ctx.user, auth.businessId, formData.get("cancel") === "true");
    refresh(auth.businessId);
  } catch (err) {
    handle(err);
  }
}
