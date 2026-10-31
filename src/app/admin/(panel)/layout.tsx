import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/nav";
import { BrandMark } from "@/components/store/brand";
import { Icon } from "@/components/ui/icon";
import { logout } from "@/server/actions/auth";
import { requireAdmin } from "@/server/auth/session";
import { getSettings } from "@/server/catalog";
import { getStore } from "@/server/store";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const settings = await getSettings();
  const storage = getStore().kind === "supabase" ? "Supabase" : "Local file";

  const footer = (
    <div className="space-y-1">
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2/60 hover:text-ink"
      >
        <Icon name="store" size={18} />
        View store
        <Icon name="arrowUpRight" size={14} className="ms-auto" />
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-2/60 hover:text-ink"
        >
          <Icon name="logout" size={18} />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="hidden border-e border-line bg-surface lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col">
          <div className="flex items-center gap-3 px-5 pt-6 pb-8">
            <BrandMark name={settings.storeName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{settings.storeName}</p>
              <p className="text-xs text-muted">Store admin</p>
            </div>
          </div>
          <nav aria-label="Admin" className="flex-1 px-3">
            <AdminNav orientation="vertical" />
          </nav>
          <div className="border-t border-line px-3 py-4">
            {footer}
            <p className="mt-3 px-3 text-[0.7rem] text-muted">Storage: {storage}</p>
          </div>
        </aside>
      </div>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <BrandMark name={settings.storeName} className="size-7 text-base" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{settings.storeName}</p>
            <Link href="/" target="_blank" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
              <Icon name="store" size={18} title="View store" />
            </Link>
            <form action={logout}>
              <button type="submit" className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
                <Icon name="logout" size={18} title="Sign out" />
              </button>
            </form>
          </div>
          <nav aria-label="Admin" className="px-2 pb-2">
            <AdminNav orientation="horizontal" />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
