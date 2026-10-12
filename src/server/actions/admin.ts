"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { plans } from "@/config/plans";
import { echoValues, fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { adminBusinessSchema, emailSchema, localeSchema, uuidSchema } from "@/lib/validation";
import { authorizeAdmin } from "@/server/auth/guards";
import { AccessDeniedError, ConflictError, NotFoundError } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * Platform-admin mutations. Each one re-checks admin rights on the server
 * (never trusting the UI) and the repository writes an audit log entry.
 */

const DENIED: FormState = { status: "error", message: "errors.forbidden" };

function fail(err: unknown, values?: Record<string, string>): FormState {
  if (err instanceof ConflictError) return { status: "error", fieldErrors: { [err.field]: "validation.taken" }, values };
  if (err instanceof NotFoundError) return { status: "error", message: "admin.notFound", values };
  if (err instanceof AccessDeniedError) return DENIED;
  logger.error("admin_action_failed", err);
  return { status: "error", message: "errors.generic", values };
}

const BUSINESS_FIELDS = ["name", "slug", "status", "description", "website", "phone", "email", "address", "logoAlt", "brandPrimary", "brandAccent", "defaultLocale", "googleReviewUrl"];

function businessFromForm(formData: FormData) {
  const v = Object.fromEntries(BUSINESS_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
  return { ...v, openingHours: {}, socialLinks: {} };
}

export async function saveBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await authorizeAdmin();
  if (!admin) return DENIED;
  const values = echoValues(formData, BUSINESS_FIELDS);
  const parsed = adminBusinessSchema.safeParse(businessFromForm(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  const id = String(formData.get("businessId") ?? "");
  let createdId: string | null = null;
  try {
    if (id) {
      if (!uuidSchema.safeParse(id).success) return DENIED;
      // Keep hours/social links that the admin form doesn't edit.
      const current = await admin.repo.admin.getBusiness(admin.user, id);
      await admin.repo.admin.updateBusiness(admin.user, id, {
        ...parsed.data,
        openingHours: current.openingHours as Record<string, string>,
        socialLinks: current.socialLinks as Record<string, string>,
      });
    } else {
      createdId = (await admin.repo.admin.createBusiness(admin.user, parsed.data)).id;
    }
  } catch (err) {
    return fail(err, values);
  }
  revalidatePath("/admin", "layout");
  if (createdId) redirect(`/admin/businesses/${createdId}`);
  return { status: "success", message: "common.saved" };
}

export async function setBusinessStatusAction(formData: FormData): Promise<void> {
  const admin = await authorizeAdmin();
  const id = String(formData.get("businessId") ?? "");
  const status = z.enum(["active", "suspended"]).safeParse(formData.get("status"));
  if (!admin || !uuidSchema.safeParse(id).success || !status.success) return;
  await admin.repo.admin.setBusinessStatus(admin.user, id, status.data);
  revalidatePath("/admin", "layout");
}

export async function deleteBusinessAction(formData: FormData): Promise<void> {
  const admin = await authorizeAdmin();
  const id = String(formData.get("businessId") ?? "");
  if (!admin || !uuidSchema.safeParse(id).success) return;
  await admin.repo.admin.deleteBusiness(admin.user, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/businesses");
}

export async function setMembershipAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await authorizeAdmin();
  if (!admin) return DENIED;
  const values = echoValues(formData, ["email", "businessId", "role"]);
  const parsed = z
    .object({ email: emailSchema, businessId: uuidSchema, role: z.enum(["owner", "manager", "viewer"]) })
    .safeParse({ email: formData.get("email"), businessId: formData.get("businessId"), role: formData.get("role") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    await admin.repo.admin.setMembership(admin.user, parsed.data);
    revalidatePath("/admin/users");
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return fail(err, values);
  }
}

export async function removeMembershipAction(formData: FormData): Promise<void> {
  const admin = await authorizeAdmin();
  const userId = String(formData.get("userId") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  if (!admin || !uuidSchema.safeParse(userId).success || !uuidSchema.safeParse(businessId).success) return;
  await admin.repo.admin.removeMembership(admin.user, { userId, businessId });
  revalidatePath("/admin/users");
}

export async function setPlatformAdminAction(formData: FormData): Promise<void> {
  const admin = await authorizeAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!admin || !uuidSchema.safeParse(userId).success) return;
  try {
    await admin.repo.admin.setPlatformAdmin(admin.user, userId, formData.get("isAdmin") === "true");
  } catch (err) {
    fail(err);
  }
  revalidatePath("/admin/users");
}

export async function saveSubscriptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await authorizeAdmin();
  if (!admin) return DENIED;
  const parsed = z
    .object({
      businessId: uuidSchema,
      planId: z.enum(plans.map((p) => p.id) as [string, ...string[]]),
      interval: z.enum(["month", "year"]),
      status: z.enum(["trialing", "active", "past_due", "canceled"]),
      currentPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "validation.invalid" }),
    })
    .safeParse(Object.fromEntries(["businessId", "planId", "interval", "status", "currentPeriodEnd"].map((k) => [k, formData.get(k)])));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    await admin.repo.admin.upsertSubscription(admin.user, {
      ...parsed.data,
      currentPeriodEnd: new Date(`${parsed.data.currentPeriodEnd}T23:59:59Z`).toISOString(),
    });
    revalidatePath("/admin/billing");
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return fail(err);
  }
}

