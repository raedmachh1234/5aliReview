import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { isDemoMode } from "@/server/env";
import { signOut } from "@/server/actions/auth";
import { getI18n } from "@/i18n/server";
import { adminText as a } from "@/i18n/admin";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";
import { SkipLink } from "@/components/site/site-chrome";
import { ConsentRoot } from "@/components/consent/consent-root";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requirePlatformAdmin();
  const { t } = await getI18n();

  const nav: NavItem[] = [
    { href: "/admin", label: a.nav.overview, icon: "home", exact: true },
    { href: "/admin/businesses", label: a.nav.businesses, icon: "building" },
    { href: "/admin/cards", label: a.nav.cards, icon: "nfc" },
    { href: "/admin/feedback", label: a.nav.feedback, icon: "list" },
    { href: "/admin/users", label: a.nav.users, icon: "users" },
    { href: "/admin/billing", label: a.nav.billing, icon: "receipt" },
    { href: "/admin/legal", label: a.nav.legal, icon: "scale" },
    { href: "/admin/deletion-requests", label: a.nav.deletion, icon: "trash" },
    { href: "/admin/inbox", label: a.nav.inbox, icon: "mail" },
    { href: "/admin/logs", label: a.nav.logs, icon: "log" },
  ];

  return (
    <div lang="en" dir="ltr">
      <SkipLink label={t.common.skipToContent} />
      <DashboardShell
        brand={
          <Link href="/admin" aria-label="5ali Review admin">
            <Logo />
          </Link>
        }
        top={
          <div className="flex flex-1 items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-bold text-ink">
              {a.title}
              <Badge tone="danger" icon="lock">
                {a.staffOnly}
              </Badge>
            </p>
            <span className="hidden truncate text-sm text-muted sm:block">{user.email}</span>
          </div>
        }
        sidebarFooter={
          <form action={signOut}>
            <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-subtle">
              <Icon name="logout" size={18} />
              {t.common.signOut}
            </button>
          </form>
        }
        nav={nav}
        navLabel="Admin"
        openLabel={t.common.openMenu}
        closeLabel={t.common.closeMenu}
        banner={isDemoMode ? <p className="bg-warn-soft px-4 py-2 text-center text-sm font-medium text-warn">{t.common.demoMode}</p> : null}
      >
        {children}
      </DashboardShell>
      <ConsentRoot />
    </div>
  );
}
