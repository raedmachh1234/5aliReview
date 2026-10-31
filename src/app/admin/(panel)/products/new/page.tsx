import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/server/auth/session";
import { getAllProducts, getSettings } from "@/server/catalog";
import { getSiteUrl } from "@/server/site";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const [products, settings, siteUrl] = await Promise.all([getAllProducts(), getSettings(), getSiteUrl()]);
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  return <ProductForm currency={settings.currency} categories={categories} storeName={settings.storeName} siteUrl={siteUrl} />;
}
