"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ProductCard } from "@/components/store/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AffixInput, controlClass, Field, TextArea, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { discountPercent } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { idleState, type Product, type ProductSpec } from "@/lib/types";
import { LIMITS } from "@/lib/validation";
import { deleteProduct, saveProduct, type SaveProductState } from "@/server/actions/products";
import { Card } from "./page-header";
import { ConfirmDialog } from "./confirm-dialog";
import { ImageManager } from "./image-manager";
import { SpecsEditor } from "./specs-editor";
import { SubmitButton } from "./submit-button";
import { TagInput } from "./tag-input";
import { CharCount, SearchPreview } from "./search-preview";
import { Toast } from "./toast";

interface Values {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  trackStock: boolean;
  stock: string;
  category: string;
  tags: string[];
  images: string[];
  specs: ProductSpec[];
  status: Product["status"];
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
}

function valuesFrom(product?: Product): Values {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    tagline: product?.tagline ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    compareAtPrice: product?.compareAtPrice != null ? String(product.compareAtPrice) : "",
    sku: product?.sku ?? "",
    trackStock: product ? product.stock !== null : true,
    stock: product?.stock != null ? String(product.stock) : "0",
    category: product?.category ?? "",
    tags: product?.tags ?? [],
    images: product?.images ?? [],
    specs: product?.specs ?? [],
    status: product?.status ?? "published",
    featured: product?.featured ?? false,
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
  };
}

const amount = (raw: string) => {
  const n = Number(raw.replace(",", "."));
  return raw.trim() && Number.isFinite(n) ? n : null;
};

