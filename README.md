# 5ali Review

NFC & QR customer-feedback cards with honest Google reviews.

A customer taps a 5ali Review NFC card (or scans its QR code), lands on a mobile page for that business, rates the visit from 1 to 5 stars, and is then offered **the same optional "Leave a Google Review" button whatever they rated**. There is no review gating. Business owners see anonymous ratings and analytics in a dashboard, and 5ali staff manage everything from an admin panel.

```
NFC card / QR code ──► /t/<CARD>  ──►  /r/<business>  ──►  1–5 ★  ──►  Thank you  ──►  Google (optional, same for everyone)
```

## Quick start (demo mode, no accounts needed)

```bash
npm install
npm run dev            # http://localhost:3000
```

With no Supabase credentials the app runs in **demo mode**: in-memory, clearly-labelled sample data (fictional businesses, generated ratings — none are real reviews).

| Try | URL |
| --- | --- |
| Customer page | http://localhost:3000/r/cafe-el-bahia |
| Customer page via an NFC card | http://localhost:3000/t/CAFEMRS2 |
| Arabic / RTL | http://localhost:3000/r/cafe-el-bahia?lang=ar |
| Business without a Google link | http://localhost:3000/r/atlas-gym |
| Dashboard | http://localhost:3000/login → `owner@demo.5ali.tn` |
| Admin | http://localhost:3000/login → `admin@demo.5ali.tn` |

All demo accounts use the password `demo-password-2026`. `salon@demo.5ali.tn` owns a different business, which is useful for checking tenant isolation.

## Production setup

1. Create a Supabase project and apply `supabase/migrations/*` (see [supabase/README.md](supabase/README.md)).
2. Copy `.env.example` to `.env.local` (or set the variables in Vercel) and fill in the Supabase keys, `IP_HASH_SALT`, `CRON_SECRET` and the `LEGAL_*` company details.
3. Sign up, then mark your account as platform admin in SQL: `update profiles set is_platform_admin = true where email = '…';`
4. Deploy to Vercel. `vercel.json` schedules the daily data-retention job.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Before launch — required manual steps

- [ ] Have a qualified lawyer review the legal documents ([docs/LEGAL_REVIEW_NOTES.md](docs/LEGAL_REVIEW_NOTES.md)) and edit them in **Admin → Legal documents**.
- [ ] Set real prices in `src/config/plans.ts` and set `PRICING_IS_PLACEHOLDER = false`.
- [ ] Fill in every `LEGAL_*` variable. Placeholders such as `[Company legal name]` stay visible until you do.
- [ ] If you send marketing email, connect an email provider (`src/server/email`) and add it to `src/config/third-parties.ts`.
- [ ] If you connect a payment provider (Konnect, Flouci, Stripe…), add it to the third-party list and the legal documents.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): no-gating, tenant isolation, security, i18n parity |
| `npm run test:e2e` | End-to-end + axe accessibility tests (Playwright, uses installed Chrome; run `npm run build` first) |
| `npm run check:no-gating` | CI guard that fails if the Google option ever depends on the rating |

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript (strict) · Tailwind CSS 4 · Supabase (Postgres + RLS + Auth + Storage) · zod · qrcode. Fonts are self-hosted (OFL). There are no analytics, ads or tracking scripts. See [docs/THIRD_PARTY_AUDIT.md](docs/THIRD_PARTY_AUDIT.md).

## Project map

```
src/app/r/[slug]          customer feedback page, its server action, Google redirect
src/app/t/[code]          permanent NFC/QR card link → resolves to the business page
src/app/(site)            marketing, pricing, FAQ, contact, legal, data deletion, auth pages
src/app/dashboard         business dashboard (every route re-checks access server-side)
src/app/admin             platform admin
src/server/data           repository interface + supabase/ and demo/ implementations
src/server/auth           sessions and authorization guards
src/server/security       rate limiting, IP hashing, origin checks, redacting logger
src/i18n                  en (source) / fr / ar dictionaries, locale resolution
src/config                site, company (legal entity), plans, cookies, third parties
supabase/                 migrations, RLS policies, RPCs, seed, pgTAP tests
docs/                     compliance checklist, security, privacy, a11y, deployment
```

## Legal notice

This codebase is built to support privacy, consumer-protection and accessibility best practices. It does **not** make any website automatically compliant with the law in any country. Compliance depends on your jurisdiction, your business model and how you operate the service. Get professional legal advice.
