import Link from "next/link";
import { loadDashboard } from "@/server/dashboard";
import { can } from "@/server/auth/guards";
import { updateGoogleUrlAction } from "@/server/actions/dashboard";
import { resolveRange } from "@/lib/dates";
import { formDict } from "@/lib/form-state";
import { intlLocale } from "@/i18n/config";
import { ActionForm, FormInput, SubmitButton } from "@/components/forms/action-form";
import { Alert, Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";

export default async function GoogleReviewsPage(props: PageProps<"/dashboard/[businessId]/google-reviews">) {
  const { businessId } = await props.params;
  const { business, user, repo, t, locale, role } = await loadDashboard(businessId);
  const [locations, stats] = await Promise.all([
    repo.listLocations(user, businessId),
    repo.getStats(user, businessId, resolveRange("30d").range),
  ]);
  const g = t.dashboard.google;
  const editable = can(role, "manager");

  return (
    <>
      <PageHeader title={g.title} description={g.lead} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title={g.url} />
          <div className="space-y-4 p-5">
            {!business.googleReviewUrl ? <Alert tone="warn">{g.missing}</Alert> : null}
            {editable ? (
              <ActionForm action={updateGoogleUrlAction} dict={formDict(t)} errorSummary={t.errors.formErrors} className="space-y-4">
                <input type="hidden" name="businessId" value={businessId} />
                <FormInput name="googleReviewUrl" type="url" label={g.url} hint={g.help} defaultValue={business.googleReviewUrl ?? ""} dir="ltr" placeholder="https://g.page/r/…/review" />
                <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
              </ActionForm>
            ) : (
              <p className="text-sm break-all text-ink-2" dir="ltr">{business.googleReviewUrl ?? t.common.notSet}</p>
            )}
            {business.googleReviewUrl ? (
              <a href={business.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pine underline underline-offset-4">
                {g.test}
                <Icon name="external" size={16} />
                <span className="sr-only">({t.thanks.opensNewTab})</span>
              </a>
            ) : null}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink-2">{g.clicks}</h2>
            <p className="tabular mt-2 text-4xl font-extrabold text-ink">{stats.googleClicks.toLocaleString(intlLocale(locale))}</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Icon name="shield" size={18} className="text-pine" />
              {g.policyTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{g.policy}</p>
          </Card>
        </div>
      </div>

      {locations.length ? (
        <Card className="mt-6">
          <CardHeader title={g.perLocation} description={g.perLocationBody} />
          <ul className="divide-y divide-line">
            {locations.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{l.name}</p>
                  <p className="truncate text-sm text-muted" dir="ltr">{l.googleReviewUrl ?? business.googleReviewUrl ?? t.common.notSet}</p>
                </div>
                {l.googleReviewUrl ? <Badge tone="brand">{g.perLocation}</Badge> : <Badge>{g.url}</Badge>}
              </li>
            ))}
          </ul>
          {editable ? (
            <p className="border-t border-line px-5 py-3 text-sm">
              <Link href={`/dashboard/${businessId}/locations`} className="font-semibold text-pine underline underline-offset-4">
                {t.dashboard.nav.locations}
              </Link>
            </p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
