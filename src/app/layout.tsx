import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { splitKeywords } from "@/lib/business";
import { DEFAULT_ACCENT, isHexColor, readableTextOn } from "@/lib/contrast";
import { getSettings } from "@/server/catalog";
import { env } from "@/server/env";
import { getSiteUrl } from "@/server/site";
import "./globals.css";

// OFL-licensed and self-hosted by next/font at build time. Apple devices use their system font
// instead (see globals.css); the optical-size axis gives Inter the same display/text tuning.
const body = Inter({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [settings, siteUrl] = await Promise.all([getSettings(), getSiteUrl()]);
  // Set in Admin → Settings → Search engines, or with GOOGLE_SITE_VERIFICATION.
  const google = settings.googleSiteVerification || env.GOOGLE_SITE_VERIFICATION;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: settings.storeName, template: `%s · ${settings.storeName}` },
    description: settings.tagline,
    applicationName: settings.storeName,
    // Google ignores this tag (it ranks on page text); some other search engines still read it.
    keywords: splitKeywords(settings.seoKeywords),
    openGraph: { type: "website", siteName: settings.storeName, title: settings.storeName, description: settings.tagline },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false, email: false, address: false },
    // Admin pages override this with noindex.
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    ...(google ? { verification: { google } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c131c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { accentColor } = await getSettings();
  const accent = isHexColor(accentColor) ? accentColor : DEFAULT_ACCENT;
  const style = { "--accent": accent, "--accent-contrast": readableTextOn(accent) } as CSSProperties;
  return (
    <html lang="en" className={`${body.variable} h-full`} style={style}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
