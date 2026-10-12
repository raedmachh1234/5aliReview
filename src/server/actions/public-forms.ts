"use server";

import { newUnsubscribeToken } from "@/server/email";
import { contactSchema, deletionRequestSchema } from "@/lib/validation";
import { echoValues, fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { getRepository } from "@/server/data";
import { requestIpHash } from "@/server/security/request";
import { rateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { logger } from "@/server/security/logger";

/** Contact / demo request. Collects only what's needed to reply. */
export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, ["name", "email", "businessName", "message"]);
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    businessName: formData.get("businessName") ?? "",
    message: formData.get("message"),
    marketingOptIn: formData.get("marketingOptIn") ?? undefined,
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    // Honeypot filled → pretend success so bots learn nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { status: "success" };
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  try {
    if (!(await rateLimit(await requestIpHash("contact"), RATE_LIMITS.contact))) {
      return { status: "error", message: "errors.rateLimited", values };
    }
    const repo = await getRepository();
    const { name, email, businessName, message, marketingOptIn } = parsed.data;
    await repo.createContactRequest({ name, email, businessName: businessName ?? null, message, marketingOptIn });
    if (marketingOptIn) {
      // Separate, explicit opt-in. Only a hash is stored; a fresh token is issued (and the
      // hash replaced) whenever a marketing email is actually sent — see server/email.
      await repo.subscribeMarketing({ email, source: "contact_form", tokenHash: newUnsubscribeToken().tokenHash });
    }
    return { status: "success" };
  } catch (err) {
    logger.error("contact_submit_failed", err);
    return { status: "error", message: "errors.generic", values };
  }
}

/** Public data deletion request — for people without (or locked out of) an account. */
export async function submitDeletionRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, ["email", "scope", "details"]);
  const parsed = deletionRequestSchema.safeParse({
    email: formData.get("email"),
    scope: formData.get("scope"),
    details: formData.get("details") ?? "",
    confirm: formData.get("confirm") ?? undefined,
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { status: "success" };
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  try {
    if (!(await rateLimit(await requestIpHash("deletion"), RATE_LIMITS.deletion))) {
      return { status: "error", message: "errors.rateLimited", values };
    }
    const repo = await getRepository();
    await repo.createPublicDeletionRequest({ email: parsed.data.email, scope: parsed.data.scope, details: parsed.data.details ?? null });
    return { status: "success" };
  } catch (err) {
    logger.error("deletion_request_failed", err);
    return { status: "error", message: "errors.generic", values };
  }
}
