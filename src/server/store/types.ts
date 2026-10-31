import type { Product, ProductInput, StoreSettings } from "@/lib/types";
import type { ImageType } from "@/server/images";

/**
 * Everything the app needs from persistence. Two implementations:
 * a JSON file on disk (default) and Supabase (when configured).
 */
export interface CatalogStore {
  readonly kind: "file" | "supabase";
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product | null>;
  deleteProduct(id: string): Promise<Product | null>;
  getSettings(): Promise<StoreSettings>;
  saveSettings(settings: StoreSettings): Promise<void>;
  /** Stores an uploaded image and returns its public URL. */
  saveImage(bytes: Uint8Array, type: ImageType): Promise<string>;
  /** Removes an image this store uploaded; other URLs are ignored. */
  deleteImage(url: string): Promise<void>;
  /** Whether a URL may be attached to a product (uploaded here, or a bundled sample). */
  isAllowedImage(url: string): boolean;
}
