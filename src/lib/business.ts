import type { Business } from "./types";
import type { BusinessProfileInput } from "./validation";

/** Current business values as a full profile input (for partial updates). */
export function businessToProfileInput(b: Business): BusinessProfileInput {
  return {
    name: b.name,
    description: b.description,
    website: b.website,
    phone: b.phone,
    email: b.email,
    address: b.address,
    logoAlt: b.logoAlt,
    brandPrimary: b.brandPrimary,
    brandAccent: b.brandAccent,
    defaultLocale: b.defaultLocale,
    googleReviewUrl: b.googleReviewUrl,
    openingHours: b.openingHours as Record<string, string>,
    socialLinks: b.socialLinks as Record<string, string>,
  };
}
