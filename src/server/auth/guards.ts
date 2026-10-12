import "server-only";
import { notFound, redirect } from "next/navigation";
import type { MemberRole } from "@/lib/types";
import { uuidSchema } from "@/lib/validation";
import { getRepository, roleAtLeast, type Repository } from "@/server/data";
import { getSessionUser, type SessionUser } from "./session";

/**
 * Server-side authorization. Every page, server action and route handler
 * that touches private data calls one of these — client-side checks are
 * only cosmetic. Unauthorized access to another business returns 404 so we
 * don't reveal whether it exists.
 */

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export interface BusinessContext {
  user: SessionUser;
  role: MemberRole | "admin";
  repo: Repository;
}

/** For pages/layouts: 404 on any failure. */
export async function requireBusinessAccess(businessId: string, min: MemberRole = "viewer"): Promise<BusinessContext> {
  if (!uuidSchema.safeParse(businessId).success) notFound();
  const user = await requireUser(`/dashboard/${businessId}`);
  const ctx = await authorizeBusiness(user, businessId, min);
  if (!ctx) notFound();
  return ctx;
}

/** For server actions / route handlers: returns null instead of throwing. */
export async function authorizeBusiness(
  user: SessionUser | null,
  businessId: string,
  min: MemberRole = "viewer",
): Promise<BusinessContext | null> {
  if (!user || !uuidSchema.safeParse(businessId).success) return null;
  const repo = await getRepository();
  if (user.isPlatformAdmin) return { user, role: "admin", repo };
  const role = await repo.getRole(user, businessId);
  if (!roleAtLeast(role, min) || !role) return null;
  return { user, role, repo };
}

export async function requirePlatformAdmin(): Promise<{ user: SessionUser; repo: Repository }> {
  const user = await requireUser("/admin");
  if (!user.isPlatformAdmin) notFound();
  return { user, repo: await getRepository() };
}

/** For admin server actions. */
export async function authorizeAdmin(): Promise<{ user: SessionUser; repo: Repository } | null> {
  const user = await getSessionUser();
  if (!user?.isPlatformAdmin) return null;
  return { user, repo: await getRepository() };
}

/** Whether a role may perform an action — used to hide controls (server still re-checks). */
export function can(role: MemberRole | "admin", min: MemberRole): boolean {
  return role === "admin" || roleAtLeast(role, min);
}
