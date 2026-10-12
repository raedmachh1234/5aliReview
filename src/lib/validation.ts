import { z } from "zod";
import { isAllowedGoogleReviewUrl } from "./google-review-url";
import { isHexColor } from "./contrast";

/**
 * Shared validation schemas — used on the server for every mutation (the
 * source of truth) and on the client only for faster feedback.
 * Error messages are i18n keys resolved by the form that displays them.
 */

/** Slugs that would collide with routes or system pages. */
export const RESERVED_SLUGS = new Set(["unavailable", "admin", "api", "dashboard", "login", "signup", "legal", "new", "google", "www", "demo"]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { error: "validation.slug" })
  .max(60, { error: "validation.slug" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "validation.slug" })
  .refine((v) => !RESERVED_SLUGS.has(v), { error: "validation.taken" });

export const ratingSchema = z.coerce
  .number({ error: "errors.ratingRequired" })
  .int({ error: "errors.ratingRequired" })
  .min(1, { error: "errors.ratingRequired" })
  .max(5, { error: "errors.ratingRequired" });

export const feedbackSourceSchema = z.enum(["nfc", "qr", "link"]).catch("link");

export const cardCodeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{8}$/, { error: "validation.invalid" });

export const feedbackSubmissionSchema = z.object({
  slug: slugSchema,
  location: slugSchema.optional().or(z.literal("").transform(() => undefined)),
  card: cardCodeSchema.optional().or(z.literal("").transform(() => undefined)),
  source: feedbackSourceSchema,
  rating: ratingSchema,
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "validation.tooLong" })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(300, { error: "validation.tooLong" })
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), { error: "validation.httpsUrl" })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const googleReviewUrlSchema = z
  .string()
  .trim()
  .max(500, { error: "validation.tooLong" })
  .refine((v) => v === "" || isAllowedGoogleReviewUrl(v), { error: "validation.googleUrl" })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const hexColor = z
  .string()
  .trim()
  .refine((v) => v === "" || isHexColor(v), { error: "validation.color" })
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .nullable()
  .optional();

const dayHours = z.string().trim().max(60, { error: "validation.tooLong" }).optional();

export const openingHoursSchema = z
  .object({ mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours, fri: dayHours, sat: dayHours, sun: dayHours })
  .transform((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v)) as Record<string, string>);

export const socialLinksSchema = z
  .object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    tiktok: optionalUrl,
    linkedin: optionalUrl,
    x: optionalUrl,
  })
  .transform((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v)) as Record<string, string>);

export const localeSchema = z.enum(["en", "fr", "ar"]);

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, { error: "validation.required" }).max(120, { error: "validation.tooLong" }),
  description: optionalText(500),
  website: optionalUrl,
  phone: z
    .string()
    .trim()
    .max(30, { error: "validation.tooLong" })
    .refine((v) => v === "" || /^[+0-9 ()-]{6,30}$/.test(v), { error: "validation.phone" })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, { error: "validation.email" })
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable()
    .optional(),
  address: optionalText(240),
  logoAlt: optionalText(140),
  brandPrimary: hexColor,
  brandAccent: hexColor,
  defaultLocale: localeSchema,
  googleReviewUrl: googleReviewUrlSchema,
  openingHours: openingHoursSchema,
  socialLinks: socialLinksSchema,
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const adminBusinessSchema = businessProfileSchema.extend({
  slug: slugSchema,
  status: z.enum(["active", "suspended"]),
});

export const locationSchema = z.object({
  name: z.string().trim().min(2, { error: "validation.required" }).max(120, { error: "validation.tooLong" }),
  slug: slugSchema,
  address: optionalText(240),
  phone: optionalText(30),
  googleReviewUrl: googleReviewUrlSchema,
});
export type LocationInput = z.infer<typeof locationSchema>;

export const cardSchema = z.object({
  label: z.string().trim().min(1, { error: "validation.required" }).max(80, { error: "validation.tooLong" }),
  locationId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export const emailSchema = z.string().trim().toLowerCase().max(200).pipe(z.email({ error: "validation.email" }));

export const passwordSchema = z
  .string()
  .min(10, { error: "validation.password" })
  .max(200, { error: "validation.password" });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, { error: "validation.required" }).max(200) });

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, { error: "validation.required" }).max(120, { error: "validation.tooLong" }),
  email: emailSchema,
  password: passwordSchema,
  businessName: z.string().trim().min(2, { error: "validation.required" }).max(120, { error: "validation.tooLong" }),
  acceptTerms: z.literal("on", { error: "validation.acceptTerms" }),
  marketingOptIn: z
    .literal("on")
    .optional()
    .transform((v) => v === "on"),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "validation.required" }).max(120, { error: "validation.tooLong" }),
  email: emailSchema,
  businessName: optionalText(120),
  message: z.string().trim().min(10, { error: "validation.messageShort" }).max(2000, { error: "validation.tooLong" }),
  marketingOptIn: z
    .literal("on")
    .optional()
    .transform((v) => v === "on"),
  /** Honeypot — must stay empty. */
  website: z.string().max(0).optional(),
});

export const deletionRequestSchema = z.object({
  email: emailSchema,
  scope: z.enum(["account", "business", "marketing", "other"], { error: "validation.required" }),
  details: optionalText(2000),
  confirm: z.literal("on", { error: "validation.confirmDeletion" }),
  website: z.string().max(0).optional(),
});

export const uuidSchema = z.string().uuid();
