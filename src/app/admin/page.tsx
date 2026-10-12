import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { adminText as a } from "@/i18n/admin";
import { fmt } from "@/i18n/config";
import { Kpi } from "@/components/dashboard/kpi";
import { PageHeader } from "@/components/ui/surface";

export default async function AdminOverview() {
  const { user, repo } = await requirePlatformAdmin();
  const o = await repo.admin.overview(user);
  return (
    <>
      <PageHeader title={a.nav.overview} description={a.overview.lead} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label={a.overview.businesses} value={o.businesses} sub={fmt(a.overview.active, { n: o.activeBusinesses })} icon="building" />
        <Kpi label={a.overview.users} value={o.users} icon="users" />
        <Kpi label={a.overview.feedback30} value={o.feedbackLast30.toLocaleString("en")} icon="list" />
        <Kpi label={a.overview.clicks30} value={o.googleClicksLast30.toLocaleString("en")} icon="external" />
        <Link href="/admin/deletion-requests" className="rounded-card focus-visible:outline-3">
          <Kpi label={a.overview.pendingDeletion} value={o.pendingDeletionRequests} icon="trash" />
        </Link>
      </div>
    </>
  );
}
