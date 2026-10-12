import { requirePlatformAdmin } from "@/server/auth/guards";
import { adminText as a } from "@/i18n/admin";
import { AdminTable, adminDate } from "@/components/admin/table";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";

export default async function AdminLogs() {
  const { user, repo } = await requirePlatformAdmin();
  const logs = await repo.admin.listAuditLogs(user, 200);
  return (
    <>
      <PageHeader title={a.nav.logs} description={a.logs.lead} />
      <Card>
        {logs.length === 0 ? (
          <EmptyState icon="log" title="—" />
        ) : (
          <AdminTable label={a.nav.logs} head={[a.logs.when, a.logs.action, a.logs.target, a.logs.actor, a.logs.details]} minWidth="56rem">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-ink-2">{adminDate(l.createdAt)}</td>
                <th scope="row" className="text-start font-mono text-xs font-semibold">{l.action}</th>
                <td className="font-mono text-xs text-ink-2">
                  {l.targetType}
                  {l.targetId ? `:${l.targetId.slice(0, 8)}` : ""}
                </td>
                <td className="font-mono text-xs text-ink-2">{l.actorUserId?.slice(0, 8) ?? "system"}</td>
                <td className="font-mono text-xs text-muted">{Object.keys(l.metadata).length ? JSON.stringify(l.metadata) : ""}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </Card>
    </>
  );
}
