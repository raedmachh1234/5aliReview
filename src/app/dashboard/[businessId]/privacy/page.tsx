import { loadDashboard } from "@/server/dashboard";
import { can } from "@/server/auth/guards";
import { requestDeletionAction, setRetentionAction } from "@/server/actions/dashboard";
import { fmt, intlLocale } from "@/i18n/config";
import { formDict } from "@/lib/form-state";
import { ActionForm, FormSelect, FormTextArea, SubmitButton } from "@/components/forms/action-form";
import { Alert, Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const RETENTION_OPTIONS = [3, 6, 12, 24, 36, 60];

export default async function PrivacyPage(props: PageProps<"/dashboard/[businessId]/privacy">) {
  const { businessId } = await props.params;
  const { business, user, repo, t, locale, role } = await loadDashboard(businessId);
  const p = t.dashboard.privacy;
  const isOwner = can(role, "owner");
  const canExport = can(role, "manager");
  const requests = await repo.listMyDeletionRequests(user);
  const dict = formDict(t, { dashboard: { privacy: { deletionSent: p.deletionSent } } });
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" });

  return (
    <>
      <PageHeader title={p.title} description={p.lead} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={p.whatWeStore} />
          <div className="space-y-3 p-5 text-sm text-ink-2">
            <ul className="space-y-1.5">
              {p.whatWeStoreList.map((item) => (
                <li key={item} className="flex gap-2">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="flex gap-2 font-medium text-ink">
              <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-pine" />
              {p.whatWeDontStore}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title={p.export} description={p.exportBody} />
          <div className="flex flex-wrap gap-3 p-5">
            {canExport ? (
              <>
                <a href={`/api/export/${businessId}?format=csv`} className={buttonClass("secondary")} download>
                  <Icon name="download" size={18} /> {p.exportCsv}
                </a>
                <a href={`/api/export/${businessId}?format=json`} className={buttonClass("secondary")} download>
                  <Icon name="download" size={18} /> {p.exportJson}
                </a>
              </>
            ) : (
              <p className="text-sm text-muted">{t.errors.forbidden}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={p.retention} description={p.retentionBody} />
          <div className="p-5">
            {isOwner ? (
              <ActionForm action={setRetentionAction} dict={dict} errorSummary={t.errors.formErrors} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="businessId" value={businessId} />
                <FormSelect name="months" label={p.retention} defaultValue={String(business.feedbackRetentionMonths)} className="min-w-48">
                  {RETENTION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {fmt(p.months, { n: m })}
                    </option>
                  ))}
                </FormSelect>
                <SubmitButton pendingLabel={t.common.saving} variant="secondary">
                  {p.retentionSave}
                </SubmitButton>
              </ActionForm>
            ) : (
              <p className="text-sm text-ink-2">
                {fmt(p.months, { n: business.feedbackRetentionMonths })} — {p.ownerOnly}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={p.deletion} description={p.deletionBody} />
          <div className="p-5">
            <ActionForm action={requestDeletionAction} dict={dict} errorSummary={t.errors.formErrors} className="space-y-4">
              <input type="hidden" name="businessId" value={businessId} />
              <FormSelect name="scope" label={p.deletionScope} required defaultValue="">
                <option value="" disabled>
                  —
                </option>
                <option value="account">{t.deletion.scopes.account}</option>
                {isOwner ? <option value="business">{t.deletion.scopes.business}</option> : null}
              </FormSelect>
              <FormTextArea name="details" label={t.deletion.details} optionalLabel={t.common.optional} rows={3} maxLength={2000} />
              <SubmitButton pendingLabel={t.deletion.sending} variant="danger">
                {p.deletionSubmit}
              </SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>

      {requests.length ? (
        <Card className="mt-6">
          <CardHeader title={p.requests} />
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-ink">
                  {t.deletion.scopes[r.scope]} · <span className="text-muted">{dateFmt.format(new Date(r.createdAt))}</span>
                </span>
                <Badge tone={r.status === "completed" ? "success" : r.status === "rejected" ? "danger" : "warn"}>{p.requestStatuses[r.status]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {!isOwner ? <Alert tone="neutral" className="mt-6">{p.ownerOnly}</Alert> : null}
    </>
  );
}
