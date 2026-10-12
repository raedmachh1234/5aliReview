import type { DateRange } from "./types";

export type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";
export const RANGE_PRESETS: RangePreset[] = ["today", "7d", "30d", "90d", "custom"];

const DAY_MS = 86_400_000;

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves dashboard filter params into a concrete [from, to) range.
 * Invalid custom dates fall back to the last 30 days; ranges are capped at 2 years.
 */
export function resolveRange(
  preset: string | undefined,
  fromParam?: string,
  toParam?: string,
  now = new Date(),
): { preset: RangePreset; range: DateRange; days: number } {
  const tomorrow = new Date(startOfUtcDay(now).getTime() + DAY_MS);
  const build = (days: number, p: RangePreset) => ({
    preset: p,
    range: { from: new Date(tomorrow.getTime() - days * DAY_MS).toISOString(), to: tomorrow.toISOString() },
    days,
  });

  switch (preset) {
    case "today":
      return build(1, "today");
    case "7d":
      return build(7, "7d");
    case "90d":
      return build(90, "90d");
    case "custom": {
      if (fromParam && toParam && ISO_DAY.test(fromParam) && ISO_DAY.test(toParam)) {
        const from = new Date(`${fromParam}T00:00:00Z`);
        const toExclusive = new Date(new Date(`${toParam}T00:00:00Z`).getTime() + DAY_MS);
        const days = Math.round((toExclusive.getTime() - from.getTime()) / DAY_MS);
        if (!Number.isNaN(days) && days >= 1 && days <= 731) {
          return { preset: "custom", range: { from: from.toISOString(), to: toExclusive.toISOString() }, days };
        }
      }
      return build(30, "30d");
    }
    default:
      return build(30, "30d");
  }
}

/** Every YYYY-MM-DD in [from, to). */
export function daysInRange(range: DateRange): string[] {
  const out: string[] = [];
  for (let t = new Date(range.from).getTime(); t < new Date(range.to).getTime(); t += DAY_MS) {
    out.push(isoDay(new Date(t)));
  }
  return out;
}
