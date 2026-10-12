import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { getSessionUser } from "@/server/auth/session";
import { isDemoMode } from "@/server/env";
import { LoginForm } from "@/components/forms/auth-forms";
import { Alert, Card } from "@/components/ui/surface";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.loginTitle, robots: { index: false, follow: true } };
}

export default async function LoginPage(props: PageProps<"/login">) {
  const { t } = await getI18n();
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const user = await getSessionUser();
  if (user) redirect(user.isPlatformAdmin ? "/admin" : "/dashboard");

  let demoAccounts: readonly { email: string; label: string }[] = [];
  let demoPassword = "";
  if (isDemoMode) {
    const seed = await import("@/server/data/demo/seed");
    demoAccounts = seed.DEMO_ACCOUNTS;
    demoPassword = seed.DEMO_PASSWORD;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-ink-2">{t.auth.loginLead}</p>
      {sp.signedOut ? (
        <Alert tone="success" role="status" className="mt-6">
          {t.auth.signedOut}
        </Alert>
      ) : null}
      <Card className="mt-8 p-6 sm:p-8">
        <LoginForm t={{ auth: t.auth, validation: t.validation, errors: t.errors, common: t.common }} next={next} />
      </Card>
      <p className="mt-6 text-center text-ink-2">
        {t.auth.noAccount}{" "}
        <Link href="/signup" className="font-semibold text-pine underline underline-offset-4">
          {t.auth.createAccount}
        </Link>
      </p>

      {isDemoMode ? (
        <section aria-labelledby="demo-accounts" className="mt-10 rounded-2xl border border-warn/30 bg-warn-soft p-5 text-sm">
          <h2 id="demo-accounts" className="font-bold text-ink">
            {t.auth.demoAccounts}
          </h2>
          <p className="mt-1 text-ink-2">{t.common.demoMode}</p>
          <ul className="mt-3 space-y-1.5">
            {demoAccounts.map((a) => (
              <li key={a.email} className="flex flex-wrap justify-between gap-x-3">
                <code className="font-semibold text-ink">{a.email}</code>
                <span className="text-ink-2">{a.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-ink-2">{fmt(t.auth.demoPassword, { password: demoPassword })}</p>
        </section>
      ) : null}
    </div>
  );
}
