/**
 * Legal entity details used in the legal pages ({{company.*}} placeholders),
 * the footer and structured data. Every value can be overridden with env vars
 * so the operator can update legal information without touching code.
 *
 * Values left as "[…]" are deliberately visible placeholders: they must be
 * completed before launch and must never be guessed.
 */
export const company = {
  legalName: process.env.LEGAL_COMPANY_NAME || "[Company legal name]",
  tradeName: "5ali Review",
  registrationNumber: process.env.LEGAL_REGISTRATION_NUMBER || "[Registration / RNE number]",
  address: process.env.LEGAL_ADDRESS || "[Registered address]",
  country: process.env.LEGAL_COUNTRY || "Tunisia",
  contactEmail: process.env.LEGAL_CONTACT_EMAIL || "hello@5ali.tn",
  privacyEmail: process.env.LEGAL_PRIVACY_EMAIL || "privacy@5ali.tn",
  billingEmail: process.env.LEGAL_BILLING_EMAIL || "billing@5ali.tn",
  phone: process.env.LEGAL_PHONE || "",
  governingLaw: process.env.LEGAL_GOVERNING_LAW || "[Governing law / jurisdiction]",
  /** Data protection authority customers can complain to. */
  supervisoryAuthority:
    process.env.LEGAL_SUPERVISORY_AUTHORITY ||
    "the competent data protection authority in your country (in Tunisia: INPDP — Instance Nationale de Protection des Données Personnelles)",
  hostingRegion: process.env.LEGAL_HOSTING_REGION || "[Hosting region, e.g. EU (Frankfurt)]",
  /** Last-updated date shown on the default (unedited) legal documents. */
  legalLastUpdated: process.env.LEGAL_LAST_UPDATED || "2026-10-08",
} as const;

export type CompanyInfo = typeof company;
