"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

/** Changes the ?sort= parameter immediately, keeping the other filters. */
export function SortSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <label htmlFor="sort" className="sr-only">
        Sort by
      </label>
      <select
        id="sort"
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          if (event.target.value === "newest") next.delete("sort");
          else next.set("sort", event.target.value);
          const query = next.toString();
          startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
        }}
        className={cn(
          "h-11 appearance-none rounded-full border border-line bg-surface ps-4 pe-10 text-sm font-medium text-ink transition hover:border-ink/25 focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none",
          pending && "opacity-60",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
