export const siteConfig = {
  name: "5ali Review",
  shortName: "5ali",
  tagline: "Simple customer feedback + Google reviews.",
  description:
    "NFC and QR feedback cards for restaurants, cafés, salons, gyms, hotels and shops. Customers rate their visit in seconds, and everyone can choose to leave a Google review.",
  /** Public origin, no trailing slash. Configure SITE_URL in production. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function absoluteUrl(path: string): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
