import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { AdminBusinessForm } from "@/components/admin/business-form";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";

export default async function AdminBusinesses() {
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const businesses = await repo.admin.listBusinesses(user);

  return (
    <>
      <PageHeader title={a.nav.businesses} description={a.businesses.lead} />
      <Card className="mb-6">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={a.nav.businesses}>
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold tracking-wide text-ink-2 uppercase">
                <th scope="col" className="px-5 py-3 text-start">{a.businesses.name}</th>
                <th scope="col" className="px-5 py-3 text-start">{a.businesses.status}</th>
                <th scope="col" className="px-5 py-3 text-end">{a.businesses.locations}</th>
                <th scope="col" className="px-5 py-3 text-end">{a.businesses.cards}</th>
                <th scope="col" className="px-5 py-3 text-end">{a.businesses.feedback}</th>
                <th scope="col" className="px-5 py-3 text-end"><span className="sr-only">{a.businesses.edit}</span></th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 text-start">
                    <span className="font-semibold text-ink">{b.name}</span>
                    {b.isDemo ? <Badge tone="warn" className="ms-2">{a.businesses.demo}</Badge> : null}
                    <span className="block font-normal text-muted" dir="ltr">/r/{b.slug}</span>
                  </th>
                  <td className="px-5 py-3">
                    <Badge tone={b.status === "active" ? "success" : "danger"}>{a.businesses.statuses[b.status]}</Badge>
                  </td>
                  <td className="tabular px-5 py-3 text-end">{b.locations}</td>
                  <td className="tabular px-5 py-3 text-end">{b.cards}</td>
                  <td className="tabular px-5 py-3 text-end">{b.feedback.toLocaleString("en")}</td>
                  <td className="px-5 py-3 text-end whitespace-nowrap">
                    <Link href={`/admin/businesses/${b.id}`} className="font-semibold text-pine underline underline-offset-4">
                      {a.businesses.edit}<span className="sr-only"> {b.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader title={a.businesses.create} />
        <div className="p-5">
          <AdminBusinessForm t={t} />
        </div>
      </Card>
    </>
  );
}
