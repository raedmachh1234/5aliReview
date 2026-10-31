# Store — product showcase + admin

A modern storefront to show the products you sell, with an admin panel to add,
edit and remove products, prices, photos and store details. Customers order
through the contact methods you configure (WhatsApp, phone, email).

Built with Next.js 16 (App Router, Server Actions), React 19 and Tailwind CSS 4.
Light and dark mode follow the visitor's system setting.

## Quick start

```bash
npm install
npm run dev
```

- Store: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> — in development the password is **`admin`**

On first run the catalogue is created in `data/store.json` with a few sample
products. Edit or delete them from the admin panel.

## What's included

**Storefront**

- Logo animation over the store on every visit and refresh (about 4 s; a tap or any key skips it, and visitors who
  turn on Reduce Motion see the still logo briefly). It's `src/components/store/splash.css`, ported from `LogoAnimation/`
- Home page: your headline beside the lead product's photo, a three-step “How it works”, featured products
  (one wide card when there's a single product) and a contact section
- `/products`: catalogue with category filter, plus search and sorting once there are 9 or more products
- `/products/<handle>`: photo gallery, price and discount, stock status, description, specifications, tags,
  “Order on WhatsApp / Call / Email” buttons, related products, SEO metadata and structured data
- Search-engine ready: sitemap with product images, robots.txt, canonical URLs, Product / Breadcrumb /
  LocalBusiness structured data, Google Search Console verification; drafts and the admin are never indexed
- Google Business Profile ready: address, opening hours, “Get directions” and “Review us on Google” links,
  shown on the site and published as structured data

**Admin (`/admin`)**

- Overview: product counts, low-stock and sold-out alerts, inventory value, products by category
- Products: instant search and filters, publish/unpublish and feature toggles, duplicate, delete
- Product editor: name, descriptions, photos (drag-and-drop upload, reorder, cover), price and compare-at price,
  SKU and stock, category and tags, specifications, search title and description with a Google result preview,
  URL handle, live card preview, unsaved-changes guard
- Settings: store name, tagline, currency, brand colour (applied across the whole site), homepage headline and
  intro, announcement bar, WhatsApp / phone / email / Instagram / Facebook, location and opening hours for Google
  Business Profile, homepage search title and description, target keywords with a usage check, Google Search Console

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need.

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Admin password (min. 8 characters). **Required in production.** |
| `SESSION_SECRET` | Random string (min. 32 characters) used to sign the admin session. **Required in production.** Changing it, or the password, signs everyone out. |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the store (e.g. `https://myshop.tn`), used for canonical links, the sitemap and WhatsApp messages. Set it in production. On Vercel the production domain is used automatically if it's missing. |
| `GOOGLE_SITE_VERIFICATION` | Optional Search Console verification code. Admin → Settings → Search engines does the same without a redeploy. |
| `DATA_DIR` | Folder for the catalogue file and uploaded photos (default `./data`). |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Store data in Supabase instead of the local folder. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Google Search Console, Business Profile and keywords

**[docs/SEO.md](docs/SEO.md)** is the step-by-step guide: suggested keywords (French, English, Arabic) and where to
use them, how to find the real most-searched words, and how to set up Google Search Console and Google Business Profile.

The store publishes everything Google needs:

| URL | What it is |
| --- | --- |
| `/sitemap.xml` | Home, catalogue, every category and every published product, with product photos |
| `/robots.txt` | Allows the store, blocks `/admin`, points to the sitemap |
| Every page | Canonical URL, title and description; product pages carry `Product` + `BreadcrumbList` structured data, the home page `WebSite` + `LocalBusiness` (or `Organization` when online-only) |

To connect it:

1. Deploy the store on its real domain and set `NEXT_PUBLIC_SITE_URL` to that domain.
2. In [Google Search Console](https://search.google.com/search-console), add a **URL prefix** property with your store's address.
3. Choose the **HTML tag** method and copy the tag.
4. In the store, open **Admin → Settings → Search engines**, paste the tag (or just its code) and save.
5. Back in Search Console, click **Verify**.
6. Open **Sitemaps** and submit `https://your-domain/sitemap.xml` (the exact address is shown in Admin → Settings).

A **Domain** property verified through a DNS TXT record also works and needs no change in the app.
Search results pages (`/products?q=…`) are marked `noindex`, and sorting variants share the catalogue's canonical URL,
so Search Console won't report them as duplicates.

## Where data is stored

- **Local folder (default)** — `data/store.json` plus `data/uploads/`. Ideal for development and for a
  single server or VPS (`npm run build && npm start`). Back up the `data` folder.
- **Supabase** — required on serverless hosts such as Vercel, which have no permanent disk.
  1. Create a Supabase project and run the files in `supabase/migrations/` in order (`0001_…`, `0002_…`) in the SQL editor.
  2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose the key).
  3. Redeploy. Photos go to the public `product-images` storage bucket.

The admin sidebar shows which storage is active.

## Security notes

- Every admin page and Server Action checks the signed, HttpOnly session cookie; `/admin` is also guarded by `src/proxy.ts`.
- Login attempts are rate-limited per IP.
- Uploads are limited to 8 MB and checked by file signature (JPG, PNG, WebP, AVIF, GIF — no SVG).
- Strict security headers and a Content-Security-Policy are set in `next.config.ts`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, against a production build in a temporary data folder) |

## Project layout

```
src/app/(store)/        storefront pages
src/app/admin/          admin login and panel
src/app/media/          serves uploaded photos (local storage)
src/components/         UI (store, admin, shared)
src/server/actions/     Server Actions (auth, products, settings)
src/server/store/       storage: local JSON file or Supabase
src/lib/                formatting, validation, shared types
public/samples/         product photos and sample illustrations
supabase/migrations/    database schema for Supabase
```
