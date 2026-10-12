import Link from "next/link";
import { loadDashboard } from "@/server/dashboard";
import { can } from "@/server/auth/guards";
import { setCancelAtPeriodEndAction } from "@/server/actions/dashboard";
import { formatMoney, getPlan, PRICING_IS_PLACEHOLDER } from "@/config/plans";
import { fmt, intlLocale } from "@/i18n/config";
import type { InvoiceStatus, SubscriptionStatus } from "@/lib/types";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { Alert, Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";

const statusTone: Record<SubscriptionStatus, "success" | "brand" | "warn" | "neutral"> = { active: "success", trialing: "brand", past_due: "warn", canceled: "neutral" };
const invoiceTone: Record<InvoiceStatus, "success" | "warn" | "neutral"> = { paid: "success", open: "warn", void: "neutral", refunded: "neutral" };

/** Billing: price, period and renewal date are always visible; cancelling is one click + one confirmation. */
export default async function BillingPage(props: PageProps<"/dashboard/[businessId]/billing">) {
  const { businessId } = await props.params;
  const { user, repo, t, locale, role } = await loadDashboard(businessId);
  const b = t.dashboard.billing;
  const isOwner = can(role, "owner");
  const subscription = await repo.getSubscription(user, businessId);
  const invoices = isOwner ? await repo.listInvoices(user, businessId) : [];
  const plan = subscription ? getPlan(subscription.planId) : undefined;
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long" });

  return (
    <>
      <PageHeader title={b.title} description={b.lead} />
      {!isOwner ? <Alert tone="neutral" className="mb-6">{b.ownerOnly}</Alert> : null}

      <Card className="mb-6">
        <CardHeader title={b.plan} />
        {subscription && plan ? (
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto]">
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted">{b.plan}</dt>
              <dd className="font-bold text-ink">{plan.name}</dd>
              <dt className="text-muted">{b.price}</dt>
              <dd className="text-ink">
                <span className="tabular font-semibold">
                  {formatMoney(subscription.interval === "year" ? plan.yearlyMinor : plan.monthlyMinor, locale)}
                </span>{" "}
                {subscription.interval === "year" ? t.pricing.perYear : t.pricing.perMonth}
                {PRICING_IS_PLACEHOLDER ? <Badge tone="warn" className="ms-2">{t.pricing.placeholderBadge}</Badge> : null}
                <p className="mt-1 text-muted">{t.pricing.terms.taxNote}</p>
              </dd>
              <dt className="text-muted">{b.status}</dt>
              <dd>
                <Badge tone={statusTone[subscription.status]}>{b.statuses[subscription.status]}</Badge>
                <p className="mt-1.5 text-ink-2">
                  {subscription.status === "trialing"
                    ? fmt(b.trialEnds, { date: dateFmt.format(new Date(subscription.currentPeriodEnd)) })
                    : subscription.cancelAtPeriodEnd
                      ? fmt(b.ends, { date: dateFmt.format(new Date(subscription.currentPeriodEnd)) })
                      : fmt(b.renews, { date: dateFmt.format(new Date(subscription.currentPeriodEnd)) })}
                </p>
              </dd>
            </dl>
            {isOwner && subscription.status !== "canceled" && subscription.status !== "trialing" ? (
              <div className="md:self-start">
                {subscription.cancelAtPeriodEnd ? (
                  <form action={setCancelAtPeriodEndAction}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="cancel" value="false" />
                    <Button type="submit" variant="secondary">{b.resume}</Button>
                  </form>
                ) : (
                  <ConfirmAction
                    trigger={b.cancel}
                    title={b.cancel}
                    body={fmt(b.cancelConfirm, { date: dateFmt.format(new Date(subscription.currentPeriodEnd)) })}
                    confirmLabel={b.cancelConfirmButton}
                    cancelLabel={t.common.back}
                    action={setCancelAtPeriodEndAction}
                    hidden={{ businessId, cancel: "true" }}
                    triggerVariant="secondary"
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="p-5 text-ink-2">{b.noSubscription}</p>
        )}
        <div className="space-y-1 border-t border-line px-5 py-4 text-sm text-ink-2">
          <p>{b.paymentNote}</p>
          <p>{t.pricing.terms.renewal}</p>
          <p>{t.pricing.terms.cancellation}</p>
          <p>
            <Link href="/pricing" className="font-semibold text-pine underline underline-offset-4">{b.seePricing}</Link>
            {" · "}
            <Link href="/legal/refunds" className="font-semibold text-pine underline underline-offset-4">{t.pricing.refundsLink}</Link>
          </p>
        </div>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader title={b.invoices} />
          {invoices.length ? (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={b.invoices}>
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold tracking-wide text-ink-2 uppercase">
                    <th scope="col" className="px-5 py-3 text-start">{b.invoiceNumber}</th>
                    <th scope="col" className="px-5 py-3 text-start">{b.issued}</th>
                    <th scope="col" className="px-5 py-3 text-end">{b.amount}</th>
                    <th scope="col" className="px-5 py-3 text-start">{b.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-line last:border-0">
                      <th scope="row" className="px-5 py-3 text-start font-mono font-semibold text-ink">
                        {inv.number}
                        <span className="block font-sans text-xs font-normal text-muted">{inv.description}</span>
                      </th>
                      <td className="px-5 py-3 text-ink-2">{dateFmt.format(new Date(inv.issuedAt))}</td>
                      <td className="tabular px-5 py-3 text-end font-semibold">{formatMoney(inv.amountMinor, locale)}</td>
                      <td className="px-5 py-3"><Badge tone={invoiceTone[inv.status]}>{b.invoiceStatuses[inv.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-ink-2">{b.noInvoices}</p>
          )}
        </Card>
      ) : null}
    </>
  );
}
