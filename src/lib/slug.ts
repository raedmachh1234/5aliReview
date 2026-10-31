export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Carte NFC Été!" → "carte-nfc-ete". May return "" for input without letters or digits. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Returns `base`, or `base-2`, `base-3`… — the first one not in `taken`. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "product";
  if (!taken.has(root)) return root;
  for (let i = 2; ; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}
