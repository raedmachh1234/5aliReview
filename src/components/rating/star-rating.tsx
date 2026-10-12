"use client";

import { useState, type Ref } from "react";
import { cn } from "@/lib/cn";

export interface StarRatingStrings {
  legend: string;
  /** "Rating: {n} out of 5 stars" — already formatted per star. */
  starLabels: [string, string, string, string, string];
  words: [string, string, string, string, string];
  prompt: string;
  /** "{n} out of 5 — {word}", formatted by the caller. */
  selected: (n: number) => string;
}

/**
 * Accessible 1–5 star rating built on native radio buttons:
 *  - Tab moves into the group, arrow keys change the rating, Space selects.
 *  - Each option is announced as "Rating: N out of 5 stars".
 *  - A visible number under each star and a text summary ("4 out of 5 — Good")
 *    mean the choice never relies on colour alone.
 *  - Works before hydration / without JS because it's a plain form control.
 */
export function StarRating({
  name = "rating",
  t,
  value,
  onChange,
  invalid,
  describedBy,
  firstInputRef,
}: {
  name?: string;
  t: StarRatingStrings;
  value: number | null;
  onChange: (n: number) => void;
  invalid?: boolean;
  describedBy?: string;
  firstInputRef?: Ref<HTMLInputElement>;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <fieldset aria-describedby={describedBy} aria-invalid={invalid || undefined} className="w-full">
      <legend className="sr-only">{t.legend}</legend>
      <div className="flex justify-center gap-0.5 min-[360px]:gap-1 sm:gap-2" onMouseLeave={() => setHover(null)} dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => {
          const id = `${name}-${n}`;
          const active = n <= shown;
          return (
            <div key={n} className="relative">
              <input
                ref={n === 1 ? firstInputRef : undefined}
                type="radio"
                id={id}
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <label
                htmlFor={id}
                onMouseEnter={() => setHover(n)}
                className={cn(
                  "flex min-h-[4rem] w-[2.9rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl transition-transform duration-150 select-none min-[360px]:w-[3.3rem] sm:min-h-[4.25rem] sm:w-16",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                  "active:scale-95",
                )}
              >
                <span className="sr-only">{t.starLabels[n - 1]}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={cn("size-10 transition-colors duration-150 min-[360px]:size-11 sm:size-12", active ? "text-star" : "text-control", value === n && "drop-shadow-sm")}
                >
                  <path
                    d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
                    fill={active ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={active ? 0.6 : 1.5}
                    strokeLinejoin="round"
                  />
                </svg>
                <span aria-hidden="true" className={cn("tabular text-sm", value === n ? "font-extrabold text-ink" : "font-medium text-muted")}>
                  {n}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      <p aria-live="polite" className={cn("mt-3 min-h-6 text-center text-[0.95rem]", value ? "font-semibold text-ink" : "text-muted")}>
        {value ? t.selected(value) : t.prompt}
      </p>
    </fieldset>
  );
}
