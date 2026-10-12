import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
import { siteConfig } from "@/config/site";
import { dirOf } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import "./globals.css";

// Both fonts are SIL Open Font License 1.1 and are self-hosted by next/font at
// build time — no request is made to Google Fonts from the visitor's browser.
const latin = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-latin", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: t.meta.homeTitle, template: `%s · ${siteConfig.name}` },
    description: t.meta.homeDescription,
    applicationName: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: t.meta.homeTitle,
      description: t.meta.homeDescription,
      url: "/",
    },
    twitter: { card: "summary_large_image", title: t.meta.homeTitle, description: t.meta.homeDescription },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} dir={dirOf(locale)} className={`${latin.variable} ${arabic.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
