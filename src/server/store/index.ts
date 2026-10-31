import "server-only";
import path from "node:path";
import { env } from "@/server/env";
import { createFileStore } from "./file-store";
import { createSupabaseStore } from "./supabase-store";
import type { CatalogStore } from "./types";

export type { CatalogStore } from "./types";

export const dataDir = env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(process.cwd(), "data");

let instance: CatalogStore | null = null;

/** Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, otherwise the local JSON file. */
export function getStore(): CatalogStore {
  instance ??=
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
      : createFileStore(dataDir);
  return instance;
}
