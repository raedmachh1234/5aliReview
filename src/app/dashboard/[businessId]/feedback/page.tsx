import Link from "next/link";
import type { Rating } from "@/lib/types";
import { loadDashboard } from "@/server/dashboard";
import { parseFilters } from "@/server/filters";
import { can } from "@/server/auth/guards";
import { fmt, intlLocale } from "@/i18n/config";
import { DashboardFilters } from "@/components/dashboard/filters";
import { FeedbackTable } from "@/components/dashboard/feedback-table";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { buttonClass } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const PAGE_SIZE = 25;

export default async function FeedbackPage(props: PageProps<"/dashboard/[businessId]/feedback">) {
  const { businessId } = await props.params;
  const search = await props.searchParams;
  const { user, repo, t, locale, role } = await loadDashboard(businessId);
  const locations = await repo.listLocations(user, businessId);
  const f = parseFilters(search, locations);
  const ratingParam = Number(search.rating);
  const rating = [1, 2, 3, 4, 5].includes(ratingParam) ? (ratingParam as Rating) : null;
  const page = Math.max(1, Math.floor(Number(search.page) || 1));

  const result = await repo.listFeedback(user, businessId, { range: f.range, locationId: f.locationId, rating, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const d = t.dashboard;
  const base = `/dashboard/${businessId}/feedback`;

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) if (typeof v === "string" && k !== "page") q.set(k, v);
    q.set("page", String(p));
    return `${base}?${q}`;
  };

  return (
    <>
      <PageHeader
        title={d.feedback.title}
        description={d.feedback.lead}
        actions={
          can(role, "manager") ? (
            <>
              <a href={`/api/export/${businessId}?format=csv`} className={buttonClass("secondary", "sm")} download>
                <Icon name="download" size={16} /> CSV
              </a>
              <a href={`/api/export/${businessId}?format=json`} className={buttonClass("secondary", "sm")} download>
                <Icon name="download" size={16} /> JSON
              </a>
            </>
          ) : null
        }
      />
      <DashboardFilters
        action={base}
        preset={f.preset}
        from={f.from}
        to={f.to}
        locationId={f.locationId}
        locations={locations}
        t={d.filters}
        extra={
          <div className="min-w-32">
            <label htmlFor="f-rating" className="mb-1 block text-xs font-semibold text-ink-2">
              {d.filters.rating}
            </label>
            <select id="f-rating" name="rating" defaultValue={rating ?? ""} className={controlClass.replace("py-2.5", "py-2")}>
              <option value="">{d.filters.allRatings}</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {fmt(t.common.starsOutOf, { n: r })}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <Card>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-sm font-semibold text-ink-2" role="status">
            {fmt(d.feedback.total, { count: result.total.toLocaleString(intlLocale(locale)) })}
          </p>
        </div>
        {result.items.length ? (
          <FeedbackTable items={result.items} locations={locations} t={t} locale={intlLocale(locale)} caption={d.feedback.title} />
        ) : (
          <EmptyState icon="list" title={d.empty.feedbackTitle}>
            {d.empty.feedbackBody}
          </EmptyState>
        )}
        {pages > 1 ? (
          <nav aria-label={fmt(t.common.pageOf, { page, pages })} className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={buttonClass("secondary", "sm")}>
                {t.common.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-2">{fmt(t.common.pageOf, { page, pages })}</span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className={buttonClass("secondary", "sm")}>
                {t.common.next}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Card>
    </>
  );
}
