import { RESERVED_SLUGS } from "./validation";

/** "Café El Bahia!" → "cafe-el-bahia". Always returns a valid slug (min 3 chars, not reserved). */
export function slugify(input: string): string {
  let slug = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  if (slug.length < 3) slug = `${slug ? `${slug}-` : ""}business`;
  if (RESERVED_SLUGS.has(slug)) slug = `${slug}-business`;
  return slug;
}

export function withRandomSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug.slice(0, 55)}-${suffix}`;
}
