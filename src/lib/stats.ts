import type { DailyPoint, DateRange, FeedbackStats, Rating } from "./types";
import { daysInRange } from "./dates";

/** Adds zero-count days so the time axis is continuous. */
export function fillSeries(series: DailyPoint[], range: DateRange): DailyPoint[] {
  const byDay = new Map(series.map((p) => [p.day, p]));
  return daysInRange(range).map((day) => byDay.get(day) ?? { day, count: 0, average: null });
}

export const RATINGS_DESC: Rating[] = [5, 4, 3, 2, 1];

export function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

/**
 * Share of submitted feedback followed by a tap on the Google button.
 * Capped at 100% (customers can also use the "skip to Google" link without rating).
 */
export function googleClickRate(stats: FeedbackStats): number {
  return Math.min(1, share(stats.googleClicks, stats.total));
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: value > 0 && value < 0.1 ? 1 : 0 }).format(value);
}
