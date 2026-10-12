import { loadDashboard } from "@/server/dashboard";
import { parseFilters } from "@/server/filters";
import { fmt, intlLocale } from "@/i18n/config";
import { fillSeries, formatPercent, googleClickRate } from "@/lib/stats";
import { DashboardFilters } from "@/components/dashboard/filters";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HorizontalBars } from "@/components/charts/bars";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/surface";
import { Stars } from "@/components/ui/stars";

export default async function AnalyticsPage(props: PageProps<"/dashboard/[businessId]/analytics">) {
  const { businessId } = await props.params;
  const { user, repo, t, locale } = await loadDashboard(businessId);
  const locations = await repo.listLocations(user, businessId);
  const f = parseFilters(await props.searchParams, locations);
  const stats = await repo.getStats(user, businessId, f.range, f.locationId);
  const perLocation =
    locations.length > 1 && !f.locationId
      ? await Promise.all(locations.map(async (l) => ({ location: l, stats: await repo.getStats(user, businessId, f.range, l.id) })))
      : [];

  const nf = intlLocale(locale);
  const d = t.dashboard;
  const c = d.charts;

  return (
    <>
      <PageHeader title={d.analytics.title} description={d.analytics.lead} />
      <DashboardFilters action={`/dashboard/${businessId}/analytics`} preset={f.preset} from={f.from} to={f.to} locationId={f.locationId} locations={locations} t={d.filters} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={c.funnel} />
          <div className="p-5">
            <HorizontalBars
              ariaLabel={c.funnel}
              data={[
                { key: "visits", label: c.visits, value: stats.pageViews },
                { key: "nfc", label: c.nfc, value: stats.nfcVisits },
                { key: "qr", label: c.qr, value: stats.qrScans },
                { key: "submitted", label: c.submitted, value: stats.total },
                { key: "clicked", label: c.clicked, value: stats.googleClicks },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title={c.ctr} description={c.ctrDesc} />
          <div className="p-5">
            <p className="tabular text-5xl font-extrabold tracking-tight text-ink">{formatPercent(googleClickRate(stats), nf)}</p>
            <p className="mt-2 text-sm text-ink-2">{fmt(c.ctrExplain, { clicks: stats.googleClicks, submitted: stats.total })}</p>
            <p className="mt-4 text-sm text-muted">{c.noGatingNote}</p>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title={c.overTime} description={c.overTimeDesc} />
        <div className="p-5">
          {stats.total ? (
            <TimeSeriesChart
              data={fillSeries(stats.series, f.range)}
              locale={nf}
              labels={{ count: c.count, average: c.average, date: c.date, showTable: c.showTable, summary: `${c.overTime}: ${stats.total}` }}
            />
          ) : (
            <EmptyState icon="chart" title={d.empty.feedbackTitle}>{d.empty.feedbackBody}</EmptyState>
          )}
        </div>
      </Card>

      {perLocation.length ? (
        <Card className="mt-6">
          <CardHeader title={d.analytics.byLocation} />
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={d.analytics.byLocation}>
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold tracking-wide text-ink-2 uppercase">
                  <th scope="col" className="px-5 py-3 text-start">{d.analytics.locationCol}</th>
                  <th scope="col" className="px-5 py-3 text-end">{d.kpi.totalFeedback}</th>
                  <th scope="col" className="px-5 py-3 text-start">{d.kpi.averageRating}</th>
                  <th scope="col" className="px-5 py-3 text-end">{d.kpi.googleClicks}</th>
                </tr>
              </thead>
              <tbody>
                {perLocation.map(({ location, stats: s }) => (
                  <tr key={location.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-3 text-start font-semibold text-ink">{location.name}</th>
                    <td className="tabular px-5 py-3 text-end">{s.total.toLocaleString(nf)}</td>
                    <td className="px-5 py-3">
                      {s.average !== null ? (
                        <Stars rating={Math.round(s.average)} label={fmt(t.common.starsOutOf, { n: s.average.toFixed(1) })} showNumber={false} className="me-2" />
                      ) : null}
                      <span className="tabular font-semibold">{s.average !== null ? s.average.toFixed(1) : "—"}</span>
                    </td>
                    <td className="tabular px-5 py-3 text-end">{s.googleClicks.toLocaleString(nf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  );
}
