import Link from "next/link";
import { loadDashboard } from "@/server/dashboard";
import { parseFilters } from "@/server/filters";
import { fmt, intlLocale } from "@/i18n/config";
import { fillSeries, formatPercent, googleClickRate, RATINGS_DESC, share } from "@/lib/stats";
import { DashboardFilters } from "@/components/dashboard/filters";
import { Kpi } from "@/components/dashboard/kpi";
import { FeedbackTable } from "@/components/dashboard/feedback-table";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HorizontalBars, Meter } from "@/components/charts/bars";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";

export default async function DashboardOverview(props: PageProps<"/dashboard/[businessId]">) {
  const { businessId } = await props.params;
  const { business, user, repo, t, locale } = await loadDashboard(businessId);
  const [locations, cards] = await Promise.all([repo.listLocations(user, businessId), repo.listCards(user, businessId)]);
  const f = parseFilters(await props.searchParams, locations);
  const [stats, recent] = await Promise.all([
    repo.getStats(user, businessId, f.range, f.locationId),
    repo.listFeedback(user, businessId, { range: f.range, locationId: f.locationId, page: 1, pageSize: 8 }),
  ]);

  const nf = intlLocale(locale);
  const d = t.dashboard;
  const ctr = googleClickRate(stats);
  const activeCards = cards.filter((c) => c.status === "active").length;
  const series = fillSeries(stats.series, f.range);
  const base = `/dashboard/${business.id}`;

  return (
    <>
      <PageHeader title={user.fullName ? fmt(d.welcome, { name: user.fullName.split(" ")[0] }) : d.welcomeGeneric} />
      <DashboardFilters action={base} preset={f.preset} from={f.from} to={f.to} locationId={f.locationId} locations={locations} t={d.filters} />

      <section aria-label={d.nav.overview} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={d.kpi.totalFeedback} value={stats.total.toLocaleString(nf)} icon="list" />
        <Kpi
          label={d.kpi.averageRating}
          value={stats.average !== null ? stats.average.toLocaleString(nf, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : "—"}
          suffix={stats.average !== null ? d.kpi.outOf5 : undefined}
          sub={stats.average === null ? d.kpi.noData : undefined}
          icon="star"
        />
        <Kpi label={d.kpi.googleClicks} value={stats.googleClicks.toLocaleString(nf)} sub={fmt(d.kpi.clickRate, { rate: formatPercent(ctr, nf) })} icon="external" />
        <Kpi label={d.kpi.activeCards} value={activeCards} sub={fmt(d.kpi.ofCards, { total: cards.length })} icon="nfc" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={d.charts.overTime} description={d.charts.overTimeDesc} />
          <div className="p-5">
            {stats.total === 0 ? (
              <EmptyState icon="chart" title={d.empty.feedbackTitle}>{d.empty.feedbackBody}</EmptyState>
            ) : (
              <TimeSeriesChart
                data={series}
                locale={nf}
                labels={{
                  count: d.charts.count,
                  average: d.charts.average,
                  date: d.charts.date,
                  showTable: d.charts.showTable,
                  summary: `${d.charts.overTime}: ${stats.total} — ${f.from} → ${f.to}`,
                }}
              />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title={d.charts.distribution} description={d.charts.distributionDesc} />
          <div className="p-5">
            <HorizontalBars
              ariaLabel={d.charts.distribution}
              data={RATINGS_DESC.map((r) => ({
                key: String(r),
                label: (
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="inline-flex items-center gap-1">
                      {r}
                      <Icon name="star" size={14} className="text-star" />
                    </span>
                    <span className="sr-only">{r === 1 ? d.charts.oneStar : fmt(d.charts.stars, { n: r })}</span>
                  </span>
                ),
                value: stats.distribution[r],
                detail: formatPercent(share(stats.distribution[r], stats.total), nf),
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title={d.charts.ctr} description={d.charts.ctrDesc} />
          <div className="space-y-4 p-5">
            <p className="tabular text-4xl font-extrabold tracking-tight text-ink">{formatPercent(ctr, nf)}</p>
            <Meter value={ctr} label={d.charts.ctr} />
            <p className="text-sm text-ink-2">{fmt(d.charts.ctrExplain, { clicks: stats.googleClicks, submitted: stats.total })}</p>
            <p className="flex gap-2 rounded-xl bg-pine-soft p-3 text-sm text-ink">
              <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-pine" />
              {d.charts.noGatingNote}
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader
            title={d.recent.title}
            action={
              <Link href={`${base}/feedback`} className="text-sm font-semibold text-pine underline underline-offset-4">
                {d.recent.viewAll}
              </Link>
            }
          />
          {recent.items.length ? (
            <FeedbackTable items={recent.items} locations={locations} t={t} locale={nf} caption={d.recent.title} />
          ) : (
            <EmptyState title={d.empty.feedbackTitle}>{d.empty.feedbackBody}</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
