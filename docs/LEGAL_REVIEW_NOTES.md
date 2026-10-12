# Legal review notes — 5ali Review default legal documents

These notes are for the lawyer reviewing the default English legal documents in
`src/content/legal/en/` (privacy.md, terms.md, refunds.md, cookies.md,
subprocessors.md). The documents were drafted from the code and configuration
(`src/config/cookies.ts`, `src/config/third-parties.ts`, `src/config/plans.ts`,
`src/config/company.ts`, `src/lib/types.ts`, `src/server/data/repository.ts`)
and from product facts supplied by the team. They are **not** legal advice and
have not been reviewed by a lawyer.

Every item below is an assumption or a business choice that must be confirmed,
changed or removed before launch.

## 1. Data protection law (Tunisia)

- [ ] **Applicable law.** The documents assume Tunisian Organic Law No. 2004-63
  of 27 July 2004 on the protection of personal data applies to the operating company.
  Check whether any newer law or reform bill has replaced or amended it, and
  whether Tunisia's accession to Council of Europe Convention 108 (and its
  protocol) changes any obligations.
- [ ] **INPDP declaration / authorisation.** Law 2004-63 requires a prior
  declaration to the INPDP before processing personal data, and an
  authorisation for some processing. Confirm what must be filed for: business
  accounts, contact requests, marketing emails, hashed IP rate limiting, audit
  logs, and ratings processed on behalf of businesses. The documents do not
  claim any declaration has been made.
- [ ] **Transfers abroad.** Law 2004-63 restricts transfers of personal data
  outside Tunisia (an INPDP authorisation is generally required). Supabase and
  Vercel are foreign providers and Vercel's edge network may process requests in
  many countries. The privacy policy says only "we rely on the safeguards offered
  by our providers and on the transfer rules that apply to us" — confirm what
  authorisation or safeguards are actually needed and update the text.
- [ ] **Legal bases.** The privacy policy uses GDPR-style bases (contract,
  legitimate interests, consent, legal obligation). Tunisian law relies mainly
  on consent with listed exceptions. Confirm that "legitimate interests" is an
  acceptable basis under Tunisian law for: rate limiting, audit logs, answering
  contact requests. If not, rephrase.
- [ ] **Controller / processor framing.** We describe businesses as controllers
  and 5ali as processor for ratings. Tunisian law uses different terms
  ("responsable du traitement", "sous-traitant"). Confirm the framing and whether
  a written processing agreement with each business is required.
- [ ] **Are ratings personal data at all?** Ratings store only rating, business
  id, optional location id, optional card id, source and timestamp. They are
  probably not personal data on their own, but could become linkable (e.g. a
  business combining timestamp + card with CCTV or receipts). Confirm whether the
  processor framing and the rights section for customers are needed and correctly
  worded.
- [ ] **Hashed IP addresses.** A salted SHA-256 hash of an IP, kept up to 1 day,
  is pseudonymised data and is treated as personal data in the policy. Confirm.
- [ ] **Data subject rights.** The policy lists access, export, correction,
  deletion, objection, withdrawal of consent and complaint. "Export"
  (portability) is a GDPR concept offered here as a product feature. Confirm the
  rights list and the target "we aim to reply within 30 days" against the legal
  deadline under Tunisian law.
- [ ] **Supervisory authority wording.** Default value of
  `company.supervisoryAuthority` mentions INPDP. Confirm the official name and
  whether contact details should be added.
- [ ] **DPO.** No data protection officer is named. Confirm none is required.
- [ ] **Breach notification.** The documents make no promise about breach
  notification. Confirm any legal duty and whether to add a commitment.
- [ ] **Direct marketing.** Marketing emails are opt-in only, with one-click
  unsubscribe. Confirm Tunisian rules on direct marketing consent and that the
  unchecked opt-in box on the contact form is sufficient.

## 2. GDPR and other foreign laws

- [ ] **GDPR applicability.** If 5ali offers the service to businesses in the EU,
  or EU residents rate businesses using the cards, the GDPR may apply
  (Article 3(2)). If so, check: EU representative (Article 27), a data
  processing agreement with each business customer (Article 28), records of
  processing, and safeguards for transfers (e.g. standard contractual clauses).
- [ ] **ePrivacy / cookie rules.** The cookie policy follows the EU approach
  (consent for non-essential cookies). Tunisian law has no specific cookie rule
  that we are aware of. Confirm the approach is acceptable for all target markets.
- [ ] Hosting region text: `company.hostingRegion` must reflect **both** the
  Supabase project region **and** the Vercel serverless function region (Vercel's
  default function region is in the US unless configured otherwise).

