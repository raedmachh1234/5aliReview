import { requirePlatformAdmin } from "@/server/auth/guards";
import { createInvoiceAction, saveSubscriptionAction, setInvoiceStatusAction } from "@/server/actions/admin";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { formatMoney, getPlan, plans } from "@/config/plans";
import { formDict } from "@/lib/form-state";
import { ActionForm, FormInput, FormSelect, SubmitButton } from "@/components/forms/action-form";
import { AdminTable, adminDate } from "@/components/admin/table";
import { Alert, Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";

export default async function AdminBilling() {
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const [subs, invoices, businesses] = await Promise.all([
    repo.admin.listSubscriptions(user),
    repo.admin.listAllInvoices(user),
    repo.admin.listBusinesses(user),
  ]);
  const dict = formDict(t, { admin: { notFound: a.users.notFound } });
  const b = a.billing;
  const statusLabels = t.dashboard.billing.statuses;

  return (
    <>
      <PageHeader title={a.nav.billing} />
      <Alert tone="neutral" className="mb-6">
        {b.lead}
      </Alert>

      <Card className="mb-6">
        <CardHeader title={b.subscriptions} />
        <ul className="divide-y divide-line">
          {businesses.map((biz) => {
            const sub = subs.find((s) => s.businessId === biz.id);
            return (
              <li key={biz.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-ink">{biz.name}</h3>
                  {sub ? <Badge tone={sub.status === "active" ? "success" : sub.status === "past_due" ? "warn" : "neutral"}>{statusLabels[sub.status]}</Badge> : null}
                  {sub?.cancelAtPeriodEnd ? <Badge tone="warn">{b.cancelAtEnd}</Badge> : null}
                  {sub ? <span className="text-sm text-muted">{getPlan(sub.planId)?.name}</span> : null}
                </div>
                <ActionForm action={saveSubscriptionAction} dict={dict} errorSummary={t.errors.formErrors} className="grid gap-3 sm:grid-cols-5 sm:items-end">
                  <input type="hidden" name="businessId" value={biz.id} />
                  <FormSelect name="planId" id={`plan-${biz.id}`} label={b.plan} defaultValue={sub?.planId ?? "starter"}>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </FormSelect>
                  <FormSelect name="interval" id={`int-${biz.id}`} label={b.interval} defaultValue={sub?.interval ?? "month"}>
                    <option value="month">{b.month}</option>
                    <option value="year">{b.year}</option>
                  </FormSelect>
                  <FormSelect name="status" id={`st-${biz.id}`} label={b.status} defaultValue={sub?.status ?? "trialing"}>
                    {(["trialing", "active", "past_due", "canceled"] as const).map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </FormSelect>
                  <FormInput name="currentPeriodEnd" id={`pe-${biz.id}`} type="date" label={b.periodEnd} defaultValue={(sub?.currentPeriodEnd ?? new Date().toISOString()).slice(0, 10)} />
                  <SubmitButton pendingLabel={a.common.saving} variant="secondary">
                    {b.save}
                  </SubmitButton>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mb-6">
        <CardHeader title={b.newInvoice} />
        <div className="p-5">
          <ActionForm action={createInvoiceAction} dict={dict} errorSummary={t.errors.formErrors} className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end" resetOnSuccess>
            <FormSelect name="businessId" id="inv-business" label={b.subscriptions} required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  {biz.name}
                </option>
              ))}
            </FormSelect>
            <FormInput name="amount" id="inv-amount" type="number" step="0.001" min="0" label={b.amount} required />
            <FormInput name="description" id="inv-desc" label={b.description} required />
            <SubmitButton pendingLabel={a.common.saving}>{b.newInvoice}</SubmitButton>
          </ActionForm>
        </div>
      </Card>

      <Card>
        <CardHeader title={b.invoices} />
        <AdminTable label={b.invoices} head={[b.number, b.subscriptions, b.amount, b.status, a.common.created, ""]} minWidth="56rem">
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <th scope="row" className="text-start font-mono font-semibold">
                {inv.number}
                <span className="block font-sans text-xs font-normal text-muted">{inv.description}</span>
              </th>
              <td>{inv.businessName}</td>
              <td className="tabular">{formatMoney(inv.amountMinor)}</td>
              <td>
                <Badge tone={inv.status === "paid" ? "success" : inv.status === "open" ? "warn" : "neutral"}>{t.dashboard.billing.invoiceStatuses[inv.status]}</Badge>
              </td>
              <td className="whitespace-nowrap text-ink-2">{adminDate(inv.issuedAt)}</td>
              <td>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["paid", b.markPaid],
                      ["void", b.void],
                      ["refunded", b.refund],
                    ] as const
                  )
                    .filter(([s]) => s !== inv.status)
                    .map(([s, label]) => (
                      <form key={s} action={setInvoiceStatusAction}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <input type="hidden" name="status" value={s} />
                        <button type="submit" className="text-xs font-semibold text-pine underline underline-offset-2">
                          {label}
                          <span className="sr-only"> {inv.number}</span>
                        </button>
                      </form>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      </Card>
    </>
  );
}
