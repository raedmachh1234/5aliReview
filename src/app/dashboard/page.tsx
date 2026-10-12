import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/guards";
import { getRepository } from "@/server/data";
import { signOut } from "@/server/actions/auth";
import { EmptyState } from "@/components/ui/surface";
import { ButtonLink, Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Entry point: sends the user to their (first) business, or explains why there is none. */
export default async function DashboardIndex() {
  const user = await requireUser("/dashboard");
  const repo = await getRepository();
  const memberships = await repo.listMemberships(user);
  if (memberships.length > 0) redirect(`/dashboard/${memberships[0].business.id}`);
  if (user.isPlatformAdmin) redirect("/admin");

  const { t } = await getI18n();
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4">
      <Logo />
      <div className="mt-8 w-full rounded-card border border-line bg-surface">
        <EmptyState icon="building" title={t.dashboard.noBusinessTitle} action={<ButtonLink href="/contact">{t.common.nav.contact}</ButtonLink>}>
          {t.dashboard.noBusinessBody}
        </EmptyState>
      </div>
      <form action={signOut} className="mt-4">
        <Button type="submit" variant="ghost">
          {t.common.signOut}
        </Button>
      </form>
    </main>
  );
}
