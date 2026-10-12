import "server-only";
import { assertDemoModeAllowed, isDemoMode } from "@/server/env";
import type { Repository } from "./repository";

/**
 * Returns the repository for the current request. Supabase when configured;
 * otherwise the in-memory demo repository (refused in production unless
 * ALLOW_DEMO_MODE=true). Imported lazily so the unused implementation is
 * never loaded.
 */
export async function getRepository(): Promise<Repository> {
  if (isDemoMode) {
    assertDemoModeAllowed();
    const { createDemoRepository } = await import("./demo");
    return createDemoRepository();
  }
  const { createSupabaseRepository } = await import("./supabase");
  return createSupabaseRepository();
}

export { isDemoMode };
export * from "./repository";
