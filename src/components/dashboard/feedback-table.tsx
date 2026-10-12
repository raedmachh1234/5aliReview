import type { Feedback, Location } from "@/lib/types";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fmt } from "@/i18n/config";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/surface";

/** Ratings table. Shows only anonymous fields — there is nothing else to show. */
export function FeedbackTable({
  items,
  locations,
  t,
  locale,
  caption,
}: {
  items: Feedback[];
  locations: Location[];
  t: Dictionary;
  locale: string;
  caption: string;
}) {
  const r = t.dashboard.recent;
  const locName = (id: string | null) => locations.find((l) => l.id === id)?.name ?? r.noLocation;
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-start text-xs font-semibold tracking-wide text-ink-2 uppercase">
            <th scope="col" className="px-5 py-3 text-start">{r.rating}</th>
            <th scope="col" className="px-5 py-3 text-start">{r.when}</th>
            <th scope="col" className="px-5 py-3 text-start">{r.location}</th>
            <th scope="col" className="px-5 py-3 text-start">{r.source}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                <Stars rating={f.rating} label={fmt(t.common.starsOutOf, { n: f.rating })} />
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-ink-2">
                <time dateTime={f.createdAt}>{dateFmt.format(new Date(f.createdAt))}</time>
              </td>
              <td className="px-5 py-3 text-ink-2">{locName(f.locationId)}</td>
              <td className="px-5 py-3">
                <Badge>{r.sources[f.source]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
