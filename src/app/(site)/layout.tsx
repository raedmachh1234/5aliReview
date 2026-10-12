import { getI18n } from "@/i18n/server";
import { ConsentRoot } from "@/components/consent/consent-root";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site/site-chrome";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <>
      <SkipLink label={t.common.skipToContent} />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <ConsentRoot />
    </>
  );
}