## 3. Commercial and consumer law

- [ ] **B2B only.** The terms state the service is for businesses, not personal
  use. Confirm this is enforceable and whether sole traders could count as
  consumers under Tunisian law (e.g. Law No. 2000-83 on electronic exchanges and
  commerce, Law No. 92-117 on consumer protection).
- [ ] **Withdrawal / cooling-off rights.** Law 2000-83 gives consumers a
  withdrawal period for online purchases. The 14-day return window for unused
  NFC cards is drafted as a voluntary offer ("we offer"), not a statutory right.
  Confirm whether a statutory withdrawal right applies (to subscriptions or
  cards) and must be stated, including any exceptions for custom-made goods.
- [ ] **E-commerce information duties.** Check that the site displays all
  information Law 2000-83 requires (seller identity, address, phone, prices,
  taxes, delivery costs, payment terms, delivery times, withdrawal information).
  `company.phone` exists in config but is not used in the legal documents.
- [ ] **Automatic renewal.** Terms say subscriptions renew automatically until
  cancelled and that we email before any price change. Confirm any notice rules
  for automatic renewal.
- [ ] **Electronic contract formation.** Terms are accepted by click-through.
  Confirm validity and how acceptance should be recorded.
- [ ] **Language.** Arabic, French and English versions are planned. Confirm
  which version prevails in case of conflict and whether an Arabic or French
  version is legally required.

## 4. Liability, terms and disputes

- [ ] **Liability cap** (12 months of fees) and exclusion of indirect losses,
  "to the extent permitted by law". Confirm enforceability under the Tunisian
  Code of Obligations and Contracts (exclusions for fraud or gross fault are
  generally void).
- [ ] **Indemnity** ("Your responsibility" section). Confirm wording.
- [ ] **Governing law and courts.** `company.governingLaw` is a placeholder.
  Decide law, competent courts (or arbitration/mediation), and phrase it so it
  reads correctly after "Governing law and courts:".
