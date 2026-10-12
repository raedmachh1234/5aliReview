import { requirePlatformAdmin } from "@/server/auth/guards";
import { adminText as a } from "@/i18n/admin";
import { adminDate } from "@/components/admin/table";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";

export default async function AdminInbox() {
  const { user, repo } = await requirePlatformAdmin();
  const messages = await repo.admin.listContactRequests(user);
  return (
    <>
      <PageHeader title={a.nav.inbox} description={a.inbox.lead} />
      {messages.length === 0 ? (
        <Card>
          <EmptyState icon="mail" title={a.inbox.none} />
        </Card>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink">
                      {m.name}
                      {m.businessName ? <span className="font-normal text-muted"> · {m.businessName}</span> : null}
                    </p>
                    <a href={`mailto:${m.email}`} className="text-sm text-pine underline underline-offset-4">
                      {m.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    {m.marketingOptIn ? <Badge tone="brand">{a.inbox.marketing}</Badge> : null}
                    {adminDate(m.createdAt)}
                  </div>
                </div>
                <p className="mt-3 text-sm whitespace-pre-wrap text-ink-2">{m.message}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
