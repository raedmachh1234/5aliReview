# Third-party audit (requirement #8)

Last reviewed: 2026-10-08. The machine-readable source is `src/config/third-parties.ts`, which is also rendered on `/legal/subprocessors`.

## Services that receive data

| Service | Why it exists | Data | Loaded in the browser? |
| --- | --- | --- | --- |
| Supabase | Database, authentication, logo storage | Dashboard accounts (email, hashed password), business data, anonymous ratings | No. All access is server-side; the browser never talks to Supabase directly. Logos are served from Supabase Storage URLs. |
| Vercel | Hosting / serverless functions | Transient request data (IP, user agent) to serve pages. Vercel Analytics is **not** enabled. | No |
| Google | Destination of the optional "Leave a Google Review" button | Nothing is sent by 5ali; the customer navigates to Google only if they tap the button | No (plain link, no Google scripts, maps or fonts) |

**Not yet integrated:** email delivery and payment providers. When you add one, list it in `third-parties.ts`, the privacy policy and the subprocessors page *before* going live.

## npm dependencies (runtime)

| Package | Why | Ships to the browser? |
| --- | --- | --- |
| next, react, react-dom | Framework | Yes (framework runtime) |
| @supabase/supabase-js, @supabase/ssr | Database/auth client | No (server only) |
| zod | Input validation on the server (the source of truth) | Only small schema helpers if imported client-side; currently server-side |
| qrcode | Generates QR codes on our server (no external QR service) | No |
| react-markdown, remark-gfm | Renders admin-editable legal documents safely (no raw HTML) | No (Server Components) |
| server-only | Build-time guard that keeps secret modules out of client bundles | No |

Deliberately **not** used: chart libraries (charts are hand-built SVG), icon libraries (inline SVG), UI kits, animation libraries, date libraries (native `Intl`), analytics/ads/social SDKs and CDNs.

## Dev-only dependencies

ESLint, TypeScript, Tailwind, Vitest, Testing Library, jsdom, Playwright and axe-core. None of them ship to users.

`npm audit` (2026-10-08) reports 5 high-severity advisories in `braces`, which is pulled in only through the ESLint toolchain (`eslint-config-next` → `fast-glob` → `micromatch`). That code doesn't ship to users, and npm's suggested "fix" downgrades `eslint-config-next` to v14. Recheck when `eslint-config-next` updates.

## Fonts

Manrope and IBM Plex Sans Arabic, both SIL Open Font License 1.1, self-hosted via `next/font` at build time. No requests go to Google Fonts from visitors' browsers. See [FONTS.md](FONTS.md).
