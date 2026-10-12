import { requirePlatformAdmin } from "@/server/auth/guards";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { AdminTable, adminDate } from "@/components/admin/table";
import { Badge, Card, PageHeader } from "@/components/ui/surface";
import { Stars } from "@/components/ui/stars";

export default async function AdminFeedback() {
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const rows = await repo.admin.listRecentFeedback(user, 100);
  const r = t.dashboard.recent;
  return (
    <>
      <PageHeader title={a.nav.feedback} description={a.feedback.lead} />
      <Card>
        <AdminTable label={a.nav.feedback} head={[r.rating, a.feedback.business, r.when, r.source]}>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>
                <Stars rating={f.rating} label={fmt(t.common.starsOutOf, { n: f.rating })} />
              </td>
              <td className="font-semibold text-ink">{f.businessName}</td>
              <td className="whitespace-nowrap text-ink-2">{adminDate(f.createdAt)}</td>
              <td>
                <Badge>{r.sources[f.source]}</Badge>
              </td>
            </tr>
          ))}
        </AdminTable>
      </Card>
    </>
  );
}
