-- =============================================================================
-- 5ali Review — 0003: RPCs + storage
--
-- Every function here is SECURITY DEFINER with an empty search_path (all names
-- schema-qualified), validates every argument, and is granted explicitly —
-- 0002 removed the default EXECUTE-for-everyone.
--
-- Error codes surfaced to the app (mapped in src/server/data/supabase/db.ts):
--   22023 invalid argument · 42501 access denied · P0002 not found
--   23505 unique violation (slug taken) · P0001 business rule refused
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal helpers (schema `private`: not exposed by PostgREST, no grants)
-- -----------------------------------------------------------------------------

-- Resolves public identifiers to ids. Only ACTIVE businesses resolve. An
-- unknown location slug or an unknown/inactive/foreign card is ignored rather
-- than rejected, so a stale printed card still records a business-level rating.
-- When only a card is given, its assigned location is used.
create or replace function private.resolve_target(
  p_slug text,
  p_location_slug text,
  p_card_code text,
  out out_business_id uuid,
  out out_location_id uuid,
  out out_card_id uuid
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_location_slug text := lower(btrim(coalesce(p_location_slug, '')));
  v_code text := upper(btrim(coalesce(p_card_code, '')));
  v_card_location uuid;
begin
  if char_length(v_slug) > 60 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return;
  end if;

  select b.id into out_business_id
  from public.businesses b
  where b.slug = v_slug and b.status = 'active';
  if out_business_id is null then
    return;
  end if;

  if v_location_slug <> '' then
    select l.id into out_location_id
    from public.locations l
    where l.business_id = out_business_id and l.slug = v_location_slug;
  end if;

  if v_code ~ '^[A-HJ-NP-Z2-9]{8}$' then
    select c.id, c.location_id into out_card_id, v_card_location
    from public.nfc_cards c
    where c.code = v_code and c.business_id = out_business_id and c.status = 'active';
    if out_card_id is not null and v_location_slug = '' then
      out_location_id := v_card_location;
    end if;
  end if;
end;
$$;

-- Upsert-increments today's (UTC) counter.
create or replace function private.bump_event(
  p_business_id uuid,
  p_location_id uuid,
  p_card_id uuid,
  p_type public.event_type
)
returns void
language sql
set search_path = ''
as $$
  insert into public.event_daily_counts as e (business_id, location_id, card_id, day, type, count)
  values (p_business_id, p_location_id, p_card_id, (now() at time zone 'UTC')::date, p_type, 1)
  on conflict (
    business_id,
    (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (coalesce(card_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    day,
    type
  ) do update set count = e.count + 1;
$$;

create or replace function private.is_valid_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_email is not null
    and char_length(p_email) between 3 and 200
    and p_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';
$$;

-- =============================================================================
-- PUBLIC RPCs (anon + authenticated)
-- =============================================================================

-- Only fields that are safe for anonymous customers. The raw Google URL is NOT
-- returned here; the redirect endpoint fetches it via get_google_review_url.
create or replace function public.get_public_business(p_slug text, p_location_slug text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_location_slug text := lower(btrim(coalesce(p_location_slug, '')));
  v_b public.businesses%rowtype;
  v_l public.locations%rowtype;
begin
  if char_length(v_slug) > 60 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return null;
  end if;

  select * into v_b from public.businesses b where b.slug = v_slug and b.status = 'active';
  if not found then
    return null;
  end if;

  if v_location_slug <> '' then
    select * into v_l from public.locations l where l.business_id = v_b.id and l.slug = v_location_slug;
  end if;

  return jsonb_build_object(
    'name', v_b.name,
    'slug', v_b.slug,
    'logo_path', v_b.logo_path,
    'logo_alt', v_b.logo_alt,
    'brand_primary', v_b.brand_primary,
    'description', v_b.description,
    'website', v_b.website,
    'phone', v_b.phone,
    'address', v_b.address,
    'opening_hours', v_b.opening_hours,
    'social_links', v_b.social_links,
    'default_locale', v_b.default_locale,
    'is_demo', v_b.is_demo,
    'has_google_review_url', coalesce(v_l.google_review_url, v_b.google_review_url) is not null,
    'location', case
      when v_l.id is null then null
      else jsonb_build_object('name', v_l.name, 'slug', v_l.slug, 'address', v_l.address, 'phone', v_l.phone)
    end
  );
end;
$$;

-- Location override first, then the business URL; re-validated on the way out.
create or replace function public.get_google_review_url(p_slug text, p_location_slug text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_allowed_google_review_url(u.url) then u.url end
  from (
    select coalesce(l.google_review_url, b.google_review_url) as url
    from public.businesses b
    left join public.locations l
      on l.business_id = b.id and l.slug = lower(btrim(coalesce(p_location_slug, '')))
    where b.slug = lower(btrim(coalesce(p_slug, ''))) and b.status = 'active'
  ) u;
$$;

-- Records one anonymous rating. Raises 22023 on an invalid rating/source;
-- returns false when the business does not exist or is suspended.
create or replace function public.submit_feedback(
  p_slug text,
  p_location_slug text default null,
  p_card_code text default null,
  p_rating integer default null,
  p_source text default 'link'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_location_id uuid;
  v_card_id uuid;
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'rating must be between 1 and 5' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('nfc', 'qr', 'link') then
    raise exception 'invalid feedback source' using errcode = '22023';
  end if;

  select t.out_business_id, t.out_location_id, t.out_card_id
  into v_business_id, v_location_id, v_card_id
  from private.resolve_target(p_slug, p_location_slug, p_card_code) t;

  if v_business_id is null then
    return false;
  end if;

  insert into public.feedback (business_id, location_id, card_id, rating, source)
  values (v_business_id, v_location_id, v_card_id, p_rating::smallint, p_source::public.feedback_source);

  perform private.bump_event(v_business_id, v_location_id, v_card_id, 'feedback_submitted');
  return true;
end;
$$;

-- Increments a daily counter. 'feedback_submitted' is accepted but ignored:
-- submit_feedback already counts it, so callers cannot inflate it.
create or replace function public.record_event(
  p_slug text,
  p_location_slug text default null,
  p_card_code text default null,
  p_type text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_location_id uuid;
  v_card_id uuid;
begin
  if p_type is null or p_type not in ('page_view', 'nfc_visit', 'qr_scan', 'feedback_submitted', 'google_review_clicked') then
    raise exception 'invalid event type' using errcode = '22023';
  end if;
  if p_type = 'feedback_submitted' then
    return;
  end if;

  select t.out_business_id, t.out_location_id, t.out_card_id
  into v_business_id, v_location_id, v_card_id
  from private.resolve_target(p_slug, p_location_slug, p_card_code) t;

  if v_business_id is null then
    return;
  end if;

  perform private.bump_event(v_business_id, v_location_id, v_card_id, p_type::public.event_type);
end;
$$;

-- Card code → public page coordinates. Zero rows when the card is unknown,
-- inactive, or its business is suspended.
create or replace function public.resolve_card(p_code text)
returns table (slug text, location_slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.slug, l.slug
  from public.nfc_cards c
  join public.businesses b on b.id = c.business_id
  left join public.locations l on l.id = c.location_id
  where c.code = upper(btrim(coalesce(p_code, '')))
    and c.status = 'active'
    and b.status = 'active'
  limit 1;
$$;

-- Fixed-window limiter: increments the current window and returns true while
-- the count is within p_max. Keys are salted hashes computed by the app.
create or replace function public.check_rate_limit(p_key_hash text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key_hash is null or char_length(p_key_hash) not between 16 and 128
     or p_window_seconds is null or p_window_seconds not between 1 and 86400
     or p_max is null or p_max not between 1 and 100000 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (key_hash, window_start, count)
  values (p_key_hash, v_window_start, 1)
  on conflict (key_hash, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  return v_count <= p_max;
end;
$$;

create or replace function public.create_contact_request(
  p_name text,
  p_email text,
  p_business_name text default null,
  p_message text default null,
  p_marketing_opt_in boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_business_name text := nullif(btrim(coalesce(p_business_name, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
begin
  if char_length(v_name) not between 1 and 120
     or not private.is_valid_email(v_email)
     or char_length(coalesce(v_business_name, '')) > 120
     or char_length(v_message) not between 1 and 2000 then
    raise exception 'invalid contact request' using errcode = '22023';
  end if;

  insert into public.contact_requests (name, email, business_name, message, marketing_opt_in)
  values (v_name, v_email, v_business_name, v_message, coalesce(p_marketing_opt_in, false));
end;
$$;

-- Deletion requests from people who are not signed in (verified by email
-- out-of-band by an admin before anything is deleted).
create or replace function public.create_public_deletion_request(p_email text, p_scope text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
begin
  if not private.is_valid_email(v_email)
     or p_scope is null or p_scope not in ('account', 'business', 'marketing', 'other')
     or char_length(coalesce(v_details, '')) > 2000 then
    raise exception 'invalid deletion request' using errcode = '22023';
  end if;

  insert into public.deletion_requests (email, scope, details)
  values (v_email, p_scope::public.deletion_scope, v_details);
end;
$$;

-- Records explicit opt-in consent. Re-subscribing refreshes consent and
-- rotates the unsubscribe token (links in older emails stop working).
create or replace function public.subscribe_marketing(p_email text, p_source text, p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_source text := btrim(coalesce(p_source, ''));
begin
  if not private.is_valid_email(v_email)
     or char_length(v_source) not between 1 and 60
     or p_token_hash is null or char_length(p_token_hash) not between 32 and 128 then
    raise exception 'invalid subscription' using errcode = '22023';
  end if;

  insert into public.email_subscriptions (email, consent_at, consent_source, token_hash, unsubscribed_at)
  values (v_email, now(), v_source, p_token_hash, null)
  on conflict (email) do update
    set consent_at = excluded.consent_at,
        consent_source = excluded.consent_source,
        token_hash = excluded.token_hash,
        unsubscribed_at = null;
end;
$$;

-- One-click unsubscribe. True when the token is known (idempotent).
create or replace function public.unsubscribe_marketing(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token_hash is null or char_length(p_token_hash) not between 32 and 128 then
    return false;
  end if;
  update public.email_subscriptions
  set unsubscribed_at = coalesce(unsubscribed_at, now())
  where token_hash = p_token_hash;
  return found;
end;
$$;

-- Latest published version for slug + locale (zero rows if none).
create or replace function public.get_legal_document(p_slug text, p_locale text)
returns table (slug text, locale text, title text, body_md text, version integer, published_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.slug::text, d.locale::text, d.title, d.body_md, d.version, d.published_at
  from public.legal_documents d
  where d.slug::text = p_slug
    and d.locale::text = p_locale
    and d.published_at <= now()
  order by d.version desc
  limit 1;
$$;

-- =============================================================================
-- AUTHENTICATED RPCs
-- =============================================================================

-- Self-service signup: business + owner membership + 14-day Starter trial in
-- one transaction. A taken slug raises 23505.
create or replace function public.create_owned_business(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_business_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(v_name) not between 2 and 120
     or char_length(v_slug) not between 3 and 60
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid business' using errcode = '22023';
  end if;
  -- Abuse guard for self-service signups; admins can create more directly.
  if (select count(*) from public.business_members m where m.user_id = v_user_id and m.role = 'owner') >= 10 then
    raise exception 'business limit reached' using errcode = 'P0001';
  end if;

  insert into public.businesses (name, slug) values (v_name, v_slug) returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, v_user_id, 'owner');

  insert into public.subscriptions (business_id, plan_id, "interval", status, current_period_end)
  values (v_business_id, 'starter', 'month', 'trialing', now() + interval '14 days');

  return v_business_id;
end;
$$;

-- The only way a non-admin changes a subscription: toggling cancellation at
-- period end. Owner (or platform admin) only; canceled subscriptions are final.
create or replace function public.set_cancel_at_period_end(p_business_id uuid, p_cancel boolean)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
begin
  if p_business_id is null or p_cancel is null then
    raise exception 'invalid arguments' using errcode = '22023';
  end if;
  if not (public.has_business_role(p_business_id, 'owner') or public.is_platform_admin()) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  update public.subscriptions s
  set cancel_at_period_end = p_cancel
  where s.business_id = p_business_id and s.status <> 'canceled'
  returning * into v_subscription;

  if not found then
    raise exception 'subscription not found' using errcode = 'P0002';
  end if;
  return v_subscription;
end;
$$;

-- Dashboard analytics aggregated in SQL. Days are UTC. `series` contains only
-- days that have feedback; the UI fills the gaps with zeros (daysInRange).
-- Event totals cover whole UTC days overlapping [p_from, p_to).
create or replace function public.get_feedback_stats(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_location_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_from_day date;
  v_to_day date;
begin
  if p_business_id is null or p_from is null or p_to is null
     or p_to <= p_from or p_to - p_from > interval '800 days' then
    raise exception 'invalid range' using errcode = '22023';
  end if;
  if not (public.has_business_role(p_business_id, 'viewer') or public.is_platform_admin()) then
    raise exception 'access denied' using errcode = '42501';
  end if;

  v_from_day := (p_from at time zone 'UTC')::date;
  v_to_day := ((p_to - interval '1 microsecond') at time zone 'UTC')::date + 1; -- exclusive

  with f as (
    select fb.rating, (fb.created_at at time zone 'UTC')::date as day
    from public.feedback fb
    where fb.business_id = p_business_id
      and fb.created_at >= p_from
      and fb.created_at < p_to
      and (p_location_id is null or fb.location_id = p_location_id)
  ),
  totals as (
    select
      count(*) as total,
      round(avg(f.rating)::numeric, 2) as average,
      count(*) filter (where f.rating = 1) as r1,
      count(*) filter (where f.rating = 2) as r2,
      count(*) filter (where f.rating = 3) as r3,
      count(*) filter (where f.rating = 4) as r4,
      count(*) filter (where f.rating = 5) as r5
    from f
  ),
  series as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'count', d.n, 'average', d.average)
        order by d.day
      ),
      '[]'::jsonb
    ) as points
    from (
      select f.day, count(*) as n, round(avg(f.rating)::numeric, 2) as average
      from f
      group by f.day
    ) d
  ),
  events as (
    select coalesce(jsonb_object_agg(x.type, x.total), '{}'::jsonb) as totals
    from (
      select e.type::text as type, sum(e.count) as total
      from public.event_daily_counts e
      where e.business_id = p_business_id
        and e.day >= v_from_day
        and e.day < v_to_day
        and (p_location_id is null or e.location_id = p_location_id)
      group by e.type
    ) x
  )
  select jsonb_build_object(
    'total', t.total,
    'average', t.average,
    'distribution', jsonb_build_object('1', t.r1, '2', t.r2, '3', t.r3, '4', t.r4, '5', t.r5),
    'series', s.points,
    'events', ev.totals
  )
  into v_result
  from totals t, series s, events ev;

  return v_result;
end;
$$;

-- =============================================================================
-- PLATFORM ADMIN RPCs (each re-checks is_platform_admin())
-- =============================================================================

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'access denied' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'businesses', (select count(*) from public.businesses),
    'active_businesses', (select count(*) from public.businesses b where b.status = 'active'),
    'users', (select count(*) from public.profiles),
    'feedback_last_30', (select count(*) from public.feedback f where f.created_at >= now() - interval '30 days'),
    'google_clicks_last_30', (
      select coalesce(sum(e.count), 0)
      from public.event_daily_counts e
      where e.type = 'google_review_clicked'
        and e.day > (now() at time zone 'UTC')::date - 30
    ),
    'pending_deletion_requests', (select count(*) from public.deletion_requests d where d.status = 'pending')
  );
end;
$$;

create or replace function public.admin_business_counts()
returns table (business_id uuid, locations bigint, cards bigint, feedback bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'access denied' using errcode = '42501';
  end if;
  return query
    select
      b.id,
      (select count(*) from public.locations l where l.business_id = b.id),
      (select count(*) from public.nfc_cards c where c.business_id = b.id),
      (select count(*) from public.feedback f where f.business_id = b.id)
    from public.businesses b;
end;
$$;

-- profiles.is_platform_admin is not writable through the API at all (column
-- privileges + trigger); this is the only path, and it keeps one admin alive.
create or replace function public.admin_set_platform_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'access denied' using errcode = '42501';
  end if;
  if p_user_id is null or p_is_admin is null then
    raise exception 'invalid arguments' using errcode = '22023';
  end if;
  if not p_is_admin
     and not exists (select 1 from public.profiles p where p.is_platform_admin and p.id <> p_user_id) then
    raise exception 'cannot remove the last platform admin' using errcode = 'P0001';
  end if;

  update public.profiles p set is_platform_admin = p_is_admin where p.id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Publishes a new immutable version (previous versions stay for the record).
create or replace function public.publish_legal_document(p_slug text, p_locale text, p_title text, p_body_md text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_version integer;
begin
  if not public.is_platform_admin() then
    raise exception 'access denied' using errcode = '42501';
  end if;
  if p_slug is null or p_slug not in ('privacy', 'terms', 'refunds', 'cookies', 'subprocessors')
     or p_locale is null or p_locale not in ('en', 'fr', 'ar')
     or char_length(v_title) not between 1 and 200
     or p_body_md is null or char_length(p_body_md) not between 1 and 200000 then
    raise exception 'invalid legal document' using errcode = '22023';
  end if;

  -- Serialise concurrent publishes of the same document so versions don't collide.
  perform pg_advisory_xact_lock(hashtext('legal_documents:' || p_slug || ':' || p_locale));

  select coalesce(max(d.version), 0) + 1 into v_version
  from public.legal_documents d
  where d.slug = p_slug::public.legal_slug and d.locale = p_locale::public.app_locale;

  insert into public.legal_documents (slug, locale, title, body_md, version, published_at, published_by)
  values (p_slug::public.legal_slug, p_locale::public.app_locale, v_title, p_body_md, v_version, now(), auth.uid());

  return v_version;
end;
$$;

-- =============================================================================
-- MAINTENANCE (service_role / pg_cron only)
-- =============================================================================

-- Deletes everything past its retention period; returns per-table counts.
create or replace function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feedback bigint;
  v_events bigint;
  v_contact bigint;
  v_audit bigint;
  v_rate bigint;
  v_deletion bigint;
begin
  delete from public.feedback f
  using public.businesses b
  where f.business_id = b.id
    and f.created_at < now() - make_interval(months => b.feedback_retention_months);
  get diagnostics v_feedback = row_count;

  delete from public.event_daily_counts e
  using public.businesses b
  where e.business_id = b.id
    and e.day < ((now() at time zone 'UTC') - make_interval(months => b.feedback_retention_months))::date;
  get diagnostics v_events = row_count;

  delete from public.contact_requests c where c.created_at < now() - interval '12 months';
  get diagnostics v_contact = row_count;

  delete from public.audit_logs a where a.created_at < now() - interval '24 months';
  get diagnostics v_audit = row_count;

  delete from public.rate_limits r where r.window_start < now() - interval '1 day';
  get diagnostics v_rate = row_count;

  delete from public.deletion_requests d
  where d.status in ('completed', 'rejected')
    and coalesce(d.resolved_at, d.created_at) < now() - interval '24 months';
  get diagnostics v_deletion = row_count;

  return jsonb_build_object(
    'feedback', v_feedback,
    'event_daily_counts', v_events,
    'contact_requests', v_contact,
    'audit_logs', v_audit,
    'rate_limits', v_rate,
    'deletion_requests', v_deletion
  );
end;
$$;

-- =============================================================================
-- Grants — the complete, final list.
-- PostgreSQL grants EXECUTE to PUBLIC on every new function, and per-schema
-- default privileges cannot revoke that built-in grant, so start from zero.
-- =============================================================================
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Helpers from 0001/0002 used by CHECK constraints and RLS policies.
grant execute on function public.is_allowed_google_review_url(text) to anon, authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.has_business_role(uuid, text) to authenticated, service_role;
grant execute on function public.member_business_ids(text) to authenticated, service_role;
grant execute on function public.business_id_from_storage_path(text) to authenticated, service_role;

grant execute on function public.get_public_business(text, text) to anon, authenticated, service_role;
grant execute on function public.get_google_review_url(text, text) to anon, authenticated, service_role;
grant execute on function public.submit_feedback(text, text, text, integer, text) to anon, authenticated, service_role;
grant execute on function public.record_event(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.resolve_card(text) to anon, authenticated, service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.create_contact_request(text, text, text, text, boolean) to anon, authenticated, service_role;
grant execute on function public.create_public_deletion_request(text, text, text) to anon, authenticated, service_role;
grant execute on function public.subscribe_marketing(text, text, text) to anon, authenticated, service_role;
grant execute on function public.unsubscribe_marketing(text) to anon, authenticated, service_role;
grant execute on function public.get_legal_document(text, text) to anon, authenticated, service_role;

grant execute on function public.create_owned_business(text, text) to authenticated;
grant execute on function public.set_cancel_at_period_end(uuid, boolean) to authenticated;
grant execute on function public.get_feedback_stats(uuid, timestamptz, timestamptz, uuid) to authenticated;

grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_business_counts() to authenticated;
grant execute on function public.admin_set_platform_admin(uuid, boolean) to authenticated;
grant execute on function public.publish_legal_document(text, text, text, text) to authenticated;

grant execute on function public.purge_expired_data() to service_role;

-- =============================================================================
-- Storage: business logos
-- Public read (logos appear on public pages); writes only to '<business_id>/…'
-- by managers+ of that business or platform admins. Size and MIME type are
-- enforced by the bucket itself, in addition to the app's checks.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists business_logos_select on storage.objects;
drop policy if exists business_logos_insert on storage.objects;
drop policy if exists business_logos_update on storage.objects;
drop policy if exists business_logos_delete on storage.objects;

-- SELECT is needed for INSERT ... RETURNING and removals through the Storage
-- API; anonymous reads go through the public bucket URL instead.
create policy business_logos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (select public.is_platform_admin())
      or public.has_business_role(public.business_id_from_storage_path(name), 'manager')
    )
  );

create policy business_logos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and public.business_id_from_storage_path(name) is not null
    and (
      (select public.is_platform_admin())
      or public.has_business_role(public.business_id_from_storage_path(name), 'manager')
    )
  );

create policy business_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (select public.is_platform_admin())
      or public.has_business_role(public.business_id_from_storage_path(name), 'manager')
    )
  )
  with check (
    bucket_id = 'business-logos'
    and public.business_id_from_storage_path(name) is not null
    and (
      (select public.is_platform_admin())
      or public.has_business_role(public.business_id_from_storage_path(name), 'manager')
    )
  );

create policy business_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-logos'
    and (
      (select public.is_platform_admin())
      or public.has_business_role(public.business_id_from_storage_path(name), 'manager')
    )
  );
