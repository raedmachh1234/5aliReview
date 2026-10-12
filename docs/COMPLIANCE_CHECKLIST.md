# Final compliance & quality audit

Audited 2026-10-08 against the project brief. Legend: ✅ done and verified · 🟡 implemented, but needs a manual or production step · ⚪ not applicable yet.

"Verified" means checked by an automated test (`npm test`, `npm run test:e2e`, `npm run check:no-gating`) or by inspection. The final row shows the results of the last full run.

> This checklist records engineering work. It is **not** legal advice and doesn't make the service compliant in any jurisdiction. See [LEGAL_REVIEW_NOTES.md](LEGAL_REVIEW_NOTES.md).

| # | Item | Status | Where / evidence |
| --- | --- | --- | --- |
| 1 | Privacy Policy | 🟡 | `/legal/privacy`, editable in Admin → Legal (versioned); company details from `LEGAL_*` env. **Needs lawyer review and real company details.** |
| 2 | Terms of Service | 🟡 | `/legal/terms`. Same as above. |
| 3 | Refund Policy | 🟡 | `/legal/refunds`. Same as above. Refund timelines are phrased as targets, not guarantees. |
| 4 | Cookie Policy | ✅ | `/legal/cookies`. Lists exactly the cookies in `src/config/cookies.ts`; analytics/marketing are marked "not used". |
| 5 | Cookie consent banner | ✅ | `components/consent/*`. Accept all / Reject non-essential / Cookie settings, with identical styling (e2e-tested); not pre-ticked; reopens from the footer; Escape closes; works without JS (form on `/legal/cookies#manage`). The customer pages set no cookies, so they show no banner. |
| 6 | Form consents | ✅ | Signup, contact and deletion forms explain what is collected and why above the fields. Terms acceptance is required; marketing opt-in is a **separate, unticked** checkbox. |
| 7 | Data minimisation | ✅ | Feedback = rating + business/location/card ids + source + timestamp only. A unit test confirms extra fields (name/email) are dropped. No IP, user agent, location or fingerprint is stored. |
| 8 | Third-party SDK audit | ✅ | [THIRD_PARTY_AUDIT.md](THIRD_PARTY_AUDIT.md), `/legal/subprocessors`. No analytics, ads, social scripts or CDNs; fonts are self-hosted. |
| 9 | No dark patterns | ✅ | Equal-weight consent buttons; one-click cancel with a plain-language confirmation and an equally visible "Back"; no fake urgency; no pre-ticked boxes; deletion is linked from the footer. |
| 10 | No hidden fees | 🟡 | `/pricing` and Billing show price, billing period, VAT note, trial, renewal, cancellation and extra-card terms. **Prices are placeholders** (badge shown) until `PRICING_IS_PLACEHOLDER = false`. |
| 11 | No fake reviews / manipulation | ✅ | No testimonials. Demo data is labelled "Demo" on every screen and comes from a seeded generator. 5ali never posts reviews. The Terms forbid fake/incentivised reviews. |
| 12 | No unsupported claims | ✅ | No "Google-approved", ranking or "guaranteed" claims. The home page states results are not promised. A Google trademark/non-affiliation notice is in the footer. |
| 13 | Alt text | ✅ | Logos use the business's alt text (falling back to its name); decorative SVGs are `aria-hidden`; QR codes have descriptive alt; the hero mock-up has a text alternative. axe passes. |
| 14 | Colour contrast | ✅ | Token table in [ACCESSIBILITY.md](ACCESSIBILITY.md) (text ≥ 7.1:1). Brand colours are auto-darkened to ≥ 4.5:1 (unit-tested). Ratings show numbers and text, not colour alone. axe passes. |
| 15 | Keyboard navigation | ✅ | Skip link, visible 3px focus ring, native radios for stars, `<dialog>` for modals (Escape, focus return), no traps. The customer flow is e2e-tested by keyboard alone. |
| 16 | Business details | ✅ | Name, logo, description, address, phone, website, opening hours, social links and Google link are editable in Settings. Only provided fields are shown (collapsed "About" panel). |
| 17 | Children's data | ✅ | The customer flow collects no personal data and never asks for age. Dashboard accounts are 18+ (stated at signup). Policy in [DATA_RETENTION.md](DATA_RETENTION.md). |
| 18 | Email unsubscribe | 🟡 | `sendMarketing()` refuses unsubscribed or unconsented addresses and adds a visible link plus RFC 8058 `List-Unsubscribe(-Post)` headers. `/unsubscribe` and `/api/unsubscribe` exist. **No email provider is connected yet.** |
| 19 | Font licensing | ✅ | Manrope and IBM Plex Sans Arabic (OFL 1.1), self-hosted. [FONTS.md](FONTS.md). |
| 20 | Data deletion request | ✅ | `/data-deletion` (public) and Dashboard → Privacy (signed in). Both explain what is deleted and what is kept, and why. Requests go to an admin queue with statuses and notes. |
| — | Data export | ✅ | CSV/JSON export (manager+), formula-injection safe, e2e-tested, rate-limited. |
| — | Data retention | ✅ | Per-business 1–60 months (default 24), plus fixed periods for other data. Daily purge via `/api/cron/retention` (CRON_SECRET). |
| — | Authentication | ✅ | Supabase Auth (bcrypt), or HMAC-signed sessions with scrypt in demo mode. Generic login errors; login is rate-limited. |
| — | Authorization | ✅ | Server-side guards on every route and action; repository re-checks roles; 404 for other tenants. Unit and e2e tests: A cannot reach B, manager cannot reach billing, non-admin cannot reach admin (even with a forged flag). |
| — | RLS | 🟡 | RLS is enabled on all 15 tables; anon has RPC-only access; `SECURITY DEFINER` functions use `search_path=''`. pgTAP tests are written (`supabase/tests/rls.test.sql`) but **not yet run**, because no Postgres/Docker was available. Run `supabase test db`. |
| — | Rate limiting | ✅ | Feedback, Google clicks, login, signup, contact, deletion, export. Salted, daily-rotated IP hashes. Postgres-backed in production. |
| — | XSS protection | ✅ | React escaping; nonce CSP with `strict-dynamic`; Markdown without raw HTML; SVG uploads rejected. |
| — | CSRF protection | ✅ | Server Actions check Origin; SameSite=Lax cookies; no state-changing GET routes. The no-JS path was e2e-tested (and caught a `no-referrer` / `Origin: null` bug, now fixed). |
| — | Secure headers | ✅ | CSP, HSTS, nosniff, XFO DENY, Referrer-Policy, Permissions-Policy, COOP; no `X-Powered-By`. e2e-tested. |
| — | Secure cookies | ✅ | HttpOnly, SameSite=Lax, Secure in production; consent cookie is HttpOnly (e2e-tested). |
| — | HTTPS-ready | ✅ | HSTS, `upgrade-insecure-requests`; all generated URLs come from `NEXT_PUBLIC_SITE_URL`. |
| — | Environment variables | ✅ | `.env.example`; zod-validated `server-only` env module; the service key is used only by the cron job; the anon key is server-only too. |
| — | Mobile responsiveness | ✅ | e2e at 320/375/390/430px: rating and Submit on the first screen, no horizontal scroll. Dashboard has a mobile drawer. Screenshots reviewed. |
| — | Accessibility | ✅ | axe (WCAG 2.0/2.1/2.2 A+AA): 0 violations on the customer page (EN/FR/AR), 9 public pages and 10 dashboard pages. Lighthouse a11y 100. A manual screen-reader pass is still recommended. |
| — | Performance | ✅ | Lighthouse mobile: customer page 95, home 95; CLS 0; TBT ≤ 90ms. No chart, icon or animation libraries. |
| — | SEO | ✅ | Metadata, OG/Twitter, canonical URLs, sitemap, robots, JSON-LD (Organization, SoftwareApplication, FAQPage). Lighthouse SEO 100 on the home page. Customer, dashboard and admin pages are noindexed (deliberate). |
| — | i18n architecture | ✅ | Typed dictionaries (en source, fr, ar). Key and placeholder parity is unit-tested. Language comes from `?lang`, then cookie, then browser. The admin panel is English-only by design (`src/i18n/admin.ts`). |
| — | RTL readiness | ✅ | `dir="rtl"`, logical CSS properties, mirrored arrows; e2e-tested. Arabic plural forms are simplified (see note below). |
| — | Error handling | ✅ | Error boundaries (root, dashboard, admin, customer) show only an opaque digest; "business no longer available" page; "Google reviews currently unavailable"; "Please select a rating…"; generic network error. |
| — | Loading states | ✅ | Dashboard/admin skeletons (`role=status`); pending button labels; spinner on submit. |
| — | Empty states | ✅ | Feedback, locations, cards, QR codes, admin lists. |
| — | **No review gating** | ✅ | The thank-you component never receives the rating; the Google redirect ignores it; a CI guard (`check:no-gating`, proven to catch a planted violation); unit tests for ratings 1–5; e2e for each rating. A "skip straight to Google" link is also offered. |
| — | NFC flow | ✅ | `/t/<CARD>` → business/location page; destination changeable without reprogramming; inactive cards → unavailable page. |
| — | QR fallback | ✅ | Server-generated SVG/PNG QR (no external service), `?s=qr` counted separately. |
| — | Google Review flow | ✅ | Stored, allowlisted Google URL (also enforced in the DB); location override; click counted anonymously; no open redirect (unit-tested). |
| — | Business dashboard | ✅ | All 10 sections; filters for today/7/30/90/custom and location; charts with table fallback. |
| — | Admin dashboard | ✅ | Businesses CRUD and suspend, cards, feedback, users and permissions, subscriptions and invoices, legal editor, deletion queue, contact inbox, audit log. |

**Last full run (2026-10-08):** `tsc` clean · ESLint clean (0 warnings) · Vitest 55/55 · no-gating guard passing · `next build` OK · Playwright 40/40 (installed Chrome).

## Known limitations / follow-ups

1. **Database not yet exercised.** The Supabase migrations, RPCs and the `supabase/` repository implementation are type-checked and reviewed but have never run against Postgres. Apply them to a staging project and run `supabase test db` before launch. The demo-mode implementation is what the automated tests cover.
2. **Legal texts** are drafts: lawyer review, company details and the hosting region are required ([LEGAL_REVIEW_NOTES.md](LEGAL_REVIEW_NOTES.md)).
3. **Prices** are placeholders.
4. **No email or payment provider** is connected. When you add one, update `third-parties.ts`, the privacy policy and the subprocessors page.
5. **Arabic plurals**: count strings use a single noun form, which is understandable but not always grammatical (e.g. 3–10 months). Proper plural support would need `Intl.PluralRules` in `fmt()`.
6. Run a manual **screen-reader pass** (VoiceOver/TalkBack) and a check with **real NFC tags** on iOS and Android.
7. `npm audit` reports dev-only advisories in the ESLint toolchain (see THIRD_PARTY_AUDIT.md).
