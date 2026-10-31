import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Product, StoreSettings } from "@/lib/types";
import { IMAGE_EXTENSIONS, MEDIA_FILE_PATTERN, SAMPLE_IMAGE_PATTERN } from "@/server/images";
import { defaultSettings, sampleProducts } from "./seed";
import type { CatalogStore } from "./types";

/**
 * Stores the catalogue in <dir>/store.json and uploads in <dir>/uploads.
 * Suited to local development and single-server hosting; serverless hosts
 * have no persistent disk, so use Supabase there.
 */
interface StoreFile {
  version: 1;
  settings: StoreSettings;
  products: Product[];
}

export function createFileStore(dir: string): CatalogStore {
  const file = path.join(dir, "store.json");
  const uploads = path.join(dir, "uploads");
  // Reads and writes run one at a time, so concurrent saves can't overwrite
  // each other and the first-run seeding happens exactly once.
  let queue: Promise<unknown> = Promise.resolve();
  // A fresh install that can't write (read-only disk) still serves the samples.
  let fallback: StoreFile | null = null;

  async function write(data: StoreFile): Promise<void> {
    await mkdir(dir, { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    try {
      await rename(tmp, file);
    } catch {
      // Windows can refuse to replace a file another process has open.
      await writeFile(file, JSON.stringify(data, null, 2), "utf8");
      await unlink(tmp).catch(() => {});
    }
  }

  async function read(): Promise<StoreFile> {
    try {
      const data = JSON.parse(await readFile(file, "utf8")) as StoreFile;
      // Files written by older versions lack newer fields; fill in their defaults.
      return {
        version: 1,
        settings: { ...defaultSettings, ...data.settings },
        products: (data.products ?? []).map((p) => ({ ...p, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" })),
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      if (fallback) return structuredClone(fallback);
      const seeded: StoreFile = { version: 1, settings: { ...defaultSettings }, products: sampleProducts() };
      try {
        await write(seeded);
      } catch {
        fallback = seeded;
      }
      return structuredClone(seeded);
    }
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
  }

  const query = <T>(fn: (data: StoreFile) => T) => enqueue(async () => fn(await read()));

  const mutate = <T>(fn: (data: StoreFile) => T) =>
    enqueue(async () => {
      const data = await read();
      const result = fn(data);
      await write(data);
      return result;
    });

  return {
    kind: "file",

    listProducts() {
      return query((data) => data.products);
    },

    getProduct(id) {
      return query((data) => data.products.find((p) => p.id === id) ?? null);
    },

    createProduct(input) {
      return mutate((data) => {
        const now = new Date().toISOString();
        const product: Product = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
        data.products.push(product);
        return product;
      });
    },

    updateProduct(id, patch) {
      return mutate((data) => {
        const index = data.products.findIndex((p) => p.id === id);
        if (index === -1) return null;
        const updated = { ...data.products[index], ...patch, id, updatedAt: new Date().toISOString() };
        data.products[index] = updated;
        return updated;
      });
    },

    deleteProduct(id) {
      return mutate((data) => {
        const index = data.products.findIndex((p) => p.id === id);
        if (index === -1) return null;
        return data.products.splice(index, 1)[0];
      });
    },

    getSettings() {
      return query((data) => data.settings);
    },

    async saveSettings(settings) {
      await mutate((data) => {
        data.settings = settings;
      });
    },

    async saveImage(bytes, type) {
      await mkdir(uploads, { recursive: true });
      const name = `${randomUUID()}.${IMAGE_EXTENSIONS[type]}`;
      await writeFile(path.join(uploads, name), bytes);
      return `/media/${name}`;
    },

    async deleteImage(url) {
      const name = url.startsWith("/media/") ? url.slice("/media/".length) : "";
      if (!MEDIA_FILE_PATTERN.test(name)) return;
      await unlink(path.join(uploads, name)).catch(() => {});
    },

    isAllowedImage(url) {
      return (url.startsWith("/media/") && MEDIA_FILE_PATTERN.test(url.slice(7))) || SAMPLE_IMAGE_PATTERN.test(url);
    },
  };
}

/** Absolute path of an uploaded file, or null for names that aren't ours. */
export function uploadedFilePath(dir: string, name: string): string | null {
  return MEDIA_FILE_PATTERN.test(name) ? path.join(dir, "uploads", name) : null;
}
