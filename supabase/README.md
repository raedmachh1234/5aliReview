# Supabase — database, RLS and storage

| File | Purpose |
| --- | --- |
| `migrations/0001_schema.sql` | Tables, enums, indexes, `updated_at` and profile triggers |
| `migrations/0002_rls.sql` | Privileges, RLS helpers (`is_platform_admin`, `has_business_role`), policies |
| `migrations/0003_functions.sql` | RPCs (public, member, admin, maintenance) + `business-logos` bucket and policies |
| `seed.sql` | Fictional demo data (`is_demo = true`) — local/staging only |
| `tests/rls.test.sql` | pgTAP tests for tenant isolation and privileges |

Requires PostgreSQL 15+ (every current Supabase project). Anonymous visitors have **no** table
privileges: the public pages only use the `SECURITY DEFINER` RPCs.

## Apply the migrations

With the Supabase CLI (recommended):

```bash
supabase link --project-ref <your-project-ref>
supabase db push            # applies migrations/ in order
```

Without the CLI: open **SQL Editor** in the dashboard and run `0001_schema.sql`, `0002_rls.sql`
and `0003_functions.sql` in that order. Load `seed.sql` only on a non-production project.

Locally, `supabase start` followed by `supabase db reset` applies the migrations and the seed.

Note: 0002 removes Supabase's default "grant everything to anon/authenticated" for new tables and
functions in `public`. Anything you add later must be granted explicitly (and have RLS enabled).

## Run the tests

```bash
supabase test db
```

The tests run in a transaction that is rolled back, so they are safe to run against a local
database that also contains the seed data.

## Create the first platform admin

1. Sign up through the app (or **Authentication → Add user** in the dashboard). A `profiles` row
   is created automatically.
2. In the SQL editor (runs as `postgres`, so the self-promotion guard does not apply):

   ```sql
   update public.profiles set is_platform_admin = true where email = 'you@example.com';
   ```

Further admins can then be promoted from the admin UI (`admin_set_platform_admin`); the last
admin can never be removed.

## Schedule data purging (retention)

`public.purge_expired_data()` deletes feedback and event counters older than each business's
`feedback_retention_months`, contact requests > 12 months, audit logs > 24 months, rate-limit
windows > 1 day and resolved deletion requests > 24 months. Only `service_role` (and the
database owner) may execute it. Run it daily with **one** of:

**pg_cron** (Dashboard → Integrations → Cron, or SQL):

```sql
create extension if not exists pg_cron;
select cron.schedule('purge-expired-data', '17 3 * * *', $$select public.purge_expired_data()$$);
```

**Vercel Cron**: add a cron entry in `vercel.json` that calls the app's purge route, which must
check `Authorization: Bearer $CRON_SECRET` and then call `repository.maintenance.purgeExpiredData()`
(uses `SUPABASE_SERVICE_ROLE_KEY` server-side):

```json
{ "crons": [{ "path": "/api/cron/purge", "schedule": "17 3 * * *" }] }
```