export function ProductForm({
  product,
  currency,
  categories,
  flash,
  storeName,
  siteUrl,
}: {
  product?: Product;
  currency: string;
  categories: string[];
  flash?: string | null;
  /** For the Google result preview. */
  storeName: string;
  siteUrl: string;
}) {
  const [values, setValues] = useState(() => valuesFrom(product));
  // New products follow the name until the URL is edited by hand; existing URLs never change on their own.
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [state, formAction, saving] = useActionState(async (prev: SaveProductState, formData: FormData) => {
    const result = await saveProduct(prev, formData);
    if (result.status === "success" && "product" in result) setValues(valuesFrom(result.product));
    return result;
  }, idleState);
  const [, deleteAction] = useActionState(deleteProduct, idleState);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const dirty = JSON.stringify(values) !== JSON.stringify(valuesFrom(product));

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setImages: Dispatch<SetStateAction<string[]>> = (update) =>
    setValues((v) => ({ ...v, images: typeof update === "function" ? update(v.images) : update }));

  useEffect(() => {
    if (state.status === "error") document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Submitting through onSubmit (rather than <form action>) stops React from
  // resetting the form after the action, which would discard input on errors.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  const price = amount(values.price) ?? 0;
  const compareAt = amount(values.compareAtPrice);
  const discount = discountPercent({ price, compareAtPrice: compareAt });
  const slugPreview = values.slug || slugify(values.name) || "product";

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="pb-32">
        <input type="hidden" name="id" value={product?.id ?? ""} />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
              <Icon name="arrowLeft" size={15} />
              Products
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{product ? values.name || "Untitled product" : "New product"}</h1>
              {product ? (
                <Badge tone={product.status === "published" ? "success" : "neutral"} dot>
                  {product.status === "published" ? "Live" : "Draft"}
                </Badge>
              ) : null}
            </div>
          </div>
          {product?.status === "published" ? (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-2 transition hover:border-ink/25 hover:text-ink sm:self-auto"
            >
              View in store
              <Icon name="arrowUpRight" size={15} />
            </Link>
          ) : null}
        </div>

        {state.status === "error" ? (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
            <Icon name="alert" size={18} className="mt-px shrink-0" />
            <p className="font-medium">{state.message}</p>
          </div>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card title="Basics">
              <div className="space-y-5">
                <TextInput
                  id="name"
                  label="Product name"
                  value={values.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
                  }}
                  maxLength={LIMITS.name}
                  placeholder="e.g. NFC Review Card"
                  error={errors.name}
                  required
                />
                <TextInput
                  id="tagline"
                  label="Short description"
                  hint="One line shown under the name on the product page."
                  value={values.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  maxLength={LIMITS.tagline}
                  error={errors.tagline}
                  optional
                />
                <TextArea
                  id="description"
                  label="Full description"
                  hint="Line breaks are kept. Describe what it is, who it’s for and what’s included."
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={LIMITS.description}
                  rows={6}
                  error={errors.description}
                  optional
                />
              </div>
            </Card>

            <Card title="Photos" description={`Drag to reorder — the first photo is the cover. Up to ${LIMITS.images} photos.`}>
              <ImageManager images={values.images} onChange={setImages} max={LIMITS.images} error={errors.images} />
            </Card>

            <Card title="Pricing">
              <div className="grid gap-5 sm:grid-cols-2">
                <AffixInput
                  id="price"
                  label="Price"
                  suffix={currency}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={values.price}
                  onChange={(e) => set("price", e.target.value)}
                  error={errors.price}
                  required
                />
                <AffixInput
                  id="compareAtPrice"
                  label="Compare-at price"
                  suffix={currency}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="—"
                  hint="The original price, shown crossed out."
                  value={values.compareAtPrice}
                  onChange={(e) => set("compareAtPrice", e.target.value)}
                  error={errors.compareAtPrice}
                  optional
                />
              </div>
              {discount ? (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent-text">
                  <Icon name="tag" size={16} className="shrink-0" />
                  <span>
                    Customers will see a <strong>{discount}% discount</strong>.
                  </span>
                </p>
              ) : null}
            </Card>

            <Card title="Inventory">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  id="sku"
                  label="SKU"
                  hint="Your internal product code."
                  value={values.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  maxLength={LIMITS.sku}
                  autoComplete="off"
                  error={errors.sku}
                  optional
                />
                <div className="space-y-1.5">
                  <Switch
                    name="trackStock"
                    checked={values.trackStock}
                    onChange={(checked) => set("trackStock", checked)}
                    label="Track stock"
                    description="Show “Only 3 left” and “Sold out” automatically."
                  />
                  {values.trackStock ? (
                    <TextInput
                      id="stock"
                      label={<span className="sr-only">Quantity in stock</span>}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={values.stock}
                      onChange={(e) => set("stock", e.target.value)}
                      error={errors.stock}
                      className="pt-1"
                    />
                  ) : null}
                </div>
              </div>
            </Card>

            <Card title="Specifications" description="Name/value details shown as a table on the product page.">
              <SpecsEditor specs={values.specs} onChange={(specs) => set("specs", specs)} max={LIMITS.specs} error={errors.specs} />
            </Card>

            <Card
              title="Search engine listing"
              description="How this product appears on Google. Put the words customers search for first, e.g. “Carte NFC avis Google”."
            >
              <div className="space-y-5">
                <SearchPreview
                  siteName={storeName}
                  url={`${siteUrl}/products/${slugPreview}`}
                  title={values.seoTitle || `${values.name || "Product name"} · ${storeName}`}
                  description={values.seoDescription || values.tagline || values.description.replace(/\s+/g, " ").slice(0, 160)}
                />
                <Field
                  id="seoTitle"
                  label={
                    <span className="flex w-full items-baseline justify-between gap-2">
                      Search title <CharCount value={values.seoTitle} recommended={60} />
                    </span>
                  }
                  hint="Leave empty to use the product name."
                  error={errors.seoTitle}
                >
                  {(describedBy, invalid) => (
                    <input
                      id="seoTitle"
                      name="seoTitle"
                      value={values.seoTitle}
                      onChange={(e) => set("seoTitle", e.target.value)}
                      maxLength={LIMITS.seoTitle}
                      placeholder={`${values.name || "Product name"} · ${storeName}`}
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      className={controlClass}
                    />
                  )}
                </Field>
                <Field
                  id="seoDescription"
                  label={
                    <span className="flex w-full items-baseline justify-between gap-2">
                      Search description <CharCount value={values.seoDescription} recommended={155} />
                    </span>
                  }
                  hint="One or two sentences that make people click. Leave empty to use the short description."
                  error={errors.seoDescription}
                >
                  {(describedBy, invalid) => (
                    <textarea
                      id="seoDescription"
                      name="seoDescription"
                      value={values.seoDescription}
                      onChange={(e) => set("seoDescription", e.target.value)}
                      maxLength={LIMITS.seoDescription}
                      rows={3}
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      className={cn(controlClass, "resize-y leading-relaxed")}
                    />
                  )}
                </Field>
                <Field id="slug" label="URL handle" error={errors.slug} hint="Letters, numbers and dashes. Changing it breaks links you’ve already shared.">
                  {(describedBy, invalid) => (
                    <div className={cn(controlClass, "flex items-center px-0 py-0 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15")}>
                      <span className="ps-3.5 text-sm whitespace-nowrap text-muted select-none">/products/</span>
                      <input
                        id="slug"
                        name="slug"
                        value={values.slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                        }}
                        onBlur={() => set("slug", slugify(values.slug))}
                        placeholder={slugPreview}
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        className="h-10.5 min-w-0 flex-1 bg-transparent pe-3.5 text-sm text-ink focus:outline-none"
                      />
                    </div>
                  )}
                </Field>
              </div>
            </Card>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <Card title="Visibility">
              <fieldset>
                <legend className="sr-only">Status</legend>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
                  {(["published", "draft"] as const).map((status) => (
                    <label
                      key={status}
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition has-focus-visible:ring-2 has-focus-visible:ring-accent",
                        values.status === status ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                      )}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={values.status === status}
                        onChange={() => set("status", status)}
                        className="sr-only"
                      />
                      <span className={cn("size-2 rounded-full", status === "published" ? "bg-success" : "bg-line-strong")} aria-hidden="true" />
                      {status === "published" ? "Live" : "Draft"}
                    </label>
                  ))}
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted">
                  {values.status === "published" ? "Visible to everyone in your store." : "Hidden from the store until you publish it."}
                </p>
              </fieldset>
              <div className="mt-5 border-t border-line pt-5">
                <Switch
                  name="featured"
                  checked={values.featured}
                  onChange={(checked) => set("featured", checked)}
                  label="Feature on homepage"
                  description="Featured products appear in the hero and the Featured section."
                />
              </div>
            </Card>

            <Card title="Organisation">
              <div className="space-y-5">
                <TextInput
                  id="category"
                  label="Category"
                  list="category-options"
                  value={values.category}
                  onChange={(e) => set("category", e.target.value)}
                  maxLength={LIMITS.category}
                  placeholder="e.g. NFC Cards"
                  autoComplete="off"
                  hint="Pick an existing one or type a new one."
                  error={errors.category}
                  optional
                />
                <datalist id="category-options">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <Field id="tags-input" label="Tags" hint="Press Enter after each tag. Customers can search by tag." error={errors.tags} optional>
                  {(describedBy, invalid) => (
                    <TagInput
                      id="tags-input"
                      tags={values.tags}
                      onChange={(tags) => set("tags", tags)}
                      max={LIMITS.tags}
                      invalid={invalid}
                      describedBy={describedBy}
                    />
                  )}
                </Field>
              </div>
            </Card>

            <Card title="Preview" description="How the product card looks in your store.">
              <ProductCard
                preview
                currency={currency}
                product={{
                  slug: slugPreview,
                  name: values.name,
                  category: values.category,
                  price,
                  compareAtPrice: compareAt !== null && compareAt > price ? compareAt : null,
                  stock: values.trackStock ? (Number(values.stock) || 0) : null,
                  images: values.images,
                }}
              />
            </Card>

            {product ? (
              <Card title="Danger zone">
                <p className="text-xs leading-relaxed text-muted">Deleting removes the product and its uploaded photos permanently.</p>
                <Button variant="danger" size="sm" className="mt-4 w-full" onClick={() => setConfirmDelete(true)}>
                  <Icon name="trash" size={16} />
                  Delete product
                </Button>
              </Card>
            ) : null}
          </aside>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 lg:ps-68">
          <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-full border border-line bg-surface/85 py-2 ps-5 pe-2 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.35)] backdrop-blur-xl">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted">
              <span className={cn("size-2 shrink-0 rounded-full", dirty ? "bg-warn" : "bg-success")} aria-hidden="true" />
              <span className="truncate">{dirty ? "Unsaved changes" : product ? "All changes saved" : "New product"}</span>
            </p>
            <Link href="/admin/products" className="hidden rounded-full px-4 py-2.5 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:block">
              Cancel
            </Link>
            <SubmitButton variant="accent" pending={saving} pendingLabel="Saving…">
              <Icon name="check" size={17} />
              {product ? "Save changes" : "Create product"}
            </SubmitButton>
          </div>
        </div>
      </form>

      {product ? (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={`Delete “${product.name}”?`}
          description="The product and its uploaded photos will be removed permanently. This can’t be undone."
        >
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="from" value="editor" />
            <SubmitButton variant="destructive" className="w-full" pendingLabel="Deleting…">
              Delete product
            </SubmitButton>
          </form>
        </ConfirmDialog>
      ) : null}

      <Toast state={state} flash={flash} />
    </>
  );
}

function Switch({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span> : null}
      </span>
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} role="switch" className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface",
          checked ? "bg-accent" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}
