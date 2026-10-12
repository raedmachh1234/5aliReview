-- =============================================================================
-- 5ali Review — DEMO seed data (local development / staging only)
--
-- Everything here is FICTIONAL and flagged is_demo = true. Do not load this
-- into production. Feedback rows are generated (anonymous ratings only — the
-- schema has no personal-data columns), skewed towards 4–5 stars but covering
-- every rating so charts and filters have something to show.
--
-- Legal documents are NOT seeded here: the app publishes them.
--
-- No auth users are created. To explore the dashboard as a demo owner:
--   1. Create a user (Supabase Dashboard → Authentication → Add user, or sign
--      up through the app). The profile row is created automatically.
--   2. Attach a membership (SQL editor, runs as postgres so RLS is bypassed):
--        insert into public.business_members (business_id, user_id, role)
--        select 'd0000000-0000-4000-8000-000000000001', id, 'owner'
--        from auth.users where email = 'you@example.com';
--      Use 'manager' or 'viewer' instead of 'owner' to test lower roles.
--   3. Optional, platform admin:
--        update public.profiles set is_platform_admin = true
--        where email = 'you@example.com';
--
-- Re-runnable: demo businesses are deleted first (cascades to their data).
-- =============================================================================

delete from public.businesses
where is_demo
  and id in (
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003'
  );

