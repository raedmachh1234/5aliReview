import { NextResponse, type NextRequest } from "next/server";
import { isAllowedGoogleReviewUrl } from "@/lib/google-review-url";
import { cardCodeSchema, slugSchema } from "@/lib/validation";
import { getRepository } from "@/server/data";
import { hashKey, clientIpFrom } from "@/server/security/request";
import { rateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { logger } from "@/server/security/logger";

/**
 * "Leave a Google Review" — counts an anonymous click, then redirects to the
 * business's stored Google review link. The destination is never taken from
 * the request (no open redirect) and is re-validated against the Google
 * allowlist. The rating plays no part here: the same link serves everyone.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[slug]/google">) {
  const { slug: slugParam } = await ctx.params;
  const slug = slugSchema.safeParse(slugParam);
  const back = new URL(`/r/${encodeURIComponent(slugParam)}`, request.url);
  if (!slug.success) return NextResponse.redirect(back, 303);

  const locParam = request.nextUrl.searchParams.get("loc") ?? undefined;
  const loc = locParam && slugSchema.safeParse(locParam).success ? locParam : undefined;
  const cardParam = request.nextUrl.searchParams.get("card") ?? undefined;
  const card = cardParam && cardCodeSchema.safeParse(cardParam).success ? cardParam : undefined;

  try {
    const repo = await getRepository();
    const url = await repo.getGoogleReviewUrl(slug.data, loc);
    if (!url || !isAllowedGoogleReviewUrl(url)) return NextResponse.redirect(back, 303);

    // Count at most a few clicks per visitor per minute so double-taps don't inflate stats.
    if (await rateLimit(hashKey("google", clientIpFrom(request.headers), slug.data), RATE_LIMITS.feedback)) {
      await repo.recordEvent({ slug: slug.data, locationSlug: loc, cardCode: card, type: "google_review_clicked" });
    }
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    logger.error("google_redirect_failed", err);
    return NextResponse.redirect(back, 303);
  }
}
