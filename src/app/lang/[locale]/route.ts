import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { CONSENT_COOKIE, LOCALE_COOKIE, parseConsent } from "@/config/cookies";
import { isLocale } from "@/i18n/config";

/**
 * Language switcher: /lang/fr?next=/pricing
 * The choice is remembered for a year only with "preferences" consent;
 * otherwise as a session cookie (deleted when the browser closes).
 * `next` must be a same-site relative path (no open redirect).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/lang/[locale]">) {
  const { locale } = await ctx.params;
  const nextParam = request.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = /^\/(?!\/|\\)[^\s]*$/.test(nextParam) ? nextParam : "/";
  const res = NextResponse.redirect(new URL(safeNext, request.url), 303);
  if (!isLocale(locale)) return res;

  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  res.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(consent?.preferences ? { maxAge: 60 * 60 * 24 * 365 } : {}),
  });
  return res;
}
