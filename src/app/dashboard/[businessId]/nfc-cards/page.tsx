import { loadDashboard } from "@/server/dashboard";
import { can } from "@/server/auth/guards";
import { createCardAction, setCardStatusAction, updateCardAction } from "@/server/actions/dashboard";
import { cardNfcUrl } from "@/lib/card-urls";
import { formDict } from "@/lib/form-state";
import type { Location } from "@/lib/types";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { intlLocale } from "@/i18n/config";
import { ActionForm, FormInput, FormSelect, SubmitButton } from "@/components/forms/action-form";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";

function DestinationSelect({ t, locations, value, id }: { t: Dictionary; locations: Location[]; value?: string | null; id: string }) {
  const c = t.dashboard.cards;
  return (
    <FormSelect name="locationId" id={id} label={c.location} defaultValue={value ?? ""}>
      <option value="">{c.businessPage}</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </FormSelect>
  );
}

export default async function NfcCardsPage(props: PageProps<"/dashboard/[businessId]/nfc-cards">) {
  const { businessId } = await props.params;
  const { user, repo, t, locale, role } = await loadDashboard(businessId);
  const [cards, locations] = await Promise.all([repo.listCards(user, businessId), repo.listLocations(user, businessId)]);
  const c = t.dashboard.cards;
  const editable = can(role, "manager");
  const dict = formDict(t);
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" });

  return (
    <>
      <PageHeader title={c.title} description={c.lead} />

      {cards.length === 0 ? (
        <Card className="mb-6">
          <EmptyState icon="nfc" title={t.dashboard.empty.cardsTitle}>
            {t.dashboard.empty.cardsBody}
          </EmptyState>
        </Card>
      ) : (
        <ul className="mb-6 space-y-4">
          {cards.map((card) => {
            const url = cardNfcUrl(card.code);
            const location = locations.find((l) => l.id === card.locationId);
            return (
              <li key={card.id}>
                <Card>
                  <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-ink">{card.label}</h2>
                        {card.status === "active" ? (
                          <Badge tone="success" icon="checkCircle">{c.active}</Badge>
                        ) : (
                          <Badge tone="neutral" icon="x">{c.inactive}</Badge>
                        )}
                      </div>
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                        <dt className="text-muted">{c.code}</dt>
                        <dd className="font-mono font-semibold text-ink" dir="ltr">{card.code}</dd>
                        <dt className="text-muted">{c.location}</dt>
                        <dd className="text-ink-2">{location?.name ?? c.businessPage}</dd>
                        <dt className="text-muted">{c.created}</dt>
                        <dd className="text-ink-2">{dateFmt.format(new Date(card.createdAt))}</dd>
                      </dl>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="sr-only">{c.url}:</span>
                        <code className="max-w-full truncate rounded-lg bg-subtle px-2.5 py-1.5 text-sm text-ink" dir="ltr">
                          {url}
                        </code>
                        <CopyButton value={url} label={t.common.copy} copiedLabel={t.common.copied} />
                      </div>
                      {card.status === "inactive" ? <p className="text-sm text-muted">{c.inactiveNote}</p> : null}
                    </div>
                    {editable ? (
                      <form action={setCardStatusAction} className="md:self-start">
                        <input type="hidden" name="businessId" value={businessId} />
                        <input type="hidden" name="cardId" value={card.id} />
                        <input type="hidden" name="status" value={card.status === "active" ? "inactive" : "active"} />
                        <Button type="submit" size="sm" variant={card.status === "active" ? "danger" : "secondary"}>
                          {card.status === "active" ? c.deactivate : c.activate}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                  {editable ? (
                    <details className="border-t border-line">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-5 text-sm font-semibold text-ink-2 hover:text-ink">
                        <Icon name="edit" size={16} />
                        {c.changeDestination}
                      </summary>
                      <div className="px-5 pb-5">
                        <ActionForm action={updateCardAction} dict={dict} errorSummary={t.errors.formErrors} className="grid gap-4 sm:grid-cols-2">
                          <input type="hidden" name="businessId" value={businessId} />
                          <input type="hidden" name="cardId" value={card.id} />
                          <FormInput name="label" id={`label-${card.id}`} label={c.label} required defaultValue={card.label} />
                          <DestinationSelect t={t} locations={locations} value={card.locationId} id={`loc-${card.id}`} />
                          <div className="sm:col-span-2">
                            <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
                          </div>
                        </ActionForm>
                      </div>
                    </details>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {editable ? (
          <Card>
            <CardHeader title={c.create} />
            <div className="p-5">
              <ActionForm action={createCardAction} dict={dict} errorSummary={t.errors.formErrors} className="space-y-4" resetOnSuccess>
                <input type="hidden" name="businessId" value={businessId} />
                <FormInput name="label" id="label-new" label={c.label} hint={c.labelHint} required />
                <DestinationSelect t={t} locations={locations} id="loc-new" />
                <SubmitButton pendingLabel={t.common.saving}>
                  <Icon name="plus" size={18} /> {c.create}
                </SubmitButton>
              </ActionForm>
            </div>
          </Card>
        ) : null}
        <Card>
          <CardHeader title={c.howToWrite} />
          <ol className="list-decimal space-y-2 p-5 ps-10 text-sm leading-relaxed text-ink-2">
            {c.howToWriteSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
