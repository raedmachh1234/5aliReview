import { NextResponse, type NextRequest } from "next/server";
import { resolveAdminCredentials, SESSION_COOKIE, verifySessionToken } from "@/server/auth/token";

/**
 * Sends signed-out visitors of /admin to the login page before anything
 * renders. This is a convenience layer: every admin page and Server Action
 * checks the session again itself.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const credentials = resolveAdminCredentials();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (credentials && verifySessionToken(token, credentials.key)) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  if (pathname !== "/admin") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
