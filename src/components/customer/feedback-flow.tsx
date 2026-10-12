"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitFeedback, type FeedbackState } from "@/app/r/[slug]/actions";
import { StarRating } from "@/components/rating/star-rating";
import { ThankYou, type ThankYouStrings } from "./thank-you";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export interface FeedbackFlowStrings {
  title: string;
  subtitle: string;
  legend: string;
  starLabels: [string, string, string, string, string];
  words: [string, string, string, string, string];
  prompt: string;
  selectedTemplate: string; // "{n} out of 5 — {word}"
  submit: string;
  submitting: string;
  anonymous: string;
  skipToGoogle: string;
  skipToGoogleLink: string;
  errors: Record<"ratingRequired" | "generic" | "rateLimited" | "unavailable", string>;
  thanks: ThankYouStrings;
}

const initialState: FeedbackState = { status: "idle" };

export function FeedbackFlow({
  t,
  slug,
  locationSlug,
  cardCode,
  source,
  googleHref,
  hasGoogleReviewUrl,
}: {
  t: FeedbackFlowStrings;
  slug: string;
  locationSlug: string;
  cardCode: string;
  source: string;
  googleHref: string;
  hasGoogleReviewUrl: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);
  const [rating, setRating] = useState<number | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const firstStar = useRef<HTMLInputElement>(null);
  const thanksHeading = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen-reader users hear it immediately.
  useEffect(() => {
    if (state.status === "success") thanksHeading.current?.focus();
  }, [state.status]);

  if (state.status === "success") {
    return <ThankYou t={t.thanks} googleHref={googleHref} hasGoogleReviewUrl={hasGoogleReviewUrl} headingRef={thanksHeading} />;
  }

  const serverError = state.status === "error" ? t.errors[state.error] : null;
  const error = clientError ?? serverError;
  const errorId = "rating-error";

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(e) => {
        if (!rating) {
          e.preventDefault();
          setClientError(t.errors.ratingRequired);
          firstStar.current?.focus();
        }
      }}
      className="flex flex-col items-center text-center"
    >
      <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-[1.02rem] text-ink-2">{t.subtitle}</p>

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="location" value={locationSlug} />
      <input type="hidden" name="card" value={cardCode} />
      <input type="hidden" name="source" value={source} />

      <div className="mt-7 w-full">
        <StarRating
          t={{
            legend: t.legend,
            starLabels: t.starLabels,
            words: t.words,
            prompt: t.prompt,
            selected: (n) => t.selectedTemplate.replace("{n}", String(n)).replace("{word}", t.words[n - 1]),
          }}
          value={rating}
          onChange={(n) => {
            setRating(n);
            setClientError(null);
          }}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
          firstInputRef={firstStar}
        />
      </div>

      <div className="mt-2 min-h-7 w-full">
        {error ? (
          <p id={errorId} role="alert" className="flex items-center justify-center gap-1.5 text-[0.95rem] font-semibold text-danger">
            <Icon name="alert" size={18} />
            {error}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={pending} aria-disabled={pending} className={cn(buttonClass("brand", "lg", "mt-2 w-full"))}>
        {pending ? (
          <>
            <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {t.submitting}
          </>
        ) : (
          t.submit
        )}
      </button>

      <p className="mt-4 text-sm text-muted">
        <Icon name="lock" size={15} className="me-1 inline-block align-[-2px]" />
        {t.anonymous}
      </p>

      {hasGoogleReviewUrl ? (
        <p className="mt-6 text-sm text-ink-2">
          {t.skipToGoogle}{" "}
          <a href={googleHref} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-ink underline underline-offset-4 hover:text-pine">
            {t.skipToGoogleLink}
            <span className="sr-only"> ({t.thanks.opensNewTab})</span>
          </a>
        </p>
      ) : null}
    </form>
  );
}
