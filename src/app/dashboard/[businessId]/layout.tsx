import type { Metadata } from "next";
import Link from "next/link";
import { loadDashboard } from "@/server/dashboard";
import { isDemoMode } from "@/server/env";
import { signOut } from "@/server/actions/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import { Alert, Badge } from "@/components/ui/surface";
import { ConsentRoot } from "@/components/consent/consent-root";
import { SkipLink } from "@/components/site/site-chrome";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BusinessDashboardLayout(props: LayoutProps<"/dashboard/[businessId]">) {
  const { businessId } = await props.params;
  const { business, role, t, user, repo } = await loadDashboard(businessId);
  const memberships = user.isPlatformAdmin ? [] : await repo.listMemberships(user);
  const base = `/dashboard/${business.id}`;
  const n = t.dashboard.nav;

  const nav: NavItem[] = [
    { href: base, label: n.overview, icon: "home", exact: true },
    { href: `${base}/feedback`, label: n.feedback, icon: "list" },
    { href: `${base}/analytics`, label: n.analytics, icon: "chart" },
    { href: `${base}/locations`, label: n.locations, icon: "pin" },
    { href: `${base}/google-reviews`, label: n.google, icon: "star" },
    { href: `${base}/nfc-cards`, label: n.cards, icon: "nfc" },
    { href: `${base}/qr-codes`, label: n.qr, icon: "qr" },
    { href: `${base}/settings`, label: n.settings, icon: "settings" },
    { href: `${base}/billing`, label: n.billing, icon: "receipt" },
    { href: `${base}/privacy`, label: n.privacy, icon: "shield" },
  ];

  const roleLabel = role === "admin" ? t.common.admin : t.dashboard.roles[role];

  const top = (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {memberships.length > 1 ? (
          <details className="relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-2 font-bold text-ink hover:bg-subtle [&::-webkit-details-marker]:hidden">
              <span className="sr-only">{t.dashboard.switchBusiness}: </span>
              <span className="truncate">{business.name}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <ul className="absolute start-0 top-full z-30 mt-1 w-64 rounded-xl border border-line bg-surface p-1 shadow-lg">
              {memberships.map((m) => (
                <li key={m.business.id}>
                  <Link
                    href={`/dashboard/${m.business.id}`}
                    aria-current={m.business.id === business.id ? "page" : undefined}
                    className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm hover:bg-subtle aria-[current=page]:font-bold"
                  >
                    {m.business.name}
                    <span className="text-xs text-muted">{t.dashboard.roles[m.role]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ) : (
          <p className="truncate font-bold text-ink">{business.name}</p>
        )}
        <Badge tone="brand" className="hidden sm:inline-flex">
          {roleLabel}
        </Badge>
      </div>
      <a
        href={`/r/${business.slug}`}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <Icon name="eye" size={18} />
        <span className="hidden sm:inline">{t.dashboard.viewPage}</span>
        <span className="sr-only sm:hidden">{t.dashboard.viewPage}</span>
      </a>
    </div>
  );

  const footer = (
    <div className="space-y-2">
      <p className="truncate px-3 text-sm text-muted">{user.email}</p>
      {user.isPlatformAdmin ? (
        <Link href="/admin" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-subtle">
          <Icon name="lock" size={18} />
          {t.common.admin}
        </Link>
      ) : null}
      <form action={signOut}>
        <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-subtle">
          <Icon name="logout" size={18} className="rtl:rotate-180" />
          {t.common.signOut}
        </button>
      </form>
    </div>
  );

  const banner = (
    <>
      {isDemoMode ? (
        <p className="bg-warn-soft px-4 py-2 text-center text-sm font-medium text-warn">{t.common.demoMode}</p>
      ) : null}
      {business.status === "suspended" ? (
        <div className="px-4 pt-4 sm:px-6">
          <Alert tone="danger">{t.dashboard.suspended}</Alert>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <SkipLink label={t.common.skipToContent} />
      <DashboardShell
        brand={
          <Link href={base} aria-label={t.common.homeLink}>
            <Logo />
          </Link>
        }
        top={top}
        sidebarFooter={footer}
        nav={nav}
        navLabel={t.common.menu}
        openLabel={t.common.openMenu}
        closeLabel={t.common.closeMenu}
        banner={banner}
      >
        {props.children}
      </DashboardShell>
      <ConsentRoot />
    </>
  );
}
