# Deployment (Vercel + Supabase)

1. **Supabase**
   - Create a project in an EU region (or wherever your legal review says data should live). Note it in `LEGAL_HOSTING_REGION`.
   - Apply `supabase/migrations/0001…0003` in order (`supabase db push`, or paste them into the SQL editor).
   - Optionally load `supabase/seed.sql` into a **staging** project only. It is demo data.
   - Under Auth → URL configuration, set the Site URL to your domain and add `https://<domain>/auth/callback` as a redirect URL.
2. **Vercel**
   - Import the repo. Framework: Next.js. Node 20.9+.
   - Set the environment variables from `.env.example`. Generate `IP_HASH_SALT` and `CRON_SECRET` randomly. Set `NEXT_PUBLIC_SITE_URL=https://5ali.tn`.
   - Set the function region close to your users and Supabase region, for example `fra1`. Vercel's default region is in the US, so check what your privacy policy says.
   - `vercel.json` registers the daily retention cron. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.
3. **First admin**: sign up on the live site, confirm your email, then in SQL run `update public.profiles set is_platform_admin = true where email = 'you@…';`
4. **HTTPS**: Vercel provides TLS. HSTS is sent with `preload`; submit the domain to hstspreload.org only once you're sure every subdomain serves HTTPS.
5. **Smoke test**: run `/t/<card>` → rate → Google, then the dashboard, export, and a deletion request in the admin queue.

## NFC cards

Write `https://<domain>/t/<CARD_ID>` (shown in Dashboard → NFC Cards) as a URL/URI NDEF record and lock the tag. Print the QR from Dashboard → QR Codes. It encodes the same link with `?s=qr`, so scans are counted separately from taps.
