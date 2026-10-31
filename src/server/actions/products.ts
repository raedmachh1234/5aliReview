"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify, uniqueSlug } from "@/lib/slug";
import { toProductInput, type FormState, type Product } from "@/lib/types";
import { parseProductForm } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { MAX_IMAGE_BYTES, sniffImageType } from "@/server/images";
import { getStore, type CatalogStore } from "@/server/store";

/** Product changes affect the storefront, the admin lists and the sitemap. */
function revalidateEverything() {
  revalidatePath("/", "layout");
}

function idFrom(formData: FormData): string {
  const id = formData.get("id");
  return typeof id === "string" ? id : "";
}

/** Deletes uploads that no remaining product points at (duplicates share image URLs). */
async function removeUnusedImages(store: CatalogStore, candidates: string[], remaining: Product[]) {
  const inUse = new Set(remaining.flatMap((p) => p.images));
  await Promise.all(candidates.filter((url) => !inUse.has(url)).map((url) => store.deleteImage(url)));
}

/** Like FormState, but a successful save also returns the stored product (normalised values). */
export type SaveProductState = FormState | { status: "success"; message: string; product: Product };

export async function saveProduct(_prev: SaveProductState, formData: FormData): Promise<SaveProductState> {
  await requireAdmin();
  const store = getStore();
  const id = idFrom(formData);

  const parsed = parseProductForm(formData, (url) => store.isAllowedImage(url));
  if (!parsed.ok) return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };

  const products = await store.listProducts();
  const existing = id ? products.find((p) => p.id === id) : undefined;
  if (id && !existing) return { status: "error", message: "This product no longer exists. It may have been deleted." };

  const taken = new Set(products.filter((p) => p.id !== id).map((p) => p.slug));
  const typedSlug = slugify(String(formData.get("slug") ?? ""));
  if (typedSlug && taken.has(typedSlug)) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { slug: "Another product already uses this URL." },
    };
  }
  const data = { ...parsed.data, slug: uniqueSlug(parsed.data.slug, taken) };

  let createdId: string;
  try {
    if (existing) {
      const updated = await store.updateProduct(existing.id, data);
      if (!updated) return { status: "error", message: "This product no longer exists. It may have been deleted." };
      const removed = existing.images.filter((url) => !data.images.includes(url));
      await removeUnusedImages(store, removed, [...products.filter((p) => p.id !== existing.id), updated]);
      revalidateEverything();
      return { status: "success", message: "Changes saved.", product: updated };
    }
    createdId = (await store.createProduct(data)).id;
  } catch (err) {
    console.error("save_product_failed", err);
    return { status: "error", message: "Couldn’t save the product. Please try again." };
  }
  revalidateEverything();
  redirect(`/admin/products/${createdId}?created=1`);
}

export async function deleteProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const store = getStore();
  try {
    const deleted = await store.deleteProduct(idFrom(formData));
    if (!deleted) return { status: "error", message: "This product was already deleted." };
    await removeUnusedImages(store, deleted.images, await store.listProducts());
  } catch (err) {
    console.error("delete_product_failed", err);
    return { status: "error", message: "Couldn’t delete the product. Please try again." };
  }
  revalidateEverything();
  if (formData.get("from") === "editor") redirect("/admin/products?deleted=1");
  return { status: "success", message: "Product deleted." };
}

/** Quick toggles from the product list: publish/unpublish and feature/unfeature. */
export async function setProductFlag(formData: FormData): Promise<void> {
  await requireAdmin();
  const field = formData.get("field");
  const on = formData.get("value") === "true";
  const patch =
    field === "status" ? { status: on ? ("published" as const) : ("draft" as const) } : field === "featured" ? { featured: on } : null;
  if (!patch) return;
  await getStore().updateProduct(idFrom(formData), patch);
  revalidateEverything();
}

export async function duplicateProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const products = await store.listProducts();
  const source = products.find((p) => p.id === idFrom(formData));
  if (!source) redirect("/admin/products");
  const copy = await store.createProduct({
    ...toProductInput(source),
    name: `${source.name} (copy)`.slice(0, 120),
    slug: uniqueSlug(`${source.slug}-copy`, new Set(products.map((p) => p.slug))),
    status: "draft",
    featured: false,
  });
  revalidateEverything();
  redirect(`/admin/products/${copy.id}?created=1`);
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: `${file.name} is larger than 8 MB.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: `${file.name} isn’t a JPG, PNG, WebP, AVIF or GIF image.` };
  try {
    return { ok: true, url: await getStore().saveImage(bytes, type) };
  } catch (err) {
    console.error("upload_image_failed", err);
    return { ok: false, error: `Couldn’t upload ${file.name}. Please try again.` };
  }
}