export async function createInvoiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await authorizeAdmin();
  if (!admin) return DENIED;
  const values = echoValues(formData, ["businessId", "amount", "description"]);
  const parsed = z
    .object({
      businessId: uuidSchema,
      amount: z.coerce.number({ error: "validation.invalid" }).positive({ error: "validation.invalid" }).max(1_000_000, { error: "validation.invalid" }),
      description: z.string().trim().min(3, { error: "validation.required" }).max(200, { error: "validation.tooLong" }),
    })
    .safeParse({ businessId: formData.get("businessId"), amount: formData.get("amount"), description: formData.get("description") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    await admin.repo.admin.createInvoice(admin.user, {
      businessId: parsed.data.businessId,
      amountMinor: Math.round(parsed.data.amount * 1000),
      description: parsed.data.description,
    });
    revalidatePath("/admin/billing");
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return fail(err, values);
  }
}

export async function setInvoiceStatusAction(formData: FormData): Promise<void> {
  const admin = await authorizeAdmin();
  const id = String(formData.get("invoiceId") ?? "");
  const status = z.enum(["open", "paid", "void", "refunded"]).safeParse(formData.get("status"));
  if (!admin || !uuidSchema.safeParse(id).success || !status.success) return;
  await admin.repo.admin.setInvoiceStatus(admin.user, id, status.data);
  revalidatePath("/admin/billing");
}

export async function updateDeletionRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await authorizeAdmin();
  if (!admin) return DENIED;
  const parsed = z
    .object({
      id: uuidSchema,
      status: z.enum(["pending", "in_progress", "completed", "rejected"]),
      note: z.string().trim().max(1000, { error: "validation.tooLong" }),
    })
    .safeParse({ id: formData.get("id"), status: formData.get("status"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    await admin.repo.admin.updateDeletionRequest(admin.user, parsed.data.id, parsed.data.status, parsed.data.note || null);
    revalidatePath("/admin", "layout");
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return fail(err);
  }
}

export async function publishLegalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await authorizeAdmin();
  if (!admin) return DENIED;
  const values = echoValues(formData, ["slug", "locale", "title", "bodyMd"]);
  const parsed = z
    .object({
      slug: z.enum(["privacy", "terms", "refunds", "cookies", "subprocessors"]),
      locale: localeSchema,
      title: z.string().trim().min(3, { error: "validation.required" }).max(120, { error: "validation.tooLong" }),
      bodyMd: z.string().trim().min(50, { error: "validation.messageShort" }).max(100_000, { error: "validation.tooLong" }),
    })
    .safeParse({ slug: formData.get("slug"), locale: formData.get("locale"), title: formData.get("title"), bodyMd: formData.get("bodyMd") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    await admin.repo.admin.publishLegalDocument(admin.user, parsed.data);
    revalidatePath(`/legal/${parsed.data.slug}`);
    revalidatePath("/admin/legal");
    return { status: "success", message: "common.saved" };
  } catch (err) {
    return fail(err, values);
  }
}
