import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { company } from "@/config/company";
import { getRepository } from "@/server/data";
import { Alert, Card } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { logger } from "@/server/security/logger";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.unsubscribeTitle, robots: { index: false, follow: false } };
}

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Requirement #18. Opening the link shows a single "Unsubscribe" button (GET
 * must not change state, because email scanners prefetch links). Mail
 * clients can also use one-click POST via List-Unsubscribe-Post → /api/unsubscribe.
 */
export default async function UnsubscribePage(props: PageProps<"/unsubscribe">) {
  const { t } = await getI18n();
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" && TOKEN.test(sp.token) ? sp.token : null;
  const done = sp.done === "1";

  async function unsubscribe(formData: FormData) {
    "use server";
    const raw = String(formData.get("token") ?? "");
    const { redirect } = await import("next/navigation");
    if (!TOKEN.test(raw)) redirect("/unsubscribe?invalid=1");
    let ok = false;
    try {
      const repo = await getRepository();
      ok = await repo.unsubscribe(createHash("sha256").update(raw).digest("hex"));
    } catch (err) {
      logger.error("unsubscribe_failed", err);
    }
    redirect(ok ? "/unsubscribe?done=1" : "/unsubscribe?invalid=1");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <Card className="p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t.unsubscribe.title}</h1>
        {done ? (
          <Alert tone="success" role="status" className="mt-6">
            {t.unsubscribe.done}
          </Alert>
        ) : token ? (
          <form action={unsubscribe} className="mt-6 space-y-5">
            <input type="hidden" name="token" value={token} />
            <h2 className="text-lg font-bold text-ink">{t.unsubscribe.confirmTitle}</h2>
            <p className="text-ink-2">{t.unsubscribe.confirmBody}</p>
            <Button type="submit" size="lg">
              {t.unsubscribe.button}
            </Button>
          </form>
        ) : (
          <Alert tone="warn" className="mt-6">
            {fmt(t.unsubscribe.invalid, { email: company.privacyEmail })}
          </Alert>
        )}
      </Card>
    </div>
  );
}
