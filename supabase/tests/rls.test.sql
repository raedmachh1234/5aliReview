-- =============================================================================
-- RLS / privilege tests — run with `supabase test db`.
-- Everything runs inside one transaction and is rolled back at the end.
-- Identity is simulated the way PostgREST does it: SET ROLE + request.jwt.claims.
-- Counts are always scoped to the fixture businesses so seed data never interferes.
-- =============================================================================
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- -----------------------------------------------------------------------------
-- Fixtures (as postgres → RLS bypassed)
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'owner-a@test.local', '{"full_name": "Owner A"}'),
  ('22222222-2222-4222-8222-222222222222', 'owner-b@test.local', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'viewer-a@test.local', '{}'),
  ('44444444-4444-4444-8444-444444444444', 'admin@test.local', '{}');

update public.profiles set is_platform_admin = true where id = '44444444-4444-4444-8444-444444444444';

insert into public.businesses (id, name, slug) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test Business A', 'test-biz-a'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Test Business B', 'test-biz-b');

insert into public.locations (id, business_id, name, slug) values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Main', 'main');

insert into public.business_members (business_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'viewer');

insert into public.feedback (business_id, rating, source) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 5, 'qr'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 4, 'nfc'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 2, 'link');

select ok(
  (select p.email = 'owner-a@test.local' and p.full_name = 'Owner A' from public.profiles p
   where p.id = '11111111-1111-4111-8111-111111111111'),
  'auth.users insert creates the profile (email + full_name copied)'
);

-- -----------------------------------------------------------------------------
-- Owner of business A
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated", "email": "owner-a@test.local"}', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.feedback where business_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  2,
  'member of A can read A feedback'
);

select is(
  (select count(*)::integer from public.feedback where business_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0,
  'member of A cannot read B feedback'
);

select is(
  (select count(*)::integer from public.businesses
   where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  1,
  'member of A sees business A only'
);

select throws_ok(
  $$update public.profiles set is_platform_admin = true where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'non-admin cannot set is_platform_admin on their own profile'
);

select throws_ok(
  $$select public.admin_set_platform_admin('11111111-1111-4111-8111-111111111111', true)$$,
  '42501',
  null,
  'non-admin cannot use admin_set_platform_admin'
);

select lives_ok(
  $$update public.profiles set full_name = 'Owner A (renamed)' where id = '11111111-1111-4111-8111-111111111111'$$,
  'user can update their own full_name'
);

select throws_ok(
  $$update public.businesses set slug = 'stolen-slug' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'owner cannot change the business slug (admin only)'
);

select lives_ok(
  $$update public.businesses set feedback_retention_months = 12 where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'owner can change data retention'
);

select throws_ok(
  $$update public.businesses set google_review_url = 'https://evil.example/review' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  null,
  'non-Google review URLs are rejected by the database'
);

select throws_ok(
  $$select public.set_cancel_at_period_end('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true)$$,
  '42501',
  null,
  'owner of A cannot change the subscription of B'
);

reset role;

-- -----------------------------------------------------------------------------
-- Viewer of business A
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated", "email": "viewer-a@test.local"}', true);
set local role authenticated;

select lives_ok(
  $$update public.locations set name = 'Hacked' where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  'viewer update on locations runs (and is filtered by RLS)'
);

select is(
  (select name from public.locations where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'),
  'Main',
  'viewer cannot update locations'
);

select throws_ok(
  $$insert into public.locations (business_id, name, slug) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'New', 'new')$$,
  '42501',
  null,
  'viewer cannot create locations'
);

reset role;

-- -----------------------------------------------------------------------------
-- Anonymous visitor
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;

select throws_ok('select * from public.feedback', '42501', null, 'anon cannot select feedback directly');
select throws_ok('select * from public.businesses', '42501', null, 'anon cannot select businesses directly');

select ok(
  public.submit_feedback('test-biz-a', 'main', null, 5, 'qr'),
  'anon can submit feedback through submit_feedback'
);

select throws_ok(
  $$select public.submit_feedback('test-biz-a', null, null, 0, 'qr')$$,
  '22023',
  null,
  'rating 0 is rejected'
);

select throws_ok(
  $$select public.submit_feedback('test-biz-a', null, null, 6, 'qr')$$,
  '22023',
  null,
  'rating 6 is rejected'
);

select ok(
  not public.submit_feedback('no-such-business', null, null, 5, 'qr'),
  'submit_feedback returns false for an unknown business'
);

reset role;

-- -----------------------------------------------------------------------------
-- Platform admin
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated", "email": "admin@test.local"}', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.feedback
   where business_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  4,
  'admin can read all feedback (3 fixtures + 1 anonymous submission)'
);

select is(
  (select count(*)::integer from public.businesses
   where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  2,
  'admin can read all businesses'
);

reset role;

select * from finish();
rollback;
