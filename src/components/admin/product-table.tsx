"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useOptimistic, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatPrice, stockLevel } from "@/lib/format";
import { idleState, type Product } from "@/lib/types";
import { deleteProduct, duplicateProduct, setProductFlag } from "@/server/actions/products";
import { ConfirmDialog } from "./confirm-dialog";
import { SubmitButton } from "./submit-button";
import { Toast } from "./toast";

type StatusFilter = "all" | "published" | "draft";

function matches(product: Product, query: string) {
  const q = query.trim().toLowerCase();
  return !q || [product.name, product.sku, product.category, ...product.tags].some((f) => f.toLowerCase().includes(q));
}

export function ProductTable({ products, currency, flash }: { products: Product[]; currency: string; flash?: string | null }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("");
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleteState, deleteAction] = useActionState(async (prev: Parameters<typeof deleteProduct>[0], formData: FormData) => {
    const result = await deleteProduct(prev, formData);
    setToDelete(null);
    return result;
  }, idleState);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);
  const counts = {
    all: products.length,
    published: products.filter((p) => p.status === "published").length,
    draft: products.filter((p) => p.status === "draft").length,
  };
  const visible = products.filter(
    (p) => (status === "all" || p.status === status) && (!category || p.category === category) && matches(p, query),
  );

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "published", label: "Live" },
    { value: "draft", label: "Drafts" },
  ];

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="inline-flex w-fit rounded-full border border-line bg-surface p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition",
                status === tab.value ? "bg-ink text-bg shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {tab.label}
              <span className="text-xs opacity-60 tabular">{counts[tab.value]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {categories.length > 0 ? (
            <div className="relative">
              <label htmlFor="category-filter" className="sr-only">
                Filter by category
              </label>
              <select
                id="category-filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full appearance-none rounded-full border border-line bg-surface ps-4 pe-10 text-sm text-ink focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none sm:w-48"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={16} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          ) : null}
          <div className="relative sm:w-72">
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <Icon name="search" size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="product-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, tag…"
              className="h-10 w-full rounded-full border border-line bg-surface ps-10 pe-4 text-sm text-ink placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-surface">
        {visible.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/50 text-start text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium sm:px-5">
                  Product
                </th>
                <th scope="col" className="hidden px-3 py-3 text-start font-medium lg:table-cell">
                  Category
                </th>
                <th scope="col" className="hidden px-3 py-3 text-end font-medium md:table-cell">
                  Price
                </th>
                <th scope="col" className="hidden px-3 py-3 text-start font-medium md:table-cell">
                  Stock
                </th>
                <th scope="col" className="px-3 py-3 text-start font-medium">
                  Live
                </th>
                <th scope="col" className="hidden px-3 py-3 text-center font-medium sm:table-cell">
                  Featured
                </th>
                <th scope="col" className="px-4 py-3 sm:px-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((product) => (
                <Row key={product.id} product={product} currency={currency} onDelete={() => setToDelete(product)} />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center">
            <Icon name={products.length === 0 ? "box" : "search"} size={30} className="mx-auto text-muted" />
            <p className="mt-3 font-medium">{products.length === 0 ? "No products yet" : "No products match these filters"}</p>
            <p className="mt-1 text-sm text-muted">
              {products.length === 0 ? "Add your first product to start your catalogue." : "Try another search or clear the filters."}
            </p>
            {products.length === 0 ? (
              <ButtonLink href="/admin/products/new" variant="accent" size="sm" className="mt-5">
                <Icon name="plus" size={16} />
                Add product
              </ButtonLink>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setCategory("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description="The product and its uploaded photos will be removed permanently. This can’t be undone."
      >
        <Button variant="secondary" onClick={() => setToDelete(null)}>
          Cancel
        </Button>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={toDelete?.id ?? ""} />
          <SubmitButton variant="destructive" className="w-full" pendingLabel="Deleting…">
            Delete product
          </SubmitButton>
        </form>
      </ConfirmDialog>

      <Toast state={deleteState} flash={flash} />
    </>
  );
}

function Row({ product, currency, onDelete }: { product: Product; currency: string; onDelete: () => void }) {
  const [optimistic, setOptimistic] = useOptimistic(product, (current, patch: Partial<Product>) => ({ ...current, ...patch }));
  const live = optimistic.status === "published";
  const level = stockLevel(optimistic.stock);

  return (
    <tr className="group transition-colors hover:bg-surface-2/40">
      {/* w-full + max-w-0 lets this column take the free space and truncate long names. */}
      <td className="w-full max-w-0 px-4 py-3 sm:px-5">
        <Link href={`/admin/products/${product.id}`} className="flex min-w-0 items-center gap-3.5 rounded-xl">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line ring-inset">
            {product.images[0] ? (
              <Image src={product.images[0]} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <Icon name="image" size={18} className="absolute inset-0 m-auto text-muted" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink group-hover:underline group-hover:underline-offset-4">{product.name}</span>
            <span className="block truncate text-xs text-muted">
              <span className="md:hidden">{formatPrice(product.price, currency)} · </span>
              {product.sku || `/${product.slug}`}
            </span>
          </span>
        </Link>
      </td>
      <td className="hidden px-3 py-3 text-ink-2 lg:table-cell">{product.category || <span className="text-muted">—</span>}</td>
      <td className="hidden px-3 py-3 text-end whitespace-nowrap tabular md:table-cell">
        <span className="font-medium">{formatPrice(product.price, currency)}</span>
        {product.compareAtPrice ? <s className="ms-1.5 block text-xs text-muted">{formatPrice(product.compareAtPrice, currency)}</s> : null}
      </td>
      <td className="hidden px-3 py-3 whitespace-nowrap md:table-cell">
        {level === "untracked" ? (
          <span className="text-xs text-muted">Not tracked</span>
        ) : (
          <Badge tone={level === "out" ? "danger" : level === "low" ? "warn" : "neutral"} dot={level !== "in"}>
            {level === "out" ? "Sold out" : level === "low" ? `${optimistic.stock} left` : `${optimistic.stock} in stock`}
          </Badge>
        )}
      </td>
      <td className="px-3 py-3">
        <form
          action={async (formData) => {
            setOptimistic({ status: live ? "draft" : "published" });
            await setProductFlag(formData);
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="field" value="status" />
          <input type="hidden" name="value" value={String(!live)} />
          <button
            type="submit"
            role="switch"
            aria-checked={live}
            aria-label={`Show ${product.name} in the store`}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
              live ? "bg-success" : "bg-surface-3",
            )}
          >
            <span
              className={cn(
                "inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft",
                live ? "translate-x-5.5" : "translate-x-0.5",
              )}
            />
          </button>
        </form>
      </td>
      <td className="hidden px-3 py-3 text-center sm:table-cell">
        <form
          action={async (formData) => {
            setOptimistic({ featured: !optimistic.featured });
            await setProductFlag(formData);
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="field" value="featured" />
          <input type="hidden" name="value" value={String(!optimistic.featured)} />
          <button
            type="submit"
            aria-pressed={optimistic.featured}
            className={cn(
              "grid size-9 place-items-center rounded-full transition hover:bg-surface-2",
              optimistic.featured ? "text-amber-600 dark:text-amber-400" : "text-line-strong hover:text-muted",
            )}
          >
            <Icon name={optimistic.featured ? "star" : "starOutline"} size={18} title={`Feature ${product.name} on the homepage`} />
          </button>
        </form>
      </td>
      <td className="px-4 py-3 sm:px-5">
        <div className="flex items-center justify-end gap-0.5">
          <Link
            href={`/admin/products/${product.id}`}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="edit" size={17} title={`Edit ${product.name}`} />
          </Link>
          {product.status === "published" ? (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="hidden size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink sm:grid"
            >
              <Icon name="external" size={17} title={`View ${product.name} in the store`} />
            </Link>
          ) : (
            <span aria-hidden="true" className="hidden size-9 sm:block" />
          )}
          <form action={duplicateProduct} className="hidden sm:block">
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink">
              <Icon name="copy" size={17} title={`Duplicate ${product.name}`} />
            </button>
          </form>
          <button
            type="button"
            onClick={onDelete}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Icon name="trash" size={17} title={`Delete ${product.name}`} />
          </button>
        </div>
      </td>
    </tr>
  );
}
