import { type NextRequest } from "next/server";
import { authorizeBusiness } from "@/server/auth/guards";
import { getSessionUser } from "@/server/auth/session";
import { hashKey } from "@/server/security/request";
import { rateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { logger } from "@/server/security/logger";

/**
 * Data export (portability). Manager+ of the business only. The file holds
 * anonymous ratings only — there is no customer personal data to export.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/export/[businessId]">) {
  const { businessId } = await ctx.params;
  const auth = await authorizeBusiness(await getSessionUser(), businessId, "manager");
  if (!auth) return new Response("Not found", { status: 404 });
  if (!(await rateLimit(hashKey("export", auth.user.userId), RATE_LIMITS.export))) {
    return new Response("Too many requests", { status: 429 });
  }

  try {
    const [business, rows, locations] = await Promise.all([
      auth.repo.getBusiness(auth.user, businessId),
      auth.repo.exportFeedback(auth.user, businessId),
      auth.repo.listLocations(auth.user, businessId),
    ]);
    const locName = new Map(locations.map((l) => [l.id, l.name]));
    const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `5ali-review-${business.slug}-feedback-${stamp}.${format}`;
    const headers = {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };

    const records = rows.map((f) => ({
      id: f.id,
      created_at: f.createdAt,
      rating: f.rating,
      location: f.locationId ? (locName.get(f.locationId) ?? "") : "",
      source: f.source,
    }));

    if (format === "json") {
      return new Response(JSON.stringify({ business: business.name, exported_at: new Date().toISOString(), feedback: records }, null, 2), {
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
      });
    }
    const csv = ["id,created_at,rating,location,source", ...records.map((r) => [r.id, r.created_at, r.rating, csvCell(r.location), r.source].join(","))].join("\r\n");
    // BOM so spreadsheet apps open UTF-8 (Arabic/French names) correctly.
    return new Response(`﻿${csv}\r\n`, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  } catch (err) {
    logger.error("export_failed", err);
    return new Response("Error", { status: 500 });
  }
}

/** Quotes a CSV cell and neutralises spreadsheet formula injection (=, +, -, @). */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
