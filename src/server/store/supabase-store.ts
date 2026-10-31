import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductInput, ProductSpec, StoreSettings } from "@/lib/types";
import { IMAGE_EXTENSIONS, MEDIA_FILE_PATTERN, SAMPLE_IMAGE_PATTERN } from "@/server/images";
import { defaultSettings } from "./seed";
import type { CatalogStore } from "./types";

/**
 * Supabase-backed store (see supabase/migrations). The tables have RLS on and
 * no policies, so only this server — holding the service-role key — can read
 * or write them. Admin access is enforced by the app's own session.
 */
export const BUCKET = "product-images";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number | string;
  compare_at_price: number | string | null;
  sku: string;
  stock: number | null;
  category: string;
  tags: string[];
  images: string[];
  specs: ProductSpec[];
  status: Product["status"];
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    sku: row.sku,
    stock: row.stock,
    category: row.category,
    tags: row.tags ?? [],
    images: row.images ?? [],
    specs: row.specs ?? [],
    status: row.status,
    featured: row.featured,
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: Partial<ProductInput>): Partial<ProductRow> {
  const row: Partial<ProductRow> = {};
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.name !== undefined) row.name = input.name;
  if (input.tagline !== undefined) row.tagline = input.tagline;
  if (input.description !== undefined) row.description = input.description;
  if (input.price !== undefined) row.price = input.price;
  if (input.compareAtPrice !== undefined) row.compare_at_price = input.compareAtPrice;
  if (input.sku !== undefined) row.sku = input.sku;
  if (input.stock !== undefined) row.stock = input.stock;
  if (input.category !== undefined) row.category = input.category;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.images !== undefined) row.images = input.images;
  if (input.specs !== undefined) row.specs = input.specs;
  if (input.status !== undefined) row.status = input.status;
  if (input.featured !== undefined) row.featured = input.featured;
  if (input.seoTitle !== undefined) row.seo_title = input.seoTitle;
  if (input.seoDescription !== undefined) row.seo_description = input.seoDescription;
  return row;
}

export function createSupabaseStore(url: string, serviceKey: string): CatalogStore {
  const client: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const publicPrefix = `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/`;

  const fail = (action: string, error: { message: string }): never => {
    throw new Error(`Supabase ${action} failed: ${error.message}`);
  };

  return {
    kind: "supabase",

    async listProducts() {
      const { data, error } = await client.from("products").select("*").order("created_at");
      if (error) fail("list products", error);
      return (data as ProductRow[]).map(fromRow);
    },

    async getProduct(id) {
      const { data, error } = await client.from("products").select("*").eq("id", id).maybeSingle();
      if (error) fail("get product", error);
      return data ? fromRow(data as ProductRow) : null;
    },

    async createProduct(input) {
      const { data, error } = await client.from("products").insert(toRow(input)).select("*").single();
      if (error) fail("create product", error);
      return fromRow(data as ProductRow);
    },

    async updateProduct(id, patch) {
      const { data, error } = await client
        .from("products")
        .update({ ...toRow(patch), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) fail("update product", error);
      return data ? fromRow(data as ProductRow) : null;
    },

    async deleteProduct(id) {
      const { data, error } = await client.from("products").delete().eq("id", id).select("*").maybeSingle();
      if (error) fail("delete product", error);
      return data ? fromRow(data as ProductRow) : null;
    },

    async getSettings() {
      const { data, error } = await client.from("store_settings").select("data").eq("id", 1).maybeSingle();
      if (error) fail("read settings", error);
      return { ...defaultSettings, ...((data?.data as Partial<StoreSettings>) ?? {}) };
    },

    async saveSettings(settings) {
      const { error } = await client
        .from("store_settings")
        .upsert({ id: 1, data: settings, updated_at: new Date().toISOString() });
      if (error) fail("save settings", error);
    },

    async saveImage(bytes, type) {
      const name = `${randomUUID()}.${IMAGE_EXTENSIONS[type]}`;
      const { error } = await client.storage
        .from(BUCKET)
        .upload(name, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
      if (error) fail("upload image", error);
      return publicPrefix + name;
    },

    async deleteImage(imageUrl) {
      if (!imageUrl.startsWith(publicPrefix)) return;
      const name = imageUrl.slice(publicPrefix.length);
      if (!MEDIA_FILE_PATTERN.test(name)) return;
      await client.storage.from(BUCKET).remove([name]);
    },

    isAllowedImage(imageUrl) {
      return (
        (imageUrl.startsWith(publicPrefix) && MEDIA_FILE_PATTERN.test(imageUrl.slice(publicPrefix.length))) ||
        SAMPLE_IMAGE_PATTERN.test(imageUrl)
      );
    },
  };
}
