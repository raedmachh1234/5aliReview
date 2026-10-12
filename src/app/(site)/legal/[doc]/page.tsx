import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { getLegalDocument, isLegalSlug, LEGAL_SLUGS } from "@/server/legal";
import { Markdown } from "@/components/site/markdown";
import { Alert } from "@/components/ui/surface";
import { CookieSettingsForm } from "@/components/consent/cookie-settings-form";

export async function generateMetadata(props: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await props.params;
  const { t } = await getI18n();
  if (!isLegalSlug(doc)) return {};
  return { title: t.legal.docs[doc], alternates: { canonical: `/legal/${doc}` } };
}

export default async function LegalPage(props: PageProps<"/legal/[doc]">) {
  const { doc } = await props.params;
  if (!isLegalSlug(doc)) notFound();
  const { t, locale } = await getI18n();
  const document = await getLegalDocument(doc, locale);
  if (!document) notFound();

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t.legal.onThisPage} className="lg:sticky lg:top-24 lg:h-fit">
        <p className="mb-2 text-sm font-bold text-ink">{t.legal.onThisPage}</p>
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {LEGAL_SLUGS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/legal/${slug}`}
                aria-current={slug === doc ? "page" : undefined}
                className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-subtle aria-[current=page]:bg-pine-soft aria-[current=page]:font-bold aria-[current=page]:text-pine"
              >
                {t.legal.docs[slug]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article lang={document.locale} dir={document.locale === "ar" ? "rtl" : "ltr"} className="min-w-0">
        {document.isFallback ? (
          <Alert tone="neutral" className="mb-8">
            <span lang={locale}>{t.legal.englishOnly}</span>
          </Alert>
        ) : null}
        <div className="prose-legal">
          <Markdown>{document.bodyMd}</Markdown>
        </div>
        {document.version ? <p className="mt-10 text-sm text-muted">{fmt(t.legal.version, { version: document.version })}</p> : null}
        {doc === "cookies" ? (
          <section
            id="manage"
            aria-labelledby="manage-title"
            className="mt-12 max-w-[72ch] scroll-mt-24 rounded-card border border-line bg-surface p-6"
          >
            <h2 id="manage-title" className="text-xl font-bold text-ink">
              {t.cookies.dialogTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">{t.cookies.dialogIntro}</p>
            <CookieSettingsForm />
          </section>
        ) : null}
      </article>
    </div>
  );
}
