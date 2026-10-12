import { createHash } from "node:crypto";
import { type NextRequest } from "next/server";
import { getRepository } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * RFC 8058 one-click unsubscribe, called by mail clients with
 * POST body "List-Unsubscribe=One-Click". (People use /unsubscribe.)
 * No Origin check here by design: mail providers call it server-to-server,
 * and the unguessable token is the authorization.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response(null, { status: 400 });
  try {
    const repo = await getRepository();
    await repo.unsubscribe(createHash("sha256").update(token).digest("hex"));
  } catch (err) {
    logger.error("one_click_unsubscribe_failed", err);
    return new Response(null, { status: 500 });
  }
  // Always 200 for valid-looking tokens so the endpoint can't be used to probe for subscribers.
  return new Response(null, { status: 200 });
}
