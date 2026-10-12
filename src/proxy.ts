import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_COOKIE } from "@/config/cookies";
import { defaultLocale, isLocale, LOCALE_HEADER, LOCALE_SOURCE_HEADER, matchAcceptLanguage, PATH_HEADER } from "@/i18n/config";

/**
 * Runs before every page request:
 *  1. Generates a per-request nonce and a strict Content-Security-Policy.
 *  2. Resolves the UI language (?lang → cookie → Accept-Language → English).
 *  3. Refreshes the Supabase auth session — only on private routes, so the
 *     customer feedback pages (/r, /t) never receive a cookie.
 */
const PRIVATE_PREFIXES = ["/dashboard", "/admin", "/login", "/signup", "/auth"];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are needed for data-driven widths (charts) and brand colours.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ""}`,
    "font-src 'self'",
    `connect-src 'self'${supabase ? ` ${supabase}` : ""}${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function resolveLocale(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("lang");
  if (isLocale(query)) return { locale: query, source: "query" };
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return { locale: cookie, source: "cookie" };
  const accepted = matchAcceptLanguage(request.headers.get("accept-language"));
  if (accepted) return { locale: accepted, source: "accept" };
  return { locale: defaultLocale, source: "default" };
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const { locale, source } = resolveLocale(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set(LOCALE_HEADER, locale);
  requestHeaders.set(LOCALE_SOURCE_HEADER, source);
  // Current path (without ?lang) so the language switcher can return to the same page.
  const pathForSwitcher = new URL(request.nextUrl);
  pathForSwitcher.searchParams.delete("lang");
  requestHeaders.set(PATH_HEADER, pathForSwitcher.pathname + pathForSwitcher.search);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const path = request.nextUrl.pathname;
  const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (isPrivate && url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    });
    // Validates the JWT with Supabase and refreshes it if needed.
    await supabase.auth.getUser();
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Prefetches go through the proxy too, so prefetched pages get the right language.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|demo/).*)"],
};
