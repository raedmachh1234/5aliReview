import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProductInput } from "@/lib/types";
import { createFileStore } from "@/server/store/file-store";
import { defaultSettings } from "@/server/store/seed";

const input: ProductInput = {
  slug: "test-product",
  name: "Test product",
  tagline: "",
  description: "",
  price: 10,
  compareAtPrice: null,
  sku: "",
  stock: 4,
  category: "Tests",
  tags: [],
  images: [],
  specs: [],
  status: "draft",
  featured: false,
  seoTitle: "",
  seoDescription: "",
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "store-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("file store", () => {
  it("seeds sample products exactly once on first use", async () => {
    const store = createFileStore(dir);
    const [a, b] = await Promise.all([store.listProducts(), store.listProducts()]);
    expect(a.length).toBeGreaterThan(0);
    expect(b.map((p) => p.id)).toEqual(a.map((p) => p.id));
    const onDisk = JSON.parse(await readFile(path.join(dir, "store.json"), "utf8"));
    expect(onDisk.products.map((p: { id: string }) => p.id)).toEqual(a.map((p) => p.id));
  });

  it("creates, updates and deletes products", async () => {
    const store = createFileStore(dir);
    const created = await store.createProduct(input);
    expect(await store.getProduct(created.id)).toMatchObject({ name: "Test product", stock: 4 });

    const updated = await store.updateProduct(created.id, { price: 12, status: "published" });
    expect(updated).toMatchObject({ price: 12, status: "published", name: "Test product" });
    expect(updated!.updatedAt >= created.updatedAt).toBe(true);

    expect(await store.deleteProduct(created.id)).toMatchObject({ id: created.id });
    expect(await store.getProduct(created.id)).toBeNull();
    expect(await store.updateProduct(created.id, { price: 1 })).toBeNull();
  });

  it("keeps every write when saves happen at the same time", async () => {
    const store = createFileStore(dir);
    const before = (await store.listProducts()).length;
    await Promise.all(Array.from({ length: 10 }, (_, i) => store.createProduct({ ...input, slug: `p-${i}` })));
    // A fresh instance reads from disk, proving nothing was lost.
    expect((await createFileStore(dir).listProducts()).length).toBe(before + 10);
  });

  it("persists settings", async () => {
    await createFileStore(dir).saveSettings({ ...defaultSettings, storeName: "Renamed" });
    expect((await createFileStore(dir).getSettings()).storeName).toBe("Renamed");
  });

  it("stores and removes uploaded images, and only accepts its own URLs", async () => {
    const store = createFileStore(dir);
    await store.listProducts(); // creates store.json
    const url = await store.saveImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg");
    expect(url).toMatch(/^\/media\/[0-9a-f-]{36}\.jpg$/);
    const file = path.join(dir, "uploads", url.slice("/media/".length));
    expect((await stat(file)).size).toBe(4);

    expect(store.isAllowedImage(url)).toBe(true);
    expect(store.isAllowedImage("/samples/nfc-review-card.svg")).toBe(true);
    expect(store.isAllowedImage("/media/../store.json")).toBe(false);
    expect(store.isAllowedImage("https://example.com/a.jpg")).toBe(false);

    await store.deleteImage("/media/../store.json");
    await store.deleteImage(url);
    await expect(stat(file)).rejects.toThrow();
    await expect(stat(path.join(dir, "store.json"))).resolves.toBeTruthy();
  });
});
