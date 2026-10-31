import Link from "next/link";
import type { StoreSettings } from "@/lib/types";
import { Brand } from "./brand";

/** A quiet bar: the logo, two links and one way to reach the store. No menus to open. */
export function StoreHeader({ settings, hasContact }: { settings: StoreSettings; hasContact: boolean }) {
  const navLink = "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition hover:text-ink";

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm text-bg focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        Skip to content
      </a>
      {settings.announcement ? (
        <p className="bg-accent-soft px-4 py-2 text-center text-sm font-medium text-accent-text">{settings.announcement}</p>
      ) : null}
      <header className="glass-bar sticky top-0 z-40">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Brand name={settings.storeName} />
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              <li>
                <Link href="/products" className={navLink}>
                  Products
                </Link>
              </li>
              <li className="hidden sm:block">
                <Link href="/#how-it-works" className={navLink}>
                  How it works
                </Link>
              </li>
              {hasContact ? (
                <li className="ms-1">
                  <Link
                    href="/#contact"
                    className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-medium whitespace-nowrap text-accent-contrast transition hover:brightness-110 active:scale-[0.97]"
                  >
                    Contact us
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
