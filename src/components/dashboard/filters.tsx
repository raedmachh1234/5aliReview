import type { Location } from "@/lib/types";
import { RANGE_PRESETS, type RangePreset } from "@/lib/dates";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { controlClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * One filter row above the content it scopes (date range first, then
 * location). A plain GET form: filter state lives in the URL, works without
 * JavaScript, and is shareable. No auto-submit on change (WCAG 3.2.2).
 */
export function DashboardFilters({
  action,
  preset,
  from,
  to,
  locationId,
  locations,
  t,
  extra,
}: {
  action: string;
  preset: RangePreset;
  from: string;
  to: string;
  locationId: string | null;
  locations: Location[];
  t: Dictionary["dashboard"]["filters"];
  extra?: React.ReactNode;
}) {
  const sm = controlClass.replace("py-2.5", "py-2");
  return (
    <form method="get" action={action} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3">
      <div className="min-w-36 flex-1 sm:flex-none">
        <label htmlFor="f-range" className="mb-1 block text-xs font-semibold text-ink-2">
          {t.range}
        </label>
        <select id="f-range" name="range" defaultValue={preset} className={sm}>
          {RANGE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {t[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-3">
        <div>
          <label htmlFor="f-from" className="mb-1 block text-xs font-semibold text-ink-2">
            {t.from} <span className="font-normal text-muted">({t.custom})</span>
          </label>
          <input id="f-from" type="date" name="from" defaultValue={from} className={sm} />
        </div>
        <div>
          <label htmlFor="f-to" className="mb-1 block text-xs font-semibold text-ink-2">
            {t.to} <span className="font-normal text-muted">({t.custom})</span>
          </label>
          <input id="f-to" type="date" name="to" defaultValue={to} className={sm} />
        </div>
      </div>
      {locations.length > 0 ? (
        <div className="min-w-40 flex-1 sm:flex-none">
          <label htmlFor="f-loc" className="mb-1 block text-xs font-semibold text-ink-2">
            {t.location}
          </label>
          <select id="f-loc" name="loc" defaultValue={locationId ?? ""} className={sm}>
            <option value="">{t.allLocations}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {extra}
      <Button type="submit" variant="secondary">
        {t.apply}
      </Button>
    </form>
  );
}
