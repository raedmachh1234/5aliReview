import QRCode from "qrcode";
import { type NextRequest } from "next/server";
import { cardQrUrl } from "@/lib/card-urls";
import { authorizeBusiness } from "@/server/auth/guards";
import { getSessionUser } from "@/server/auth/session";
import { NotFoundError, AccessDeniedError } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * QR code for a card, generated on the server (no third-party QR service).
 * Members of the business only. ?format=svg (default, best for print) | png
 * &download=1 sends it as an attachment.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/qr/[businessId]/[cardId]">) {
  const { businessId, cardId } = await ctx.params;
  const auth = await authorizeBusiness(await getSessionUser(), businessId, "viewer");
  if (!auth) return new Response("Not found", { status: 404 });

  try {
    const card = await auth.repo.getCard(auth.user, businessId, cardId);
    const url = cardQrUrl(card.code);
    const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
    const download = request.nextUrl.searchParams.get("download") === "1";
    const filename = `5ali-review-${card.code}.${format}`;
    const headers: Record<string, string> = {
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
    };

    if (format === "png") {
      const png = await QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 2, width: 1024, color: { dark: "#101828", light: "#ffffff" } });
      return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
    }
    const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#101828", light: "#ffffff" } });
    return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof AccessDeniedError) return new Response("Not found", { status: 404 });
    logger.error("qr_generation_failed", err);
    return new Response("Error", { status: 500 });
  }
}
