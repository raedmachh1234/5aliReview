import { loadDashboard } from "@/server/dashboard";
import { can } from "@/server/auth/guards";
import { deleteLocationAction, saveLocationAction } from "@/server/actions/dashboard";
import { fmt } from "@/i18n/config";
import { formDict } from "@/lib/form-state";
import type { Location } from "@/lib/types";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ActionForm, FormInput, SubmitButton } from "@/components/forms/action-form";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";

function LocationFields({ t, businessSlug, location }: { t: Dictionary; businessSlug: string; location?: Location }) {
  const l = t.dashboard.locations;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput name="name" label={l.name} required defaultValue={location?.name} id={`name-${location?.id ?? "new"}`} />
      <FormInput
        name="slug"
        label={l.slug}
        hint={fmt(l.slugHint, { business: businessSlug })}
        required
        defaultValue={location?.slug}
        id={`slug-${location?.id ?? "new"}`}
        pattern="[a-z0-9-]+"
        dir="ltr"
      />
      <FormInput name="address" label={l.address} optionalLabel={t.common.optional} defaultValue={location?.address ?? ""} id={`address-${location?.id ?? "new"}`} />
      <FormInput name="phone" label={l.phone} optionalLabel={t.common.optional} defaultValue={location?.phone ?? ""} type="tel" id={`phone-${location?.id ?? "new"}`} dir="ltr" />
      <FormInput
        name="googleReviewUrl"
        label={l.google}
        hint={l.googleHint}
        optionalLabel={t.common.optional}
        defaultValue={location?.googleReviewUrl ?? ""}
        type="url"
        id={`google-${location?.id ?? "new"}`}
        className="sm:col-span-2"
        dir="ltr"
      />
    </div>
  );
}

export default async function LocationsPage(props: PageProps<"/dashboard/[businessId]/locations">) {
  const { businessId } = await props.params;
  const { business, user, repo, t, role } = await loadDashboard(businessId);
  const [locations, cards] = await Promise.all([repo.listLocations(user, businessId), repo.listCards(user, businessId)]);
  const l = t.dashboard.locations;
  const editable = can(role, "manager");
  const dict = formDict(t);

  return (
    <>
      <PageHeader title={l.title} description={l.lead} />

      {locations.length === 0 ? (
        <Card className="mb-6">
          <EmptyState icon="pin" title={t.dashboard.empty.locationsTitle}>
            {t.dashboard.empty.locationsBody}
          </EmptyState>
        </Card>
      ) : (
        <ul className="mb-6 space-y-4">
          {locations.map((loc) => (
            <li key={loc.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <h2 className="text-lg font-bold text-ink">{loc.name}</h2>
                    <p className="mt-0.5 text-sm text-muted" dir="ltr">
                      /r/{business.slug}?loc={loc.slug}
                    </p>
                    {loc.address ? <p className="mt-1 text-sm text-ink-2">{loc.address}</p> : null}
                    <p className="mt-1 text-sm text-ink-2">{fmt(l.cards, { count: cards.filter((c) => c.locationId === loc.id).length })}</p>
                  </div>
                  {editable ? (
                    <ConfirmAction
                      trigger={
                        <>
                          <Icon name="trash" size={16} /> {t.common.delete}
                        </>
                      }
                      title={`${t.common.delete}: ${loc.name}`}
                      body={fmt(l.deleteConfirm, { name: loc.name })}
                      confirmLabel={t.common.delete}
                      cancelLabel={t.common.cancel}
                      action={deleteLocationAction}
                      hidden={{ businessId, locationId: loc.id }}
                    />
                  ) : null}
                </div>
                {editable ? (
                  <details className="border-t border-line">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-5 text-sm font-semibold text-ink-2 hover:text-ink">
                      <Icon name="edit" size={16} />
                      {t.common.edit}
                    </summary>
                    <div className="px-5 pb-5">
                      <ActionForm action={saveLocationAction} dict={dict} errorSummary={t.errors.formErrors} className="space-y-4">
                        <input type="hidden" name="businessId" value={businessId} />
                        <input type="hidden" name="locationId" value={loc.id} />
                        <LocationFields t={t} businessSlug={business.slug} location={loc} />
                        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editable ? (
        <Card>
          <CardHeader title={l.add} />
          <div className="p-5">
            <ActionForm action={saveLocationAction} dict={dict} errorSummary={t.errors.formErrors} className="space-y-4" resetOnSuccess>
              <input type="hidden" name="businessId" value={businessId} />
              <LocationFields t={t} businessSlug={business.slug} />
              <SubmitButton pendingLabel={t.common.saving}>
                <Icon name="plus" size={18} /> {l.add}
              </SubmitButton>
            </ActionForm>
          </div>
        </Card>
      ) : null}
    </>
  );
}
