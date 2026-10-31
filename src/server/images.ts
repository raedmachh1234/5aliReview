/**
 * Upload checks. The file type is read from the first bytes rather than
 * trusted from the browser, and SVG is deliberately not accepted (it can
 * carry scripts).
 */
export const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

export type ImageType = keyof typeof IMAGE_EXTENSIONS;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return "image/png";
  if (ascii(bytes, 0, 4) === "GIF8") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 4))) return "image/avif";
  return null;
}

/** Uploaded files are stored as <uuid>.<ext>; anything else is rejected. */
export const MEDIA_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif|gif)$/;

/** Images bundled in public/samples: the starter illustrations and the store's own product photos. */
export const SAMPLE_IMAGE_PATTERN = /^\/samples\/[a-z0-9-]+\.(svg|jpg|png|webp)$/;

export const MEDIA_CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_EXTENSIONS).map(([type, ext]) => [ext, type]),
);
