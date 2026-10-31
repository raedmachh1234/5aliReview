import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { Splash } from "@/components/store/splash";
import { contactLinks } from "@/lib/contact";
import { getSettings } from "@/server/catalog";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const contacts = contactLinks(settings);
  return (
    <div className="flex min-h-dvh flex-col">
      <Splash />
      <StoreHeader
        settings={settings}
        hasContact={contacts.length > 0 || Boolean(settings.address || settings.googleMapsUrl || settings.googleReviewUrl)}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <StoreFooter settings={settings} contacts={contacts} />
    </div>
  );
}
