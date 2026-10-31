"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { DAY_NAMES } from "@/lib/business";
import { cn } from "@/lib/cn";
import { DAYS, type OpeningHours } from "@/lib/types";

const timeClass =
  "h-9 w-[6.5rem] rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-ink tabular focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none disabled:opacity-40";

/** Weekly opening hours, submitted as open_<Day>, opens_<Day> and closes_<Day> fields. */
export function HoursEditor({ initial, error }: { initial: OpeningHours[]; error?: string }) {
  const [rows, setRows] = useState(() =>
    DAYS.map((day) => {
      const h = initial.find((x) => x.day === day);
      return { day, open: Boolean(h), opens: h?.opens ?? "09:00", closes: h?.closes ?? "18:00" };
    }),
  );
  const update = (day: string, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r) => (r.day === day ? { ...r, ...patch } : r)));
  const copyMonday = () =>
    setRows((rs) => rs.map((r, i) => (i > 0 && i < 5 ? { ...r, open: rs[0].open, opens: rs[0].opens, closes: rs[0].closes } : r)));

  return (
    <fieldset aria-describedby={error ? "hours-error" : "hours-hint"}>
      <legend className="text-sm font-medium">Opening hours</legend>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p id="hours-hint" className="text-xs text-muted">
          Shown in the store and sent to Google. Use the same hours as in your Business Profile.
        </p>
        <button type="button" onClick={copyMonday} className="text-xs font-medium text-accent-text hover:underline">
          Copy Monday to Tue–Fri
        </button>
      </div>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {rows.map((row) => (
          <li key={row.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            <span className="w-24 text-sm font-medium">{DAY_NAMES[row.day]}</span>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2">
              <input
                type="checkbox"
                name={`open_${row.day}`}
                checked={row.open}
                onChange={(e) => update(row.day, { open: e.target.checked })}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2",
                  row.open ? "bg-accent" : "bg-surface-3",
                )}
              >
                <span className={cn("inline-block size-4 rounded-full bg-white shadow-sm transition-transform", row.open ? "translate-x-4.5" : "translate-x-0.5")} />
              </span>
              <span className="w-12">{row.open ? "Open" : "Closed"}</span>
            </label>
            <span className={cn("flex items-center gap-2", !row.open && "invisible")}>
              <input
                type="time"
                name={`opens_${row.day}`}
                value={row.opens}
                disabled={!row.open}
                onChange={(e) => update(row.day, { opens: e.target.value })}
                aria-label={`${DAY_NAMES[row.day]} opening time`}
                className={timeClass}
              />
              <span className="text-muted">–</span>
              <input
                type="time"
                name={`closes_${row.day}`}
                value={row.closes}
                disabled={!row.open}
                onChange={(e) => update(row.day, { closes: e.target.value })}
                aria-label={`${DAY_NAMES[row.day]} closing time`}
                className={timeClass}
              />
            </span>
          </li>
        ))}
      </ul>
      {error ? (
        <p id="hours-error" role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
