import { getI18n } from "@/i18n/server";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/brand/logo";

/** Shown for unknown, suspended or deleted businesses and inactive cards. */
export default async function BusinessUnavailable() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-subtle text-ink-2">
        <Icon name="info" size={28} />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t.customer.unavailableTitle}</h1>
      <p className="mt-2 text-ink-2">{t.customer.unavailableBody}</p>
      <p className="mt-10 inline-flex items-center gap-1.5 text-sm text-muted">
        <LogoMark size={16} />
        5ali Review
      </p>
    </main>
  );
}
