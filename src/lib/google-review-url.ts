/**
 * Google review links are stored per business/location and are the ONLY
 * external destination the customer flow ever redirects to. To prevent the
 * redirect being abused (open redirect / phishing), only https URLs on known
 * Google hosts are accepted.
 */
const ALLOWED_HOSTS = new Set([
  "search.google.com",
  "www.google.com",
  "google.com",
  "maps.google.com",
  "www.google.tn",
  "google.tn",
  "g.page",
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
]);

export function isAllowedGoogleReviewUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return false;
  // Plain google.com must point at maps/review paths, not arbitrary search or redirect endpoints.
  if (/^(www\.)?google\.(com|tn)$/.test(url.hostname) && !/^\/maps\b/.test(url.pathname)) return false;
  if (url.hostname === "goo.gl" && !url.pathname.startsWith("/maps")) return false;
  return true;
}

/** Builds the official "write a review" link from a Google Place ID. */
export function reviewUrlFromPlaceId(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export const googleReviewUrlHelp =
  "Use the “Ask for reviews” link from your Google Business Profile (e.g. https://g.page/r/…/review) or https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID";
