import { loadDashboard } from "@/server/dashboard";
import { can } from "@/server/auth/guards";
import { updateBusinessProfileAction, uploadLogoAction } from "@/server/actions/dashboard";
import { absoluteUrl } from "@/config/site";
import { formDict } from "@/lib/form-state";
import { locales } from "@/i18n/config";
import { ActionForm, FormInput, FormSelect, FormTextArea, SubmitButton } from "@/components/forms/action-form";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { CopyButton } from "@/components/ui/copy-button";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SOCIALS = ["instagram", "facebook", "tiktok", "linkedin", "x"] as const;
const SOCIAL_LABELS: Record<(typeof SOCIALS)[number], string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", x: "X" };

export default async function SettingsPage(props: PageProps<"/dashboard/[businessId]/settings">) {
  const { businessId } = await props.params;
  const { business, t, role } = await loadDashboard(businessId);
  const s = t.dashboard.settings;
  const editable = can(role, "manager");
  const dict = formDict(t);
  const publicUrl = absoluteUrl(`/r/${business.slug}`);

  if (!editable) {
    return (
      <>
        <PageHeader title={s.title} description={s.lead} />
        <Alert tone="neutral">{t.errors.forbidden}</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader title={s.title} description={s.lead} />

      <Card className="mb-6 p-5">
        <h2 className="text-sm font-semibold text-ink-2">{s.publicUrl}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg bg-subtle px-2.5 py-1.5 text-sm text-ink" dir="ltr">
            {publicUrl}
          </code>
          <CopyButton value={publicUrl} label={t.common.copy} copiedLabel={t.common.copied} />
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title={s.logo} description={s.logoHint} />
        <div className="flex flex-wrap items-center gap-5 p-5">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user upload served from storage
            <img src={business.logoUrl} alt={`${s.currentLogo}: ${business.logoAlt || business.name}`} width={72} height={72} className="size-[72px] rounded-2xl border border-line object-contain p-1.5" />
          ) : null}
          <ActionForm action={uploadLogoAction} dict={dict} errorSummary={t.errors.formErrors} className="flex flex-1 flex-wrap items-end gap-3">
            <input type="hidden" name="businessId" value={businessId} />
            <FormInput name="logo" type="file" accept="image/png,image/jpeg,image/webp" label={s.uploadLogo} required className="min-w-60 flex-1" />
            <SubmitButton pendingLabel={t.common.saving} variant="secondary">
              {s.uploadLogo}
            </SubmitButton>
          </ActionForm>
        </div>
      </Card>

      <ActionForm action={updateBusinessProfileAction} dict={dict} errorSummary={t.errors.formErrors} className="space-y-6">
        <input type="hidden" name="businessId" value={businessId} />
        <Card>
          <CardHeader title={s.profile} />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <FormInput name="name" label={s.name} required defaultValue={business.name} autoComplete="organization" />
            <FormSelect name="defaultLocale" label={s.defaultLocale} hint={s.defaultLocaleHint} defaultValue={business.defaultLocale}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {t.common.languages[l]}
                </option>
              ))}
            </FormSelect>
            <FormTextArea name="description" label={s.description} optionalLabel={t.common.optional} defaultValue={business.description ?? ""} rows={3} className="sm:col-span-2" maxLength={500} />
            <FormInput name="address" label={s.address} optionalLabel={t.common.optional} defaultValue={business.address ?? ""} className="sm:col-span-2" autoComplete="street-address" />
            <FormInput name="phone" type="tel" label={s.phone} optionalLabel={t.common.optional} defaultValue={business.phone ?? ""} dir="ltr" />
            <FormInput name="email" type="email" label={s.email} optionalLabel={t.common.optional} defaultValue={business.email ?? ""} dir="ltr" />
            <FormInput name="website" type="url" label={s.website} optionalLabel={t.common.optional} defaultValue={business.website ?? ""} placeholder="https://" dir="ltr" className="sm:col-span-2" />
            <FormInput name="googleReviewUrl" type="url" label={s.googleLink} hint={t.dashboard.google.help} optionalLabel={t.common.optional} defaultValue={business.googleReviewUrl ?? ""} dir="ltr" className="sm:col-span-2" />
          </div>
        </Card>

        <Card>
          <CardHeader title={s.branding} />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <FormInput name="logoAlt" label={s.logoAlt} hint={s.logoAltHint} optionalLabel={t.common.optional} defaultValue={business.logoAlt ?? ""} className="sm:col-span-2" />
            <FormInput name="brandPrimary" label={s.brandPrimary} hint={s.brandPrimaryHint} optionalLabel={t.common.optional} defaultValue={business.brandPrimary ?? ""} placeholder="#0b5c47" dir="ltr" />
            <FormInput name="brandAccent" label={s.brandAccent} optionalLabel={t.common.optional} defaultValue={business.brandAccent ?? ""} placeholder="#c27803" dir="ltr" />
          </div>
        </Card>

        <Card>
          <CardHeader title={s.hours} description={s.hoursHint} />
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {DAYS.map((d) => (
              <FormInput key={d} name={`hours_${d}`} label={t.customer.days[d]} defaultValue={business.openingHours[d] ?? ""} placeholder="08:00–22:00" dir="ltr" />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={s.social} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {SOCIALS.map((n) => (
              <FormInput key={n} name={`social_${n}`} type="url" label={SOCIAL_LABELS[n]} optionalLabel={t.common.optional} defaultValue={business.socialLinks[n] ?? ""} placeholder="https://" dir="ltr" />
            ))}
          </div>
        </Card>

        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </ActionForm>
    </>
  );
}
