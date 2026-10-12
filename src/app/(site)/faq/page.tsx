import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { JsonLd } from "@/components/site/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.faqTitle, description: t.meta.faqDescription, alternates: { canonical: "/faq" } };
}

export default async function FaqPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.faq.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
        }}
      />
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">{t.faq.title}</h1>
      <div className="mt-10 space-y-3">
        {t.faq.items.map((item) => (
          <details key={item.q} className="group rounded-2xl border border-line bg-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <h2 className="text-base">{item.q}</h2>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <p className="px-5 pb-5 leading-relaxed text-ink-2">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
