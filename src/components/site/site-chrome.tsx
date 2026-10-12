import Link from "next/link";
import { headers } from "next/headers";
import { company } from "@/config/company";
import { fmt, locales, PATH_HEADER } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getSessionUser } from "@/server/auth/session";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { CookieSettingsLink } from "@/components/consent/cookie-consent";
import { MobileMenu } from "./mobile-menu";

async function currentPath(): Promise<string> {
  // Set by src/proxy.ts so the language switcher returns to the same page.
  const url = (await headers()).get(PATH_HEADER) || "/";
  return url.startsWith("/") ? url : "/";
}

export async function LanguageSwitcher({ className }: { className?: string }) {
  const [{ locale, t }, path] = await Promise.all([getI18n(), currentPath()]);
  return (
    <nav aria-label={t.common.language} className={className}>
      <ul className="flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5">
        {locales.map((l) => (
          <li key={l}>
            <a
              href={`/lang/${l}?next=${encodeURIComponent(path)}`}
              lang={l}
              hrefLang={l}
              aria-current={l === locale ? "true" : undefined}
              className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-ink-2 uppercase hover:bg-subtle aria-[current=true]:bg-pine aria-[current=true]:text-white"
            >
              <span aria-hidden="true">{l}</span>
              <span className="sr-only">{t.common.languages[l]}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function SiteHeader() {
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  const links = [
    { href: "/#how-it-works", label: t.common.nav.howItWorks },
    { href: "/pricing", label: t.common.nav.pricing },
    { href: "/faq", label: t.common.nav.faq },
    { href: "/contact", label: t.common.nav.contact },
  ];
  const account = user ? (
    <ButtonLink href={user.isPlatformAdmin ? "/admin" : "/dashboard"} variant="secondary" size="sm">
      {user.isPlatformAdmin ? t.common.admin : t.common.dashboard}
    </ButtonLink>
  ) : (
    <ButtonLink href="/login" variant="ghost" size="sm">
      {t.common.signIn}
    </ButtonLink>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={t.common.homeLink} className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label={t.common.menu} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-10 items-center rounded-lg px-3 text-[0.95rem] font-medium text-ink-2 hover:bg-subtle hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          {account}
          <ButtonLink href="/contact" size="sm">
            {t.common.requestDemo}
          </ButtonLink>
        </div>
        <MobileMenu openLabel={t.common.openMenu} closeLabel={t.common.closeMenu}>
          <nav aria-label={t.common.menu}>
            <ul className="divide-y divide-line">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-12 items-center text-base font-semibold text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {account}
            <ButtonLink href="/contact" size="sm">
              {t.common.requestDemo}
            </ButtonLink>
          </div>
          <LanguageSwitcher className="mt-4" />
        </MobileMenu>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const { t } = await getI18n();
  const year = new Date().getFullYear();
  const linkCls = "inline-flex min-h-8 items-center text-ink-2 hover:text-ink hover:underline underline-offset-4";
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-2">{t.common.footer.tagline}</p>
          <p className="mt-4 text-sm text-ink-2">
            <a href={`mailto:${company.contactEmail}`} className="underline underline-offset-4 hover:text-ink">
              {company.contactEmail}
            </a>
          </p>
        </div>
        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="text-sm font-bold text-ink">
            {t.common.footer.product}
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li><Link className={linkCls} href="/#how-it-works">{t.common.nav.howItWorks}</Link></li>
            <li><Link className={linkCls} href="/pricing">{t.common.nav.pricing}</Link></li>
            <li><Link className={linkCls} href="/faq">{t.common.nav.faq}</Link></li>
            <li><Link className={linkCls} href="/contact">{t.common.nav.contact}</Link></li>
            <li><Link className={linkCls} href="/login">{t.common.signIn}</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="text-sm font-bold text-ink">
            {t.common.footer.legal}
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li><Link className={linkCls} href="/legal/privacy">{t.common.footer.privacy}</Link></li>
            <li><Link className={linkCls} href="/legal/terms">{t.common.footer.terms}</Link></li>
            <li><Link className={linkCls} href="/legal/refunds">{t.common.footer.refunds}</Link></li>
            <li><Link className={linkCls} href="/legal/cookies">{t.common.footer.cookies}</Link></li>
            <li><Link className={linkCls} href="/legal/subprocessors">{t.common.footer.subprocessors}</Link></li>
            <li><CookieSettingsLink className={linkCls} label={t.common.footer.cookieSettings} /></li>
            <li><Link className={linkCls} href="/data-deletion">{t.common.footer.dataDeletion}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-xs text-muted sm:px-6">
          <p>{fmt(t.common.footer.rights, { year, company: company.legalName })}</p>
          <p>{t.common.footer.googleTrademark}</p>
        </div>
      </div>
    </footer>
  );
}

export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only-focusable fixed start-3 top-3 z-50 rounded-lg bg-ink px-4 py-2 font-semibold text-white"
    >
      {label}
    </a>
  );
}
