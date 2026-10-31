"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/types";
import { endSession, startSession } from "@/server/auth/session";
import { passwordMatches, resolveAdminCredentials } from "@/server/auth/token";
import { clientIp, hit } from "@/server/rate-limit";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

/** Only same-site admin paths are accepted as a post-login destination. */
function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === "string" && /^\/admin(\/[\w\-/]*)?$/.test(value) && value !== "/admin/login" ? value : "/admin";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const credentials = resolveAdminCredentials();
  if (!credentials) {
    return { status: "error", message: "The admin area is locked. Set ADMIN_PASSWORD and SESSION_SECRET on the server." };
  }
  if (!hit(`login:${await clientIp()}`, MAX_ATTEMPTS, WINDOW_MS)) {
    return { status: "error", message: "Too many attempts. Wait a few minutes and try again." };
  }
  const password = formData.get("password");
  if (typeof password !== "string" || !passwordMatches(password, credentials.password)) {
    return { status: "error", message: "That password isn’t right.", fieldErrors: { password: "Incorrect password." } };
  }
  await startSession(credentials.key);
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
