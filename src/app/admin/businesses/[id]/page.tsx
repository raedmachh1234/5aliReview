import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { deleteBusinessAction, setBusinessStatusAction } from "@/server/actions/admin";
import { NotFoundError } from "@/server/data";
import { uuidSchema } from "@/lib/validation";
import { absoluteUrl } from "@/config/site";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { AdminBusinessForm } from "@/components/admin/business-form";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export default async function AdminBusinessDetail(props: PageProps<"/admin/businesses/[id]">) {
  const { id } = await props.params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const business = await repo.admin.getBusiness(user, id).catch((err) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });
  const url = absoluteUrl(`/r/${business.slug}`);
  const dash = `/dashboard/${business.id}`;

  return (
    <>
      <PageHeader
        title={business.name}
        description={<Badge tone={business.status === "active" ? "success" : "danger"}>{a.businesses.statuses[business.status]}</Badge>}
        actions={
          <Link href={dash} className={buttonClass("primary", "sm")}>
            {a.businesses.open}
          </Link>
        }
      />

      <Card className="mb-6 p-5">
        <h2 className="text-sm font-semibold text-ink-2">{a.businesses.url}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg bg-subtle px-2.5 py-1.5 text-sm" dir="ltr">{url}</code>
          <CopyButton value={url} label={t.common.copy} copiedLabel={t.common.copied} />
        </div>
        <p className="mt-4 text-sm">
          {a.businesses.manage}:{" "}
          <Link href={`${dash}/locations`} className="font-semibold text-pine underline underline-offset-4">{t.dashboard.nav.locations}</Link>
          {" · "}
          <Link href={`${dash}/nfc-cards`} className="font-semibold text-pine underline underline-offset-4">{t.dashboard.nav.cards}</Link>
          {" · "}
          <Link href={`${dash}/qr-codes`} className="font-semibold text-pine underline underline-offset-4">{t.dashboard.nav.qr}</Link>
        </p>
      </Card>

      <Card className="mb-6">
        <CardHeader title={a.businesses.edit} />
        <div className="p-5">
          <AdminBusinessForm t={t} business={business} />
        </div>
      </Card>

      <Card className="border-danger/30">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="max-w-xl text-sm text-ink-2">{a.businesses.suspendBody}</p>
          <div className="flex gap-2">
            <form action={setBusinessStatusAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <input type="hidden" name="status" value={business.status === "active" ? "suspended" : "active"} />
              <button type="submit" className={buttonClass("secondary", "sm")}>
                {business.status === "active" ? a.businesses.suspend : a.businesses.reactivate}
              </button>
            </form>
            <ConfirmAction
              trigger={a.common.delete}
              title={a.businesses.deleteTitle}
              body={a.businesses.deleteBody}
              confirmLabel={a.common.delete}
              cancelLabel={a.common.cancel}
              action={deleteBusinessAction}
              hidden={{ businessId: business.id }}
            />
          </div>
        </div>
      </Card>
    </>
  );
}
