import { readFile } from "node:fs/promises";
import { MEDIA_CONTENT_TYPES } from "@/server/images";
import { dataDir } from "@/server/store";
import { uploadedFilePath } from "@/server/store/file-store";

/** Serves images uploaded to the local file store (data/uploads). */
export async function GET(_request: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  const filePath = uploadedFilePath(dataDir, file);
  if (!filePath) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(filePath);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": MEDIA_CONTENT_TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
        // File names are random and never reused, so they can be cached forever.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
