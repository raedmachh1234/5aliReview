import "server-only";
import type { Location } from "@/lib/types";
import { resolveRange } from "@/lib/dates";

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const inclusiveEnd = (toExclusive: string) => new Date(new Date(toExclusive).getTime() - 86_400_000).toISOString().slice(0, 10);

/**
 * Parses dashboard filter params. If the person edited the dates but left a
 * preset selected, the dates win (treated as a custom range).
 * Unknown location ids are ignored — never trusted.
 */
export function parseFilters(search: Search, locations: Location[]) {
  const fromParam = one(search.from);
  const toParam = one(search.to);
  let resolved = resolveRange(one(search.range), fromParam, toParam);
  if (resolved.preset !== "custom" && fromParam && toParam) {
    const presetFrom = resolved.range.from.slice(0, 10);
    const presetTo = inclusiveEnd(resolved.range.to);
    if (fromParam !== presetFrom || toParam !== presetTo) resolved = resolveRange("custom", fromParam, toParam);
  }
  const loc = one(search.loc);
  const locationId = loc && locations.some((l) => l.id === loc) ? loc : null;
  return {
    preset: resolved.preset,
    range: resolved.range,
    days: resolved.days,
    locationId,
    from: resolved.range.from.slice(0, 10),
    to: inclusiveEnd(resolved.range.to),
  };
}
