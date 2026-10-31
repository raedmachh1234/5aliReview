import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/server/auth/session";
import { getAllProducts, getSettings } from "@/server/catalog";
import { env } from "@/server/env";
import { configuredSiteUrl, getSiteUrl } from "@/server/site";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, siteUrl, products] = await Promise.all([getSettings(), getSiteUrl(), getAllProducts()]);
  // Text Google can read on product pages, for the keyword check.
  const catalogText = products
    .filter((p) => p.status === "published")
    .map((p) => [p.name, p.tagline, p.description, p.category, p.seoTitle, p.seoDescription, ...p.tags].join(" "))
    .join(" ");
  return (
    <>
      <PageHeader title="Store settings" description="Your store’s name, homepage, contact details, location for Google Maps, and Google search setup." />
      <SettingsForm
        settings={settings}
        seo={{ siteUrl, siteUrlConfigured: configuredSiteUrl() !== null, envVerification: Boolean(env.GOOGLE_SITE_VERIFICATION) }}
        catalogText={catalogText}
      />
    </>
  );
}
