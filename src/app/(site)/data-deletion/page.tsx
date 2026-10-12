import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { DeletionForm } from "@/components/forms/deletion-form";
import { Alert, Card } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.deletionTitle, description: t.meta.deletionDescription, alternates: { canonical: "/data-deletion" } };
}

/** Requirement #20 — deletion is easy to find (footer link) and explains what is and isn't deleted. */
export default async function DataDeletionPage() {
  const { t } = await getI18n();
  const d = t.deletion;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">{d.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">{d.lead}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <section aria-labelledby="deleted-title">
            <h2 id="deleted-title" className="text-lg font-bold text-ink">{d.whatDeleted}</h2>
            <ul className="mt-3 space-y-2 text-ink-2">
              {d.whatDeletedList.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="trash" size={18} className="mt-0.5 shrink-0 text-muted" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="kept-title">
            <h2 id="kept-title" className="text-lg font-bold text-ink">{d.whatKept}</h2>
            <ul className="mt-3 space-y-2 text-ink-2">
              {d.whatKeptList.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-muted" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <p className="text-ink-2">{d.timeline}</p>
          <Alert tone="neutral">{d.customerNote}</Alert>
          <p className="text-sm text-ink-2">
            <Link href="/login?next=/dashboard" className="font-semibold text-pine underline underline-offset-4">
              {d.signedInHint}
            </Link>
          </p>
        </div>
        <Card className="h-fit p-6 sm:p-8">
          <DeletionForm t={{ deletion: d, validation: t.validation, errors: t.errors, common: t.common }} />
        </Card>
      </div>
    </div>
  );
}
