import { NextResponse, type NextRequest } from "next/server";
import { cardCodeSchema } from "@/lib/validation";
import { getRepository } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * Permanent card link written on the NFC chip (and encoded in the QR code
 * with ?s=qr). Resolving through the card lets owners change where a card
 * points — or deactivate it — without reprogramming the chip.
 * Only internal destinations are possible, so this can't be an open redirect.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/t/[code]">) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  const unavailable = new URL("/r/unavailable", request.url);

  if (!cardCodeSchema.safeParse(code).success) return NextResponse.redirect(unavailable, 303);

  try {
    const repo = await getRepository();
    const target = await repo.resolveCard(code);
    if (!target) return NextResponse.redirect(unavailable, 303);

    const isQr = request.nextUrl.searchParams.get("s") === "qr";
    await repo.recordEvent({
      slug: target.slug,
      locationSlug: target.locationSlug ?? undefined,
      cardCode: code,
      type: isQr ? "qr_scan" : "nfc_visit",
    });

    const dest = new URL(`/r/${target.slug}`, request.url);
    if (target.locationSlug) dest.searchParams.set("loc", target.locationSlug);
    dest.searchParams.set("card", code);
    dest.searchParams.set("src", isQr ? "qr" : "nfc");
    const lang = request.nextUrl.searchParams.get("lang");
    if (lang) dest.searchParams.set("lang", lang);

    const res = NextResponse.redirect(dest, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    logger.error("card_resolve_failed", err);
    return NextResponse.redirect(unavailable, 303);
  }
}
