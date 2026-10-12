# Security model

## Authentication

- **Supabase Auth** (production): email + password, hashed by Supabase (bcrypt). The session is kept in HttpOnly, SameSite=Lax cookies (Secure in production) and refreshed in `src/proxy.ts`, **only on private routes**. Sessions are validated with `auth.getUser()` (a server round-trip), never by trusting the cookie alone.
- **Demo mode**: HMAC-SHA256-signed session cookie (`DEMO_SESSION_SECRET`), 8-hour expiry, scrypt password hashes, constant-time comparisons. It is refused in production unless `ALLOW_DEMO_MODE=true`.
- The same error message is shown for an unknown email and a wrong password (no account enumeration). Login is rate-limited per IP hash + email.

## Authorization (defence in depth)

1. **Route guards**, in `src/server/auth/guards.ts`: every dashboard and admin layout, page, server action and route handler calls `requireBusinessAccess` / `authorizeBusiness` / `requirePlatformAdmin` / `authorizeAdmin` on the server. The `businessId` in a URL or form is treated as untrusted input. Access to another business returns **404**, so its existence isn't revealed.
2. **Repository checks**: every business-scoped repository method re-verifies the role (`viewer < manager < owner`; platform admins pass explicitly).
3. **Postgres RLS**: dashboard queries run with the user's JWT, so the database enforces tenant isolation too (`supabase/migrations/0002_rls.sql`, tested in `supabase/tests/rls.test.sql`). Anonymous visitors have **no table access**; they can only call narrow `SECURITY DEFINER` RPCs.
4. `is_platform_admin` is always read from the database, never from client input. Users can't change their own admin flag.

Roles: **viewer** has read-only access. **manager** can also edit the profile, locations and cards, and export data. **owner** can also manage billing, data retention and deletion of the business. **platform admin** has access to everything and is audited.

## Input handling

- zod validation on the server for every input (`src/lib/validation.ts`). Client checks are only for convenience.
- No raw SQL from user input. The Supabase client and RPCs use parameterised queries.
- **XSS**: React escaping everywhere. No `dangerouslySetInnerHTML` except JSON-LD, where `<` is escaped. Legal Markdown is rendered without raw HTML, and link protocols are allowlisted.
- **Open redirects**: post-login `next` must be a same-site relative path. Card links resolve only to internal pages. The Google redirect uses only the stored URL, re-validated against a Google host allowlist.
- **Uploads**: logos must be PNG, JPEG or WebP up to 1 MB, verified by magic bytes. SVG is rejected because it can carry script.
- **CSV export**: cells are quoted, and formula-leading characters are neutralised.

## CSRF

Server Actions are POST-only, and Next.js checks that `Origin` matches the host. Cookies are SameSite=Lax. Route handlers are GET-only and read-only, except one-click unsubscribe, which is authorized by an unguessable token. `isSameOrigin()` is available for any future POST handler.

## Headers

These are set in `next.config.ts` and `src/proxy.ts`:
- CSP with a per-request nonce and `strict-dynamic`, plus `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `font-src 'self'`.
- HSTS (2 years, preload).
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- A restrictive `Permissions-Policy` (camera, microphone, geolocation, payment, interest-cohort and topics all denied).
- `Cross-Origin-Opener-Policy: same-origin`.
- `X-Powered-By` removed.

`style-src` allows `'unsafe-inline'`. Inline style attributes are needed for data-driven chart widths and validated brand colours. Scripts remain nonce-only.

## Rate limiting

There is a fixed-window limiter keyed by a **salted, daily-rotated SHA-256 hash** of the IP address; IPs are never stored. Production uses the Postgres `check_rate_limit` RPC, shared across instances, with entries purged after 1 day. Limits cover feedback, Google clicks, login, sign-up, contact, deletion requests and exports.

## Secrets

- All secrets come from environment variables. `src/server/env.ts` validates them and is marked `server-only`, so the build fails if a Client Component imports it.
- The service-role key is used **only** by the retention cron job.
- Nothing secret uses the `NEXT_PUBLIC_` prefix. The Supabase anon key is also kept server-only (`SUPABASE_ANON_KEY`): the browser never talks to Supabase, so the public RPCs can only be reached through the app, which rate-limits them.

## Logging

`src/server/security/logger.ts` logs event names plus redacted context. It drops values for keys such as password, token, secret, key, cookie, email, phone and ip, and masks email addresses. Users only ever see generic errors and an error digest, never stack traces or database messages.

## Audit trail

Business and admin mutations write to `audit_logs` (ids only, no personal data, kept 24 months), which is visible in **Admin → Audit log**.

## Reporting

Report vulnerabilities to the address in `LEGAL_CONTACT_EMAIL`.