-- -----------------------------------------------------------------------------
-- Businesses
-- (Google review links use a fake place id: they show Google's error page.)
-- -----------------------------------------------------------------------------
insert into public.businesses (
  id, name, slug, logo_alt, brand_primary, brand_accent, description, google_review_url, website, phone,
  email, address, opening_hours, social_links, default_locale, status, feedback_retention_months, is_demo
) values
  (
    'd0000000-0000-4000-8000-000000000001',
    'Café El Bahia',
    'cafe-el-bahia',
    'Café El Bahia logo',
    '#0b5c47',
    '#f2b134',
    'Specialty coffee, fresh pastries and a sea breeze. Demo business.',
    'https://search.google.com/local/writereview?placeid=DEMO-cafe-el-bahia',
    'https://example.com/cafe-el-bahia',
    '+216 71 000 001',
    'hello@example.com',
    'Avenue Habib Bourguiba, Tunis (demo)',
    '{"mon": "07:00–22:00", "tue": "07:00–22:00", "wed": "07:00–22:00", "thu": "07:00–22:00", "fri": "07:00–23:00", "sat": "08:00–23:00", "sun": "08:00–21:00"}',
    '{"instagram": "https://instagram.com/example", "facebook": "https://facebook.com/example"}',
    'fr',
    'active',
    24,
    true
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'Salon Paris',
    'salon-paris',
    'Salon Paris logo',
    '#7a2e5c',
    '#e8c4d8',
    'Hair & beauty salon. Demo business.',
    'https://search.google.com/local/writereview?placeid=DEMO-salon-paris',
    null,
    '+216 71 000 002',
    null,
    'Rue de Marseille, Tunis (demo)',
    '{"tue": "09:00–19:00", "wed": "09:00–19:00", "thu": "09:00–19:00", "fri": "09:00–20:00", "sat": "09:00–20:00"}',
    '{"instagram": "https://instagram.com/example"}',
    'fr',
    'active',
    12,
    true
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    'Atlas Gym',
    'atlas-gym',
    'Atlas Gym logo',
    '#1f3a93',
    '#ff7a00',
    'Strength, cardio and classes. Demo business.',
    null,
    'https://example.com/atlas-gym',
    '+216 71 000 003',
    null,
    'Les Berges du Lac, Tunis (demo)',
    '{"mon": "06:00–23:00", "tue": "06:00–23:00", "wed": "06:00–23:00", "thu": "06:00–23:00", "fri": "06:00–23:00", "sat": "08:00–20:00", "sun": "08:00–14:00"}',
    '{}',
    'ar',
    'active',
    24,
    true
  );

-- -----------------------------------------------------------------------------
-- Locations (Café El Bahia has two branches)
-- -----------------------------------------------------------------------------
insert into public.locations (id, business_id, name, slug, address, phone, google_review_url, opening_hours) values
  (
    'd0000000-0000-4000-8000-000000000101',
    'd0000000-0000-4000-8000-000000000001',
    'La Marsa',
    'la-marsa',
    'Corniche de La Marsa (demo)',
    '+216 71 000 011',
    'https://search.google.com/local/writereview?placeid=DEMO-bahia-la-marsa',
    '{}'
  ),
  (
    'd0000000-0000-4000-8000-000000000102',
    'd0000000-0000-4000-8000-000000000001',
    'Lac 2',
    'lac-2',
    'Les Berges du Lac 2 (demo)',
    '+216 71 000 012',
    null,
    '{}'
  );

-- -----------------------------------------------------------------------------
-- NFC cards (codes use the unambiguous alphabet: no I, O, 0, 1)
-- -----------------------------------------------------------------------------
insert into public.nfc_cards (id, code, business_id, location_id, label, status) values
  ('d0000000-0000-4000-8000-000000000201', 'BAHMRS23', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000101', 'La Marsa — counter', 'active'),
  ('d0000000-0000-4000-8000-000000000202', 'BAHLAC45', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000102', 'Lac 2 — terrace', 'active'),
  ('d0000000-0000-4000-8000-000000000205', 'BAHQRC2X', 'd0000000-0000-4000-8000-000000000001', null, 'Old table card (retired)', 'inactive'),
  ('d0000000-0000-4000-8000-000000000203', 'SALPRS67', 'd0000000-0000-4000-8000-000000000002', null, 'Reception desk', 'active'),
  ('d0000000-0000-4000-8000-000000000204', 'ATLGYM89', 'd0000000-0000-4000-8000-000000000003', null, 'Front desk', 'active');

-- -----------------------------------------------------------------------------
-- ~90 days of anonymous ratings
-- Per target: average ratings/day and cumulative thresholds for 1★..4★
-- (everything above p4 is 5★). Weekends get a small bump.
-- -----------------------------------------------------------------------------
select setseed(0.42);

with targets (business_id, location_id, card_id, per_day, p1, p2, p3, p4) as (
  values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000101'::uuid, 'd0000000-0000-4000-8000-000000000201'::uuid, 6, 0.04, 0.08, 0.18, 0.45),
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000102'::uuid, 'd0000000-0000-4000-8000-000000000202'::uuid, 4, 0.06, 0.11, 0.24, 0.52),
    ('d0000000-0000-4000-8000-000000000002'::uuid, null, 'd0000000-0000-4000-8000-000000000203'::uuid, 3, 0.03, 0.06, 0.14, 0.40),
    ('d0000000-0000-4000-8000-000000000003'::uuid, null, 'd0000000-0000-4000-8000-000000000204'::uuid, 5, 0.08, 0.15, 0.30, 0.58)
),
days as (
  select (current_date - i) as day from generate_series(0, 89) as i
),
samples as (
  select
    t.business_id,
    t.location_id,
    t.card_id,
    t.p1, t.p2, t.p3, t.p4,
    d.day,
    random() as r_rating,
    random() as r_source,
    random() as r_hour,
    random() as r_minute
  from targets t
  cross join days d
  cross join lateral generate_series(
    1,
    greatest(0, round(t.per_day * (0.4 + random() * 1.2) + case when extract(isodow from d.day) in (6, 7) then 2 else 0 end)::integer)
  ) as n
),
shaped as (
  select
    s.*,
    case when s.r_source < 0.6 then 'nfc' when s.r_source < 0.9 then 'qr' else 'link' end as source,
    s.day + make_interval(hours => 8 + floor(s.r_hour * 14)::integer, mins => floor(s.r_minute * 60)::integer) as created_at
  from samples s
)
insert into public.feedback (business_id, location_id, card_id, rating, source, created_at)
select
  sh.business_id,
  sh.location_id,
  case when sh.source = 'nfc' then sh.card_id end,
  case
    when sh.r_rating < sh.p1 then 1
    when sh.r_rating < sh.p2 then 2
    when sh.r_rating < sh.p3 then 3
    when sh.r_rating < sh.p4 then 4
    else 5
  end,
  sh.source::public.feedback_source,
  sh.created_at
from shaped sh
where sh.created_at <= now();

-- -----------------------------------------------------------------------------
-- Daily event counters, derived from the generated feedback so the funnel
-- (views → ratings → Google clicks) looks plausible.
-- -----------------------------------------------------------------------------
with daily as (
  select
    f.business_id,
    f.location_id,
    (f.created_at at time zone 'UTC')::date as day,
    count(*) as total,
    count(*) filter (where f.source = 'nfc') as nfc,
    count(*) filter (where f.source = 'qr') as qr,
    count(*) filter (where f.rating >= 4) as happy
  from public.feedback f
  where f.business_id in (
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000003'
  )
  group by 1, 2, 3
),
counters as (
  select business_id, location_id, day, 'feedback_submitted'::public.event_type as type, total::integer as count from daily
  union all
  select business_id, location_id, day, 'page_view'::public.event_type, ceil(total * (2.5 + random()))::integer from daily
  union all
  select business_id, location_id, day, 'nfc_visit'::public.event_type, ceil(nfc * (1.2 + random() * 0.4))::integer from daily where nfc > 0
  union all
  select business_id, location_id, day, 'qr_scan'::public.event_type, ceil(qr * (1.2 + random() * 0.4))::integer from daily where qr > 0
  union all
  select business_id, location_id, day, 'google_review_clicked'::public.event_type, floor(happy * (0.4 + random() * 0.3))::integer from daily where happy > 0
)
insert into public.event_daily_counts (business_id, location_id, card_id, day, type, count)
select business_id, location_id, null::uuid, day, type, count
from counters
where count > 0;

-- -----------------------------------------------------------------------------
-- Subscriptions & invoices (plan ids match src/config/plans.ts)
-- -----------------------------------------------------------------------------
insert into public.subscriptions (business_id, plan_id, "interval", status, current_period_end, cancel_at_period_end) values
  ('d0000000-0000-4000-8000-000000000001', 'business', 'month', 'active', now() + interval '18 days', false),
  ('d0000000-0000-4000-8000-000000000002', 'starter', 'year', 'active', now() + interval '200 days', false),
  ('d0000000-0000-4000-8000-000000000003', 'starter', 'month', 'trialing', now() + interval '9 days', false);

insert into public.invoices (business_id, number, amount_minor, currency, status, description, issued_at, paid_at) values
  ('d0000000-0000-4000-8000-000000000001', 'DEMO-000001', 59000, 'TND', 'paid', 'Business plan — monthly (demo)', now() - interval '42 days', now() - interval '41 days'),
  ('d0000000-0000-4000-8000-000000000001', 'DEMO-000002', 59000, 'TND', 'paid', 'Business plan — monthly (demo)', now() - interval '12 days', now() - interval '11 days'),
  ('d0000000-0000-4000-8000-000000000002', 'DEMO-000003', 290000, 'TND', 'paid', 'Starter plan — yearly (demo)', now() - interval '165 days', now() - interval '164 days');
