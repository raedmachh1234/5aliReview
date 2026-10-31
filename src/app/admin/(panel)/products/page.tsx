import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { ProductTable } from "@/components/admin/product-table";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { requireAdmin } from "@/server/auth/session";
import { getAllProducts, getSettings } from "@/server/catalog";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const [{ deleted }, products, settings] = await Promise.all([searchParams, getAllProducts(), getSettings()]);
  return (
    <>
      <PageHeader
        title="Products"
        description="Add, edit and organise everything you sell."
        actions={
          <ButtonLink href="/admin/products/new" variant="accent">
            <Icon name="plus" size={18} />
            Add product
          </ButtonLink>
        }
      />
      <ProductTable products={products} currency={settings.currency} flash={deleted ? "Product deleted." : null} />
    </>
  );
}