- [ ] **30-day notice** for important changes to terms — business choice, confirm.
- [ ] **Anonymous platform-wide statistics** clause (Terms → "Your content and
  customer feedback"). Business choice; the admin overview already counts
  ratings across businesses. Confirm or remove.
- [ ] **Suspension for non-payment**, and "we may act immediately" in urgent
  cases. Confirm.

## 5. Billing, VAT and accounting

- [ ] **Prices are placeholders.** `PRICING_IS_PLACEHOLDER` is `true` in
  `src/config/plans.ts`. Real prices, trial length and tax treatment must be set.
- [ ] **VAT (TVA).** Documents say prices exclude VAT, added at the applicable
  rate. Confirm the rate(s) for the SaaS subscription and for physical NFC cards,
  treatment of foreign customers (export of services), and required invoice
  details (e.g. tax ID / matricule fiscal).
- [ ] **Electronic invoicing.** Check whether mandatory electronic invoicing
  rules in Tunisia apply to 5ali's invoices.
- [ ] **Accounting retention period.** Documents say invoices are kept "as long
  as accounting and tax law requires" (commonly 10 years in Tunisia — verify).
  Consider stating the exact period in the retention table.
- [ ] **Refunds and credit notes.** Confirm how refunds are documented (credit
  note) and how VAT on refunded amounts is handled.
- [ ] **Bank transfer only.** No payment processor is integrated. If one is
  added (e.g. a card payment provider), update the privacy policy, subprocessors
  list, terms and refund policy.

## 6. Refund policy business choices

- [ ] No refund of unused time after cancellation, except when 5ali closes the
  account without breach, stops the service, or removes a major paid feature.
- [ ] Billing errors and duplicate payments always refunded once verified.
- [ ] Defective cards replaced free after confirmation — no time limit is stated;
  decide whether to add one (e.g. 12 months).
- [ ] 14-day return window for unused, undamaged **separately bought** cards;
  custom-printed cards returnable only if defective; return shipping at the
  customer's cost unless defective. Confirm cards are/aren't custom-printed.
- [ ] Lost or stolen cards are not refunded.
- [ ] Target timelines: reply within 5 business days; refund sent within 10
  business days of approval.

## 7. Facts to confirm in the product

- [ ] **Email provider not listed.** The product sends marketing emails
  (with unsubscribe) and account emails, but no email delivery provider is listed
  in `src/config/third-parties.ts`. Supabase Auth may send auth emails with its
  own mail service. Any email provider must be added to `third-parties.ts` and
  the subprocessors/privacy documents.
- [ ] **Supabase auth cookie chunks.** Supabase SSR may split the auth cookie
  into several cookies (`sb-<project>-auth-token.0`, `.1`, …). Confirm and, if
  so, mention it in `cookies.ts` and the cookie policy.
- [ ] **Local storage.** The cookie policy covers cookies only. Confirm the app
  does not use localStorage/sessionStorage for anything that needs disclosure.
- [ ] **Customer pages set no cookies** (including no consent or language
  cookie). Confirm in production.
- [ ] **Retention not defined in code/spec:** marketing subscription records
  (drafted as "until you unsubscribe or ask us to delete it" — decide whether a
  suppression record is kept after unsubscribing) and data deletion requests
  (drafted as "as long as needed to show we handled the request" — set a period).
- [ ] **Counters retention.** The documents apply the business's retention
  setting (1–60 months, default 24) to both ratings and daily counters. Confirm
  the purge job does this.
- [ ] **Who sees ratings.** The privacy policy says business members (owner,
  manager, viewer) see their own business's ratings and statistics. The dashboard
  lists individual ratings (rating, time, location), not only aggregates. Confirm
  this is acceptable.
- [ ] **Audit logging of admin actions.** The policy says important dashboard and
  admin actions are logged. Confirm that is implemented.
- [ ] **Routes used in links.** Documents link to `/legal/privacy`,
  `/legal/terms`, `/legal/refunds`, `/legal/cookies`, `/legal/subprocessors`,
  `/pricing` and `/data-deletion`, and refer to "Dashboard → Privacy",
  "Billing" in the dashboard and the "Cookie settings" footer link. Confirm these
  exist (and work with locale prefixes, if any).
- [ ] **Age requirement** of 18 or local age of majority for dashboard accounts —
  confirm how this is checked at sign-up.

## 8. Google

- [ ] Confirm the acceptable-use rules match Google's current policies on
  review gating ("selectively soliciting positive reviews"), fake reviews and
  incentivised reviews.
- [ ] Trademark: the product is described as "Google review cards". Confirm the
  use of the word "Google" in marketing is acceptable (nominative use) and keep
  the non-affiliation statement ("Google is a trademark of Google LLC.
  5ali Review is not affiliated with, sponsored by or endorsed by Google").
- [ ] The documents make no claim about Google approval, partnership, review
  counts, ratings or ranking. Keep it that way in marketing pages.

## 9. Placeholder checklist

Placeholders are substituted by the app from `src/config/company.ts` (env vars
in brackets). Values in `[…]` must be filled before launch.

| Placeholder | Current default | Env var | To do |
| --- | --- | --- | --- |
| `{{company.legalName}}` | `[Company legal name]` | `LEGAL_COMPANY_NAME` | Fill in exact registered name and legal form |
| `{{company.tradeName}}` | `5ali Review` | — (hard-coded) | Confirm |
| `{{company.registrationNumber}}` | `[Registration / RNE number]` | `LEGAL_REGISTRATION_NUMBER` | Fill in RNE number (consider adding tax ID) |
| `{{company.address}}` | `[Registered address]` | `LEGAL_ADDRESS` | Fill in |
| `{{company.country}}` | `Tunisia` | `LEGAL_COUNTRY` | Confirm |
| `{{company.contactEmail}}` | `hello@5ali.tn` | `LEGAL_CONTACT_EMAIL` | Confirm mailbox exists and is monitored |
| `{{company.privacyEmail}}` | `privacy@5ali.tn` | `LEGAL_PRIVACY_EMAIL` | Confirm mailbox exists and is monitored |
| `{{company.billingEmail}}` | `billing@5ali.tn` | `LEGAL_BILLING_EMAIL` | Confirm mailbox exists and is monitored |
| `{{company.governingLaw}}` | `[Governing law / jurisdiction]` | `LEGAL_GOVERNING_LAW` | Decide, e.g. law + competent courts |
| `{{company.supervisoryAuthority}}` | "the competent data protection authority in your country (in Tunisia: INPDP — …)" | `LEGAL_SUPERVISORY_AUTHORITY` | Confirm wording |
| `{{company.hostingRegion}}` | `[Hosting region, e.g. EU (Frankfurt)]` | `LEGAL_HOSTING_REGION` | Fill in Supabase + Vercel function regions |
| `{{lastUpdated}}` | set by the app | — | Confirm it shows the publish date |

Not used in the documents: `company.phone` (`LEGAL_PHONE`) — decide whether a
phone number must be shown (see e-commerce information duties above).

## 10. Translations

Only English versions exist. French and Arabic versions (`fr`, `ar` locales)
must be translated and reviewed, and the prevailing language decided.
