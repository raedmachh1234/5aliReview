import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { MemberRole } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { requireBusinessAccess } from "@/server/auth/guards";
import { AccessDeniedError, NotFoundError } from "@/server/data";

/**
 * Loads everything a dashboard page needs, after the server-side access
 * check. Cached per request so layout + page share one lookup.
 */
export const loadDashboard = cache(async (businessId: string, min: MemberRole = "viewer") => {
  const ctx = await requireBusinessAccess(businessId, min);
  const { t, locale } = await getI18n();
  try {
    const business = await ctx.repo.getBusiness(ctx.user, businessId);
    return { ...ctx, business, t, locale };
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof AccessDeniedError) notFound();
    throw err;
  }
});
