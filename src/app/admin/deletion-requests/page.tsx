import { requirePlatformAdmin } from "@/server/auth/guards";
import { updateDeletionRequestAction } from "@/server/actions/admin";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { formDict } from "@/lib/form-state";
import { ActionForm, FormInput, FormSelect, SubmitButton } from "@/components/forms/action-form";
import { adminDate } from "@/components/admin/table";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";

export default async function AdminDeletionRequests() {
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const requests = await repo.admin.listDeletionRequests(user);
  const statuses = t.dashboard.privacy.requestStatuses;

  return (
    <>
      <PageHeader title={a.nav.deletion} description={a.deletion.lead} />
      <Alert tone="neutral" className="mb-6">
        {a.deletion.howTo}
      </Alert>
      {requests.length === 0 ? (
        <Card>
          <EmptyState icon="trash" title={a.deletion.none} />
        </Card>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => (
            <li key={r.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{r.email}</p>
                    <p className="text-sm text-muted">
                      {t.deletion.scopes[r.scope]} · {a.deletion.received} {adminDate(r.createdAt)}
                      {r.requesterUserId ? " · signed-in user" : ""}
                    </p>
                  </div>
                  <Badge tone={r.status === "completed" ? "success" : r.status === "rejected" ? "danger" : "warn"}>{statuses[r.status]}</Badge>
                </div>
                {r.details ? <p className="mt-3 rounded-xl bg-canvas p-3 text-sm whitespace-pre-wrap text-ink-2">{r.details}</p> : null}
                <ActionForm action={updateDeletionRequestAction} dict={formDict(t)} errorSummary={t.errors.formErrors} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={r.id} />
                  <FormSelect name="status" id={`status-${r.id}`} label={a.deletion.status} defaultValue={r.status}>
                    {(["pending", "in_progress", "completed", "rejected"] as const).map((s) => (
                      <option key={s} value={s}>
                        {statuses[s]}
                      </option>
                    ))}
                  </FormSelect>
                  <FormInput name="note" id={`note-${r.id}`} label={a.deletion.note} defaultValue={r.resolutionNote ?? ""} />
                  <SubmitButton pendingLabel={a.common.saving} variant="secondary">
                    {a.deletion.update}
                  </SubmitButton>
                </ActionForm>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
