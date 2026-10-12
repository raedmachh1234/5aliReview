import type { Ref } from "react";
import { Icon } from "@/components/ui/icon";
import { buttonClass } from "@/components/ui/button";

export interface ThankYouStrings {
  title: string;
  body: string;
  googlePrompt: string;
  googleButton: string;
  googleNote: string;
  googleUnavailable: string;
  done: string;
  opensNewTab: string;
}

/**
 * The thank-you screen shown after EVERY submission.
 *
 * ⚠️ NO REVIEW GATING: this component deliberately does not receive the
 * rating. The Google Review button is identical for 1★ and 5★ customers and
 * depends only on whether the business configured a Google review link.
 * tests/unit/no-review-gating.test.tsx enforces this.
 */
export function ThankYou({
  t,
  googleHref,
  hasGoogleReviewUrl,
  headingRef,
}: {
  t: ThankYouStrings;
  googleHref: string;
  hasGoogleReviewUrl: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <section aria-labelledby="thanks-title" className="animate-rise flex flex-col items-center text-center">
      <span className="animate-pop mb-4 grid size-14 place-items-center rounded-full bg-success-soft text-success sm:mb-5 sm:size-16">
        <Icon name="check" size={34} strokeWidth={2.6} />
      </span>
      <h1 id="thanks-title" ref={headingRef} tabIndex={-1} className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink outline-none sm:text-[1.65rem]">
        {t.title}
      </h1>
      <p className="mt-2 max-w-xs text-[1.02rem] text-ink-2">{t.body}</p>

      <div className="mt-6 w-full rounded-2xl border border-line bg-canvas p-4 sm:mt-8 sm:p-5">
        {hasGoogleReviewUrl ? (
          <>
            <p className="font-semibold text-ink">{t.googlePrompt}</p>
            <a
              href={googleHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              data-testid="google-review-button"
              className={buttonClass("brand", "lg", "mt-4 w-full px-4 text-balance")}
            >
              <Icon name="star" size={20} className="shrink-0 text-[#f5b72f]" />
              {t.googleButton}
              <span className="sr-only"> ({t.opensNewTab})</span>
            </a>
            <p className="mt-3 text-sm text-muted">{t.googleNote}</p>
          </>
        ) : (
          <p role="status" data-testid="google-unavailable" className="text-sm font-medium text-ink-2">
            {t.googleUnavailable}
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-muted">{t.done}</p>
    </section>
  );
}
