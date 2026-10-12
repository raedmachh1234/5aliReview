/**
 * Third-party services audit (requirement #8). Rendered on /legal/subprocessors
 * and mirrored in docs/THIRD_PARTY_AUDIT.md. Anything that sends data to a
 * third party must be listed here with a reason.
 */
export interface ThirdParty {
  name: string;
  purpose: string;
  dataShared: string;
  loadedInBrowser: boolean;
  required: boolean;
}

export const thirdParties: ThirdParty[] = [
  {
    name: "Supabase (PostgreSQL database, authentication, file storage)",
    purpose: "Stores business accounts, ratings and settings; signs in dashboard users; stores business logos.",
    dataShared: "Dashboard account email and hashed password; business data; anonymous ratings. No customer personal data.",
    loadedInBrowser: false,
    required: true,
  },
  {
    name: "Vercel (hosting)",
    purpose: "Serves the website and runs the server code.",
    dataShared: "Standard request data (IP address, user agent) processed transiently to deliver pages; we do not use Vercel Analytics.",
    loadedInBrowser: false,
    required: true,
  },
  {
    name: "Google (Google Business Profile)",
    purpose:
      "Only when a customer chooses to tap “Leave a Google Review” are they sent to the business’s Google review page. Nothing loads from Google before that tap.",
    dataShared: "Nothing is sent by 5ali Review. Google's own privacy policy applies once you are on Google.",
    loadedInBrowser: false,
    required: false,
  },
];

/** Things we deliberately do NOT use. Shown in the audit for transparency. */
export const notUsed = [
  "Advertising or retargeting pixels (Meta, Google Ads, TikTok…)",
  "Third-party analytics (Google Analytics, Hotjar, Mixpanel…)",
  "Social media embed scripts",
  "Externally hosted fonts or CDNs (fonts are self-hosted)",
  "Device fingerprinting or precise location",
] as const;
