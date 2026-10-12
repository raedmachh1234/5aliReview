import { timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";
import { env } from "@/server/env";
import { getRepository } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * Daily retention job (Vercel Cron, see vercel.json). Deletes ratings,
 * counters, contact requests, audit logs and rate-limit entries past their
 * retention period. Protected by CRON_SECRET (Authorization: Bearer …).
 */
export async function GET(request: NextRequest) {
  const secret = env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const repo = await getRepository();
    const deleted = await repo.maintenance.purgeExpiredData();
    logger.info("retention_purge_completed", deleted);
    return Response.json({ ok: true, deleted });
  } catch (err) {
    logger.error("retention_purge_failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
