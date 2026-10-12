import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { publishLegalAction } from "@/server/actions/admin";
import { getLegalDocument, LEGAL_SLUGS } from "@/server/legal";
import { legalDefaults } from "@/content/legal/defaults.generated";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { isLocale, locales } from "@/i18n/config";
import { isLegalSlug } from "@/server/legal";
import { formDict } from "@/lib/form-state";
import { ActionForm, FormInput, FormTextArea, SubmitButton } from "@/components/forms/action-form";
import { AdminTable, adminDate } from "@/components/admin/table";
import { Alert, Card, CardHeader, PageHeader } from "@/components/ui/surface";
import { buttonClass } from "@/components/ui/button";

/**
 * Legal document editor. Edits are published as new versions (history kept).
 * The editor starts from the raw template (with {{placeholders}}), not the
 * rendered text, so company details stay configurable.
 */
export default async function AdminLegal(props: PageProps<"/admin/legal">) {
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const sp = await props.searchParams;
  const slug = typeof sp.doc === "string" && isLegalSlug(sp.doc) ? sp.doc : "privacy";
  const locale = typeof sp.locale === "string" && isLocale(sp.locale) ? sp.locale : "en";

  const history = await repo.admin.listLegalDocuments(user);
  const latest = history.filter((d) => d.slug === slug && d.locale === locale).sort((x, y) => y.version - x.version)[0];
  const template = latest ?? legalDefaults[locale]?.[slug] ?? legalDefaults.en?.[slug];
  const resolved = await getLegalDocument(slug, locale);

  return (
    <>
      <PageHeader title={a.nav.legal} description={a.legal.lead} />
      <Alert tone="warn" className="mb-6">
        {a.legal.warning}
      </Alert>

      <nav aria-label={a.legal.document} className="mb-4 flex flex-wrap gap-2">
        {LEGAL_SLUGS.map((s) => (
          <Link key={s} href={`/admin/legal?doc=${s}&locale=${locale}`} aria-current={s === slug ? "page" : undefined} className={buttonClass(s === slug ? "primary" : "secondary", "sm")}>
            {t.legal.docs[s]}
          </Link>
        ))}
      </nav>
      <nav aria-label={a.legal.locale} className="mb-6 flex flex-wrap gap-2">
        {locales.map((l) => (
          <Link key={l} href={`/admin/legal?doc=${slug}&locale=${l}`} aria-current={l === locale ? "page" : undefined} className={buttonClass(l === locale ? "primary" : "ghost", "sm")}>
            {t.common.languages[l]}
          </Link>
        ))}
      </nav>

      <Card className="mb-6">
        <CardHeader
          title={`${t.legal.docs[slug]} — ${t.common.languages[locale]}`}
          description={latest ? `${a.legal.current}: v${latest.version}` : a.legal.defaultText}
          action={
            <Link href={`/legal/${slug}`} target="_blank" className="text-sm font-semibold text-pine underline underline-offset-4">
              {a.legal.view}
            </Link>
          }
        />
        <div className="p-5">
          <ActionForm action={publishLegalAction} dict={formDict(t)} errorSummary={t.errors.formErrors} className="space-y-4" key={`${slug}-${locale}-${latest?.version ?? 0}`}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="locale" value={locale} />
            <FormInput name="title" label={a.legal.titleField} required defaultValue={template?.title ?? t.legal.docs[slug]} />
            <FormTextArea name="bodyMd" label={a.legal.body} hint={a.legal.bodyHint} required rows={24} defaultValue={template?.bodyMd ?? ""} className="font-mono" dir={locale === "ar" ? "rtl" : "ltr"} />
            <SubmitButton pendingLabel={a.common.saving}>{a.legal.publish}</SubmitButton>
          </ActionForm>
          {resolved?.isFallback ? <p className="mt-3 text-sm text-muted">{t.legal.englishOnly}</p> : null}
        </div>
      </Card>

      <Card>
        <CardHeader title={a.legal.published} />
        <AdminTable label={a.legal.published} head={[a.legal.document, a.legal.locale, "Version", a.common.created]}>
          {history.map((d) => (
            <tr key={`${d.slug}-${d.locale}-${d.version}`}>
              <th scope="row" className="text-start font-semibold">{t.legal.docs[d.slug]}</th>
              <td>{d.locale}</td>
              <td className="tabular">v{d.version}</td>
              <td className="text-ink-2">{adminDate(d.publishedAt)}</td>
            </tr>
          ))}
        </AdminTable>
      </Card>
    </>
  );
}
