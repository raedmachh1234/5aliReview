import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { FeedbackFlow, type FeedbackFlowStrings } from "@/components/customer/feedback-flow";
import { BusinessHeader, BusinessDetails, CustomerFooter } from "@/components/customer/business-info";
import { ensureAccessibleBrand } from "@/lib/contrast";
import { cardCodeSchema, slugSchema } from "@/lib/validation";
import type { Locale } from "@/lib/types";
import { dirOf, fmt, isLocale } from "@/i18n/config";
import { getDictionary, getLocale, isLocaleExplicit } from "@/i18n/server";
import { getRepository } from "@/server/data";
import { logger } from "@/server/security/logger";

/**
 * Customer feedback page — the page an NFC card or QR code opens.
 * Sets no cookies, loads no third-party resources and is never indexed.
 */
type Search = { loc?: string; card?: string; src?: string; lang?: string };

async function load(slugParam: string, search: Search) {
  const slug = slugSchema.safeParse(slugParam);
  if (!slug.success) return null;
  const loc = search.loc && slugSchema.safeParse(search.loc).success ? search.loc : undefined;
  const repo = await getRepository();
  const business = await repo.getPublicBusiness(slug.data, loc);
  if (!business) return null;
  return { business, slug: slug.data, loc, repo };
}

async function resolveLocale(businessDefault: Locale, search: Search): Promise<Locale> {
  if (isLocale(search.lang)) return search.lang;
  // The customer's phone language when we support it, otherwise the business's default.
  return (await isLocaleExplicit()) ? getLocale() : businessDefault;
}

export async function generateMetadata(props: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const search = (await props.searchParams) as Search;
  const data = await load(slug, search);
  const locale = data ? await resolveLocale(data.business.defaultLocale, search) : await getLocale();
  const t = getDictionary(locale);
  return {
    title: data ? { absolute: fmt(t.meta.feedbackTitle, { business: data.business.name }) } : { absolute: t.customer.unavailableTitle },
    robots: { index: false, follow: false },
  };
}

export default async function FeedbackPage(props: PageProps<"/r/[slug]">) {
  const { slug: slugParam } = await props.params;
  const search = (await props.searchParams) as Search;
  const data = await load(slugParam, search);
  if (!data) notFound();

  const { business, slug, loc, repo } = data;
  const locale = await resolveLocale(business.defaultLocale, search);
  const t = getDictionary(locale);
  const card = search.card && cardCodeSchema.safeParse(search.card).success ? search.card : "";
  const source = search.src === "nfc" || search.src === "qr" ? search.src : "link";

  // Anonymous aggregate counter, recorded after the response is sent.
  after(async () => {
    try {
      await repo.recordEvent({ slug, locationSlug: loc, cardCode: card || undefined, type: "page_view" });
    } catch (err) {
      logger.warn("page_view_event_failed", err);
    }
  });

  const googleParams = new URLSearchParams();
  if (loc) googleParams.set("loc", loc);
  if (card) googleParams.set("card", card);
  const googleHref = `/r/${slug}/google${googleParams.size ? `?${googleParams}` : ""}`;

  const words = [1, 2, 3, 4, 5].map((n) => t.customer.ratingWords[n as 1 | 2 | 3 | 4 | 5]) as FeedbackFlowStrings["words"];
  const strings: FeedbackFlowStrings = {
    title: t.customer.title,
    subtitle: t.customer.subtitle,
    legend: t.customer.ratingLegend,
    starLabels: [1, 2, 3, 4, 5].map((n) => fmt(t.customer.starLabel, { n })) as FeedbackFlowStrings["starLabels"],
    words,
    prompt: t.customer.chooseRating,
    selectedTemplate: t.customer.selected,
    submit: t.customer.submit,
    submitting: t.customer.submitting,
    anonymous: t.customer.anonymous,
    skipToGoogle: t.customer.skipToGoogle,
    skipToGoogleLink: t.customer.skipToGoogleLink,
    errors: {
      ratingRequired: t.errors.ratingRequired,
      generic: t.errors.generic,
      rateLimited: t.errors.rateLimited,
      unavailable: t.customer.unavailableTitle,
    },
    thanks: { ...t.thanks },
  };

  const brand = ensureAccessibleBrand(business.brandPrimary);
  const langParams = (l: Locale) => {
    const p = new URLSearchParams();
    if (loc) p.set("loc", loc);
    if (card) p.set("card", card);
    if (source !== "link") p.set("src", source);
    p.set("lang", l);
    return `/r/${slug}?${p}`;
  };

  return (
    <div lang={locale} dir={dirOf(locale)} style={{ "--brand": brand } as React.CSSProperties} className="flex min-h-dvh flex-col bg-canvas">
      <div aria-hidden="true" className="h-1.5 w-full bg-[var(--brand)]" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-6 pb-4 sm:pt-10">
        <BusinessHeader business={business} demoLabel={t.customer.demoBadge} />
        <div className="mt-6 rounded-[1.75rem] border border-line bg-surface px-4 py-7 shadow-card min-[360px]:px-5 sm:px-7">
          <FeedbackFlow
            t={strings}
            slug={slug}
            locationSlug={loc ?? ""}
            cardCode={card}
            source={source}
            googleHref={googleHref}
            hasGoogleReviewUrl={business.hasGoogleReviewUrl}
          />
        </div>
        <BusinessDetails business={business} t={t.customer} />
      </main>
      <CustomerFooter locale={locale} t={t} langHref={langParams} />
    </div>
  );
}
