import "server-only";
import type { Actor } from "@/lib/types";
import { slugify, withRandomSuffix } from "@/lib/slug";
import { ConflictError, getRepository } from "@/server/data";

/**
 * Creates the owner's first business, retrying with a suffix if the slug is
 * taken. Deliberately NOT a server action: the actor must come from a
 * verified session, never from the client.
 */
export async function createBusinessFor(actor: Actor, name: string) {
  const repo = await getRepository();
  let slug = slugify(name);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await repo.createOwnedBusiness(actor, { name, slug });
    } catch (err) {
      if (!(err instanceof ConflictError)) throw err;
      slug = withRandomSuffix(slugify(name));
    }
  }
  throw new Error("Could not allocate a business slug");
}
