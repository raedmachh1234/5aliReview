import "server-only";
import type { Repository } from "@/server/data/repository";
import { createServiceClient } from "@/server/supabase/clients";
import { createAdminRepository } from "./admin";
import { writeAudit } from "./audit";
import { createBusinessRepository } from "./business";
import { maybe } from "./db";
import { createPublicRepository } from "./public";

/**
 * Supabase-backed Repository (see repository.ts for the contract).
 *  - public.ts   anonymous RPCs only (no session)
 *  - business.ts tenant operations with the user's JWT + role checks
 *  - admin.ts    platform-admin operations with the user's JWT + admin checks
 * The service-role key is used only for retention purging and system audit
 * entries, never to serve a request on behalf of a user.
 */
export function createSupabaseRepository(): Repository {
  return {
    ...createPublicRepository(),
    ...createBusinessRepository(),
    audit: writeAudit,
    admin: createAdminRepository(),
    maintenance: {
      async purgeExpiredData() {
        const counts = maybe<Record<string, number>>(
          await createServiceClient().rpc("purge_expired_data"),
          "purge_expired_data",
        );
        return Object.fromEntries(Object.entries(counts ?? {}).map(([table, n]) => [table, Number(n)]));
      },
    },
  };
}
