import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatDate, formatPrice, stockLevel } from "@/lib/format";
import type { Product } from "@/lib/types";
import { requireAdmin } from "@/server/auth/session";
import { getAllProducts, getSettings } from "@/server/catalog";

export const metadata: Metadata = { title: "Overview" };

function Thumb({ product }: { product: Product }) {
  return (
    <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line ring-inset">
      {product.images[0] ? (
        <Image src={product.images[0]} alt="" fill sizes="44px" className="object-cover" />
      ) : (
        <Icon name="image" size={16} className="absolute inset-0 m-auto text-muted" />
      )}
    </span>
  );
}

function StatTile({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: IconName }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between text-muted">
        <p className="text-sm">{label}</p>
        <Icon name={icon} size={18} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value.toLocaleString("en")}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

export default async function OverviewPage() {
  await requireAdmin();
  const [products, settings] = await Promise.all([getAllProducts(), getSettings()]);

  const live = products.filter((p) => p.status === "published");
  const drafts = products.length - live.length;
  const low = products.filter((p) => stockLevel(p.stock) === "low");
  const out = products.filter((p) => stockLevel(p.stock) === "out");
  const tracked = products.filter((p) => p.stock !== null);
  const inventoryValue = tracked.reduce((sum, p) => sum + p.price * (p.stock ?? 0), 0);

  const counts = new Map<string, number>();
  for (const p of products) {
    const name = p.category || "Uncategorised";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const categories = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCategory = Math.max(1, ...categories.map(([, n]) => n));

  const attention: { product: Product; reason: string; tone: "warn" | "danger" | "neutral"; icon: IconName }[] = [
    ...out.filter((p) => p.status === "published").map((p) => ({ product: p, reason: "Sold out", tone: "danger" as const, icon: "alert" as const })),
    ...low.map((p) => ({ product: p, reason: `${p.stock} left`, tone: "warn" as const, icon: "alert" as const })),
    ...live.filter((p) => p.images.length === 0).map((p) => ({ product: p, reason: "No photo", tone: "neutral" as const, icon: "image" as const })),
  ].slice(0, 6);

  const recent = [...products].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Here’s how ${settings.storeName} looks today.`}
        actions={
          <ButtonLink href="/admin/products/new" variant="accent">
            <Icon name="plus" size={18} />
            Add product
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Products" value={products.length} detail={`${live.length} live · ${drafts} draft${drafts === 1 ? "" : "s"}`} icon="box" />
        <StatTile label="Featured" value={products.filter((p) => p.featured).length} detail="Shown on the homepage" icon="star" />
        <StatTile label="Low stock" value={low.length} detail="5 or fewer left" icon="alert" />
        <StatTile label="Sold out" value={out.length} detail="Stock at zero" icon="layers" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card title="Inventory value" description="Price × stock, for products where stock is tracked.">
          <p className="text-5xl font-semibold tracking-[-0.04em]">{formatPrice(inventoryValue, settings.currency)}</p>
          <p className="mt-2 text-sm text-muted">
            Across {tracked.length} of {products.length} products
          </p>
        </Card>

        <Card title="Products by category">
          {categories.length > 0 ? (
            <ul className="space-y-3">
              {categories.map(([name, count]) => (
                <li key={name} className="group" title={`${name}: ${count} ${count === 1 ? "product" : "products"}`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink-2 group-hover:text-ink">{name}</span>
                    <span className="font-medium tabular">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-accent-soft">
                    <div className="h-full rounded-full bg-accent transition-[filter] group-hover:brightness-110" style={{ width: `${(count / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No products yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Needs attention" description="Live products that are sold out, running low or missing a photo.">
          {attention.length > 0 ? (
            <ul className="-mx-2 divide-y divide-line">
              {attention.map(({ product, reason, tone, icon }) => (
                <li key={`${product.id}-${reason}`}>
                  <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-surface-2">
                    <Thumb product={product} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span>
                    <Badge tone={tone}>
                      <Icon name={icon} size={12} />
                      {reason}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Icon name="checkCircle" size={18} className="text-success" />
              Everything looks good.
            </p>
          )}
        </Card>

        <Card title="Recently updated">
          {recent.length > 0 ? (
            <ul className="-mx-2 divide-y divide-line">
              {recent.map((product) => (
                <li key={product.id}>
                  <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-surface-2">
                    <Thumb product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="text-xs text-muted">{formatDate(product.updatedAt)}</span>
                    </span>
                    <span className="text-sm font-medium tabular">{formatPrice(product.price, settings.currency)}</span>
                    {product.status === "draft" ? <Badge>Draft</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted">
              <p>You haven’t added any products yet.</p>
              <ButtonLink href="/admin/products/new" variant="secondary" size="sm" className="mt-4">
                Add your first product
              </ButtonLink>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
