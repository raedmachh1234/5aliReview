import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { siteConfig } from "@/config/site";
import { company } from "@/config/company";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { JsonLd } from "@/components/site/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { absolute: t.meta.homeTitle }, description: t.meta.homeDescription, alternates: { canonical: "/" } };
}

/** Decorative phone mock-up of the real customer screen (the text equivalent is in the hero copy). */
function PhoneMock({ alt, t }: { alt: string; t: Dictionary }) {
  return (
    <figure role="img" aria-label={alt} className="relative mx-auto w-full max-w-[19rem]">
      <div aria-hidden="true" className="absolute -end-4 -bottom-8 z-10 hidden w-44 rotate-[8deg] rounded-2xl bg-ink p-4 text-white shadow-2xl sm:block lg:-end-10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold tracking-tight">5ali Review</span>
          <Icon name="nfc" size={22} className="text-[#7dd3b0]" />
        </div>
        <div className="mt-5 flex gap-0.5 text-[#f5b72f]">
          {[0, 1, 2, 3, 4].map((i) => (
            <Icon key={i} name="star" size={16} />
          ))}
        </div>
        <div className="mt-3 grid size-12 place-items-center rounded-md bg-white">
          <Icon name="qr" size={34} className="text-ink" />
        </div>
      </div>
      <div aria-hidden="true" className="relative rounded-[2.6rem] border-[10px] border-ink bg-ink shadow-[0_40px_80px_-30px_rgb(16_24_40/0.55)]">
        <div className="overflow-hidden rounded-[2rem] bg-canvas">
          <div className="h-1.5 bg-pine" />
          <div className="flex flex-col items-center px-5 pt-6 pb-7 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-pine text-sm font-extrabold text-white">CB</span>
            <p className="mt-2 text-sm font-bold text-ink">Café El Bahia</p>
            <div className="mt-4 w-full rounded-2xl border border-line bg-surface px-3 py-5 shadow-sm">
              <p className="text-base leading-tight font-extrabold text-ink">{t.customer.title}</p>
              <p className="mt-1 text-xs text-ink-2">{t.customer.subtitle}</p>
              <div className="mt-4 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex flex-col items-center">
                    <Icon name="star" size={30} className={n <= 4 ? "text-star" : "text-control/40"} />
                    <span className="text-[10px] font-semibold text-muted">{n}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-ink">{fmt(t.customer.selected, { n: 4, word: t.customer.ratingWords[4] })}</p>
              <div className="mt-4 rounded-xl bg-pine py-2.5 text-sm font-semibold text-white">{t.customer.submit}</div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

/** Visual proof of "no review gating": both ratings lead to the identical Google option. */
function SameButtonDiagram({ label }: { label: string }) {
  const row = (rating: number) => (
    <div className="flex items-center gap-3">
      <div className="flex w-32 shrink-0 items-center justify-center gap-0.5 rounded-xl border border-line bg-surface py-2.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon key={n} name="star" size={16} className={n <= rating ? "text-star" : "text-control/35"} />
        ))}
      </div>
      <Icon name="arrowRight" className="shrink-0 text-muted rtl:rotate-180" />
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-pine px-3 py-2.5 text-sm font-semibold text-white">
        <Icon name="star" size={16} className="shrink-0 text-[#f5b72f]" />
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
  return (
    <div aria-hidden="true" className="space-y-3 rounded-card border border-line bg-canvas p-5">
      {row(1)}
      {row(3)}
      {row(5)}
    </div>
  );
}

export default async function HomePage() {
  const { t } = await getI18n();
  const h = t.home;
  const stepIcons: IconName[] = ["nfc", "star", "external"];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: siteConfig.name, url: siteConfig.url, email: company.contactEmail },
            {
              "@type": "SoftwareApplication",
              name: siteConfig.name,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: t.meta.homeDescription,
              url: siteConfig.url,
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_80%_10%,#e3f1eb_0%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine-soft px-3 py-1 text-sm font-semibold text-pine">
              <Icon name="nfc" size={16} />
              {h.eyebrow}
            </p>
            <h1 className="mt-5 text-[2.35rem] leading-[1.08] font-extrabold tracking-tight text-balance text-ink sm:text-5xl lg:text-[3.4rem]">{h.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{h.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact" size="lg">
                {h.ctaPrimary}
                <Icon name="arrowRight" size={18} className="rtl:rotate-180" />
              </ButtonLink>
              <ButtonLink href="/r/cafe-el-bahia?src=link" variant="secondary" size="lg" prefetch={false}>
                {h.tryDemo}
              </ButtonLink>
            </div>
            <ul className="mt-8 grid gap-2.5 text-[0.95rem] text-ink-2 sm:grid-cols-1">
              {h.trustPoints.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Icon name="checkCircle" size={20} className="shrink-0 text-success" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <PhoneMock alt={h.phoneAlt} t={t} />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="how-title" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{h.howTitle}</h2>
          <p className="mt-3 max-w-2xl text-lg text-ink-2">{h.howLead}</p>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {h.steps.map((step, i) => (
              <li key={step.title} className="relative rounded-card border border-line bg-canvas p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-pine text-white">
                    <Icon name={stepIcons[i]} size={22} />
                  </span>
                  <span className="text-sm font-bold text-muted tabular">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* No review gating */}
      <section aria-labelledby="honest-title">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 id="honest-title" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{h.honestTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-2">{h.honestBody}</p>
            <ul className="mt-6 space-y-3">
              {h.honestPoints.map((p) => (
                <li key={p} className="flex gap-3 text-ink-2">
                  <Icon name="check" size={22} className="mt-0.5 shrink-0 text-success" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <SameButtonDiagram label={t.thanks.googleButton} />
        </div>
      </section>

      {/* Dashboard + privacy */}
      <section aria-label={h.dashboardTitle} className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-card bg-ink p-8 text-white">
            <Icon name="chart" size={28} className="text-[#7dd3b0]" />
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{h.dashboardTitle}</h2>
            <p className="mt-3 leading-relaxed text-white/85">{h.dashboardBody}</p>
            <ul className="mt-6 space-y-2.5">
              {h.dashboardPoints.map((p) => (
                <li key={p} className="flex gap-2.5 text-white/90">
                  <Icon name="check" size={20} className="mt-0.5 shrink-0 text-[#7dd3b0]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-surface p-8">
            <Icon name="shield" size={28} className="text-pine" />
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{h.privacyTitle}</h2>
            <p className="mt-3 leading-relaxed text-ink-2">{h.privacyBody}</p>
            <Link href="/legal/privacy" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-pine underline underline-offset-4">
              {t.common.footer.privacy}
              <Icon name="arrowRight" size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section aria-labelledby="for-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 id="for-title" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{h.forTitle}</h2>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {h.forList.map((item) => (
            <li key={item} className="rounded-full border border-line bg-surface px-4 py-2 font-medium text-ink-2">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-[2rem] bg-pine px-6 py-14 text-center text-white sm:px-12">
          <h2 id="cta-title" className="text-3xl font-extrabold tracking-tight text-balance">{h.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/90">{h.ctaBody}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" size="lg" variant="secondary" className="border-white">
              {h.ctaPrimary}
            </ButtonLink>
            <ButtonLink href="/pricing" size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              {h.ctaSecondary}
            </ButtonLink>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">{h.disclaimer}</p>
      </section>
    </>
  );
}
