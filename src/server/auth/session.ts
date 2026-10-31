import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isProduction } from "@/server/env";
import { createSessionToken, resolveAdminCredentials, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken } from "./token";

export async function isAdmin(): Promise<boolean> {
  const credentials = resolveAdminCredentials();
  if (!credentials) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, credentials.key);
}

/** Call at the top of every admin page and Server Action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startSession(key: Buffer): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(key), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
