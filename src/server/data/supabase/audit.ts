import "server-only";
import type { Actor, AuditLog } from "@/lib/types";
import { createServiceClient, createUserClient, hasServiceRoleKey } from "@/server/supabase/clients";

/**
 * Appends an audit entry. Metadata must reference ids, never personal data
 * (no emails, names or free text typed by customers).
 *
 * Actor entries go through the user's own session (RLS only accepts
 * actor_user_id = auth.uid()). System entries (actor = null) need the service
 * role and are skipped when it isn't configured.
 *
 * An audit failure is logged (code only) but does not fail the caller: the
 * audited change has already been committed at this point.
 */
export async function writeAudit(
  actor: Actor | null,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: AuditLog["metadata"] = {},
): Promise<void> {
  const row = {
    actor_user_id: actor?.userId ?? null,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  };

  if (!actor && !hasServiceRoleKey()) {
    console.warn("[audit] system entry skipped: service role not configured", { action });
    return;
  }

  const client = actor ? await createUserClient() : createServiceClient();
  const { error } = await client.from("audit_logs").insert(row);
  if (error) console.error("[audit] insert failed", { action, code: error.code });
}
