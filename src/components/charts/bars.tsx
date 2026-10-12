import type { ReactNode } from "react";

export interface BarDatum {
  key: string;
  label: ReactNode;
  value: number;
  /** Optional secondary label, e.g. a percentage. */
  detail?: string;
}

/**
 * Horizontal bar list (single series). Every value is directly labelled with
 * text tokens, so no tooltip or legend is required and nothing depends on
 * colour. Bars are 20px thick with a 4px rounded data end and a square base.
 * Built as a semantic list so screen readers read "label: value".
 */
export function HorizontalBars({ data, max, ariaLabel }: { data: BarDatum[]; max?: number; ariaLabel: string }) {
  const top = Math.max(1, max ?? Math.max(...data.map((d) => d.value)));
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {data.map((d) => {
        const pct = (d.value / top) * 100;
        return (
          <li key={d.key} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm">
            <span className="font-medium text-ink-2">{d.label}</span>
            <span aria-hidden="true" className="relative block h-5">
              <span className="absolute inset-y-0 start-0 w-full rounded-e-[4px] bg-subtle/70" />
              <span
                className="absolute inset-y-0 start-0 rounded-e-[4px] bg-pine transition-[width] duration-500"
                style={{ width: d.value > 0 ? `max(${pct}%, 3px)` : 0 }}
              />
            </span>
            <span className="tabular min-w-[4.5rem] text-end">
              <strong className="text-ink">{d.value.toLocaleString()}</strong>
              {d.detail ? <span className="ms-1.5 text-muted">{d.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Single-value meter for rates (e.g. Google click-through). */
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={label}
        className="h-3 w-full overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-pine" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
