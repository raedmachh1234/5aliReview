import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { BrandMark } from "@/components/store/brand";
import { Icon } from "@/components/ui/icon";
import { isAdmin } from "@/server/auth/session";
import { isUsingDevPassword, resolveAdminCredentials } from "@/server/auth/token";
import { getSettings } from "@/server/catalog";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const { next } = await searchParams;
  const settings = await getSettings();
  const locked = !resolveAdminCredentials();

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center text-center">
          <BrandMark name={settings.storeName} className="size-12 text-2xl" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to manage {settings.storeName}.</p>
        </div>

        <div className="mt-8 rounded-3xl border border-line bg-surface/90 p-6 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.3)] backdrop-blur sm:p-7">
          {locked ? (
            <div className="flex gap-3 text-sm">
              <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-warn" />
              <p className="text-ink-2">
                The admin area is locked. Set <code className="font-mono text-xs">ADMIN_PASSWORD</code> and{" "}
                <code className="font-mono text-xs">SESSION_SECRET</code> in the server environment, then restart.
              </p>
            </div>
          ) : (
            <LoginForm next={typeof next === "string" ? next : "/admin"} />
          )}
        </div>

        {isUsingDevPassword() ? (
          <p className="mt-4 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-xs leading-relaxed text-warn">
            Development mode: the password is <strong>admin</strong>. Set <code className="font-mono">ADMIN_PASSWORD</code> in{" "}
            <code className="font-mono">.env.local</code> to change it.
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted transition hover:text-ink">
            <Icon name="arrowLeft" size={15} />
            Back to the store
          </Link>
        </p>
      </div>
    </main>
  );
}
