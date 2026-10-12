import { headers } from "next/headers";

/**
 * Structured data. JSON is serialised with `<` escaped so content can never
 * close the script tag; the nonce keeps it compatible with the strict CSP.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
