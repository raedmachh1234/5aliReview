import type { Business } from "@/lib/types";
import { adminText as a } from "@/i18n/admin";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { locales } from "@/i18n/config";
import { formDict } from "@/lib/form-state";
import { saveBusinessAction } from "@/server/actions/admin";
import { ActionForm, FormInput, FormSelect, FormTextArea, SubmitButton } from "@/components/forms/action-form";

/** Admin create/edit form for a business (hours & social links are edited by the owner). */
export function AdminBusinessForm({ t, business }: { t: Dictionary; business?: Business }) {
  const s = t.dashboard.settings;
  return (
    <ActionForm
      action={saveBusinessAction}
      dict={formDict(t, { admin: { notFound: a.users.notFound } })}
      errorSummary={t.errors.formErrors}
      className="grid gap-5 sm:grid-cols-2"
    >
      {business ? <input type="hidden" name="businessId" value={business.id} /> : null}
      <FormInput name="name" label={a.businesses.name} required defaultValue={business?.name} />
      <FormInput name="slug" label={a.businesses.slug} hint={t.validation.slug} required defaultValue={business?.slug} dir="ltr" />
      <FormSelect name="status" label={a.businesses.status} defaultValue={business?.status ?? "active"}>
        <option value="active">{a.businesses.statuses.active}</option>
        <option value="suspended">{a.businesses.statuses.suspended}</option>
      </FormSelect>
      <FormSelect name="defaultLocale" label={s.defaultLocale} defaultValue={business?.defaultLocale ?? "en"}>
        {locales.map((l) => (
          <option key={l} value={l}>
            {t.common.languages[l]}
          </option>
        ))}
      </FormSelect>
      <FormInput name="googleReviewUrl" type="url" label={s.googleLink} hint={t.dashboard.google.help} optionalLabel={t.common.optional} defaultValue={business?.googleReviewUrl ?? ""} dir="ltr" className="sm:col-span-2" />
      <FormTextArea name="description" label={s.description} optionalLabel={t.common.optional} defaultValue={business?.description ?? ""} rows={2} className="sm:col-span-2" />
      <FormInput name="address" label={s.address} optionalLabel={t.common.optional} defaultValue={business?.address ?? ""} className="sm:col-span-2" />
      <FormInput name="phone" type="tel" label={s.phone} optionalLabel={t.common.optional} defaultValue={business?.phone ?? ""} dir="ltr" />
      <FormInput name="email" type="email" label={s.email} optionalLabel={t.common.optional} defaultValue={business?.email ?? ""} dir="ltr" />
      <FormInput name="website" type="url" label={s.website} optionalLabel={t.common.optional} defaultValue={business?.website ?? ""} dir="ltr" />
      <FormInput name="logoAlt" label={s.logoAlt} optionalLabel={t.common.optional} defaultValue={business?.logoAlt ?? ""} />
      <FormInput name="brandPrimary" label={s.brandPrimary} optionalLabel={t.common.optional} defaultValue={business?.brandPrimary ?? ""} placeholder="#0b5c47" dir="ltr" />
      <FormInput name="brandAccent" label={s.brandAccent} optionalLabel={t.common.optional} defaultValue={business?.brandAccent ?? ""} placeholder="#c27803" dir="ltr" />
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel={a.common.saving}>{business ? a.common.save : a.businesses.create}</SubmitButton>
      </div>
    </ActionForm>
  );
}
