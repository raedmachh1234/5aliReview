import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/server/auth/session";
import { getAllProducts, getSettings } from "@/server/catalog";
import { getSiteUrl } from "@/server/site";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const [{ id }, { created }, products, settings, siteUrl] = await Promise.all([
    params,
    searchParams,
    getAllProducts(),
    getSettings(),
    getSiteUrl(),
  ]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  return (
    <ProductForm
      key={product.id}
      product={product}
      currency={settings.currency}
      categories={categories}
      flash={created ? "Product created." : null}
      storeName={settings.storeName}
      siteUrl={siteUrl}
    />
  );
}
