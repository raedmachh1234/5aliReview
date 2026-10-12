import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getSessionUser } from "@/server/auth/session";
import { SignupForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/surface";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.signupTitle, alternates: { canonical: "/signup" } };
}

export default async function SignupPage() {
  const { t } = await getI18n();
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t.auth.signupTitle}</h1>
      <p className="mt-2 text-ink-2">{t.auth.signupLead}</p>
      <Card className="mt-8 p-6 sm:p-8">
        <SignupForm t={{ auth: t.auth, validation: t.validation, errors: t.errors, common: t.common }} />
      </Card>
      <p className="mt-6 text-center text-ink-2">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-pine underline underline-offset-4">
          {t.common.signIn}
        </Link>
      </p>
    </div>
  );
}
