import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-10 text-sm font-bold tracking-widest text-muted">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{t.errors.notFoundTitle}</h1>
      <p className="mt-2 text-ink-2">{t.errors.notFoundBody}</p>
      <Link href="/" className={buttonClass("primary", "md", "mt-8")}>
        {t.errors.goHome}
      </Link>
    </main>
  );
}
