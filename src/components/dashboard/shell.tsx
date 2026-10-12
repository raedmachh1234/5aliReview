"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Exact match only (for the overview link). */
  exact?: boolean;
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const current = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink",
                "aria-[current=page]:bg-pine-soft aria-[current=page]:font-bold aria-[current=page]:text-pine",
              )}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Responsive app shell. Desktop: fixed sidebar. Mobile/tablet: a native
 * <dialog> drawer — the browser traps focus, Escape closes it, and focus
 * returns to the menu button.
 */
export function DashboardShell({
  brand,
  top,
  sidebarFooter,
  nav,
  navLabel,
  openLabel,
  closeLabel,
  banner,
  children,
}: {
  brand: ReactNode;
  top: ReactNode;
  sidebarFooter?: ReactNode;
  nav: NavItem[];
  navLabel: string;
  openLabel: string;
  closeLabel: string;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const close = () => drawer.current?.close();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      {/* The outer column carries the background for the full page height; the inner panel stays in view. */}
      <div className="hidden border-e border-line bg-surface lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col">
          <div className="flex h-16 items-center px-5">{brand}</div>
          <nav aria-label={navLabel} className="flex-1 overflow-y-auto px-3 py-2">
            <NavList items={nav} />
          </nav>
          {sidebarFooter ? <div className="border-t border-line p-3">{sidebarFooter}</div> : null}
        </aside>
      </div>

      <dialog
        ref={drawer}
        aria-label={navLabel}
        className="m-0 h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50 lg:hidden ltr:mr-auto rtl:ml-auto"
      >
        <div className="flex h-16 items-center justify-between px-4">
          {brand}
          <button type="button" onClick={close} className="grid size-11 place-items-center rounded-xl hover:bg-subtle">
            <Icon name="x" title={closeLabel} />
          </button>
        </div>
        <nav className="px-3 py-2">
          <NavList items={nav} onNavigate={close} />
        </nav>
        {sidebarFooter ? <div className="border-t border-line p-3">{sidebarFooter}</div> : null}
      </dialog>

      <div className="min-w-0">
        {banner}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => drawer.current?.showModal()}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface lg:hidden"
          >
            <Icon name="menu" title={openLabel} />
          </button>
          {top}
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
