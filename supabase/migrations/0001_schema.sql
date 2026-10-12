-- =============================================================================
-- 5ali Review — 0001: core schema
--
-- Privacy by design: the customer-facing tables (feedback, event_daily_counts)
-- hold NO personal data — no names, emails, phones, IP addresses, user agents
-- or device identifiers. A feedback row is a rating + business/location/card
-- ids + source + timestamp, nothing more.
--
-- Requires PostgreSQL 15+ (FOREIGN KEY ... ON DELETE SET NULL (column) syntax),
-- which every current Supabase project runs.
-- =============================================================================

-- Internal helpers live in a schema PostgREST does not expose, so they can
-- never be called directly over the API. Access is locked down in 0002.
create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_locale as enum ('en', 'fr', 'ar');
create type public.business_status as enum ('active', 'suspended');
-- Declared lowest → highest so roles compare with >= ("at least manager").
create type public.member_role as enum ('viewer', 'manager', 'owner');
create type public.card_status as enum ('active', 'inactive');
create type public.feedback_source as enum ('nfc', 'qr', 'link');
create type public.event_type as enum ('page_view', 'nfc_visit', 'qr_scan', 'feedback_submitted', 'google_review_clicked');
create type public.billing_interval as enum ('month', 'year');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.invoice_status as enum ('open', 'paid', 'void', 'refunded');
create type public.deletion_scope as enum ('account', 'business', 'marketing', 'other');
create type public.deletion_status as enum ('pending', 'in_progress', 'completed', 'rejected');
create type public.legal_slug as enum ('privacy', 'terms', 'refunds', 'cookies', 'subprocessors');

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Mirrors src/lib/google-review-url.ts. The Google review URL is the only
-- external redirect target in the customer flow, so the database refuses
-- anything else even if a member writes through the API directly (open
-- redirect / phishing protection as a second layer).
create or replace function public.is_allowed_google_review_url(p_url text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_authority text;
  v_host text;
  v_path text;
begin
  if p_url is null or char_length(p_url) > 500 or p_url ~ '\s' or p_url !~* '^https://' then
    return false;
  end if;
  v_authority := lower(substring(p_url from '^[A-Za-z]+://([^/?#]*)'));
  v_path := coalesce(substring(p_url from '^[A-Za-z]+://[^/?#]*([^?#]*)'), '');
  -- Credentials in the authority (user:pass@host) are never legitimate here.
  if v_authority is null or v_authority like '%@%' then
    return false;
  end if;
  v_host := regexp_replace(v_authority, ':443$', '');
  if v_host not in (
    'search.google.com', 'www.google.com', 'google.com', 'maps.google.com', 'www.google.tn',
    'google.tn', 'g.page', 'maps.app.goo.gl', 'goo.gl', 'g.co'
  ) then
    return false;
  end if;
  -- Plain google.com/.tn must point at maps/review paths, not search or redirect endpoints.
  if v_host in ('www.google.com', 'google.com', 'www.google.tn', 'google.tn')
     and v_path !~ '^/maps([^A-Za-z0-9_]|$)' then
    return false;
  end if;
  if v_host = 'goo.gl' and v_path !~ '^/maps' then
    return false;
  end if;
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '' check (char_length(email) <= 320),
  full_name text check (full_name is null or char_length(full_name) <= 120),
  is_platform_admin boolean not null default false,
  locale public.app_locale not null default 'en',
  created_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (email);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), ''),
    case
      when new.raw_user_meta_data ->> 'locale' in ('en', 'fr', 'ar')
        then (new.raw_user_meta_data ->> 'locale')::public.app_locale
      else 'en'::public.app_locale
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keeps profiles.email in sync when a user confirms an email change, so admin
-- lookups by email (membership management) stay correct.
create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(coalesce(new.email, '')) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null
    constraint businesses_slug_key unique
    constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  -- Object path inside the 'business-logos' bucket; always under '<id>/'.
  logo_path text check (
    logo_path is null
    or (logo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$' and logo_path like id::text || '/%')
  ),
  logo_alt text check (logo_alt is null or char_length(logo_alt) <= 140),
  brand_primary text check (brand_primary is null or brand_primary ~ '^#[0-9a-fA-F]{6}$'),
  brand_accent text check (brand_accent is null or brand_accent ~ '^#[0-9a-fA-F]{6}$'),
  description text check (description is null or char_length(description) <= 500),
  google_review_url text check (google_review_url is null or public.is_allowed_google_review_url(google_review_url)),
  website text check (website is null or (website ~* '^https://[^\s]+$' and char_length(website) <= 300)),
  phone text check (phone is null or char_length(phone) <= 30),
  email text check (email is null or char_length(email) <= 200),
  address text check (address is null or char_length(address) <= 240),
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  default_locale public.app_locale not null default 'fr',
  status public.business_status not null default 'active',
  feedback_retention_months integer not null default 24 check (feedback_retention_months between 1 and 60),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- locations (branches)
-- -----------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 60),
  address text check (address is null or char_length(address) <= 240),
  phone text check (phone is null or char_length(phone) <= 30),
  google_review_url text check (google_review_url is null or public.is_allowed_google_review_url(google_review_url)),
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_business_id_slug_key unique (business_id, slug),
  -- Target for composite foreign keys that guarantee a child row's location
  -- belongs to the same business (no cross-tenant references).
  constraint locations_business_id_id_key unique (business_id, id)
);

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- business_members
-- -----------------------------------------------------------------------------
create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_id_idx on public.business_members (user_id);

-- -----------------------------------------------------------------------------
-- nfc_cards — the code is printed/encoded on the physical card
-- -----------------------------------------------------------------------------
create table public.nfc_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null
    constraint nfc_cards_code_key unique
    check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  business_id uuid not null references public.businesses (id) on delete cascade,
  location_id uuid,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  status public.card_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nfc_cards_business_id_id_key unique (business_id, id),
  constraint nfc_cards_location_fkey foreign key (business_id, location_id)
    references public.locations (business_id, id) on delete set null (location_id)
);
create index nfc_cards_location_id_idx on public.nfc_cards (location_id) where location_id is not null;

create trigger nfc_cards_set_updated_at
  before update on public.nfc_cards
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- feedback — anonymous ratings. NO personal data columns, by design.
-- -----------------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  location_id uuid,
  card_id uuid,
  rating smallint not null check (rating between 1 and 5),
  source public.feedback_source not null,
  created_at timestamptz not null default now(),
  constraint feedback_location_fkey foreign key (business_id, location_id)
    references public.locations (business_id, id) on delete set null (location_id),
  constraint feedback_card_fkey foreign key (business_id, card_id)
    references public.nfc_cards (business_id, id) on delete set null (card_id)
);
create index feedback_business_created_idx on public.feedback (business_id, created_at);
create index feedback_location_id_idx on public.feedback (location_id) where location_id is not null;
create index feedback_card_id_idx on public.feedback (card_id) where card_id is not null;
-- Global "recent feedback" (admin) and retention purge scans.
create index feedback_created_at_idx on public.feedback (created_at);

-- -----------------------------------------------------------------------------
-- event_daily_counts — aggregated counters only (no IP / user agent / device)
-- -----------------------------------------------------------------------------
create table public.event_daily_counts (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Deleting a location/card folds its counters into the unattributed bucket
  -- first (see triggers below), so the cascade never loses business totals.
  location_id uuid references public.locations (id) on delete cascade,
  card_id uuid references public.nfc_cards (id) on delete cascade,
  day date not null,
  type public.event_type not null,
  count integer not null default 0 check (count >= 0)
);
-- NULL ids are folded to the nil uuid so (business, no location, no card) is
-- one counter per day/type and ON CONFLICT upserts work.
create unique index event_daily_counts_key on public.event_daily_counts (
  business_id,
  (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)),
  (coalesce(card_id, '00000000-0000-0000-0000-000000000000'::uuid)),
  day,
  type
);
create index event_daily_counts_business_day_idx on public.event_daily_counts (business_id, day);
create index event_daily_counts_location_id_idx on public.event_daily_counts (location_id) where location_id is not null;
create index event_daily_counts_card_id_idx on public.event_daily_counts (card_id) where card_id is not null;
create index event_daily_counts_type_day_idx on public.event_daily_counts (type, day);

-- Folds a deleted location's counters into the business-level bucket. Skipped
-- when the whole business is being deleted (its counters go with it).
create or replace function private.fold_location_event_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.businesses b where b.id = old.business_id) then
    insert into public.event_daily_counts as e (business_id, location_id, card_id, day, type, count)
    select c.business_id, null::uuid, c.card_id, c.day, c.type, sum(c.count)::integer
    from public.event_daily_counts c
    where c.location_id = old.id
    group by c.business_id, c.card_id, c.day, c.type
    on conflict (
      business_id,
      (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      (coalesce(card_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      day,
      type
    ) do update set count = e.count + excluded.count;

    delete from public.event_daily_counts c where c.location_id = old.id;
  end if;
  return old;
end;
$$;

create trigger locations_fold_event_counts
  before delete on public.locations
  for each row execute function private.fold_location_event_counts();

create or replace function private.fold_card_event_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.businesses b where b.id = old.business_id) then
    insert into public.event_daily_counts as e (business_id, location_id, card_id, day, type, count)
    select c.business_id, c.location_id, null::uuid, c.day, c.type, sum(c.count)::integer
    from public.event_daily_counts c
    where c.card_id = old.id
    group by c.business_id, c.location_id, c.day, c.type
    on conflict (
      business_id,
      (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      (coalesce(card_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      day,
      type
    ) do update set count = e.count + excluded.count;

    delete from public.event_daily_counts c where c.card_id = old.id;
  end if;
  return old;
end;
$$;

create trigger nfc_cards_fold_event_counts
  before delete on public.nfc_cards
  for each row execute function private.fold_card_event_counts();

-- -----------------------------------------------------------------------------
-- subscriptions — plan definitions live in src/config/plans.ts
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    constraint subscriptions_business_id_key unique
    references public.businesses (id) on delete cascade,
  plan_id text not null check (plan_id ~ '^[a-z0-9_-]{1,40}$'),
  "interval" public.billing_interval not null default 'month',
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- invoices — amounts in minor units (millimes for TND)
-- -----------------------------------------------------------------------------
create sequence public.invoice_number_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  number text not null
    constraint invoices_number_key unique
    default ('INV-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'TND' check (currency ~ '^[A-Z]{3}$'),
  status public.invoice_status not null default 'open',
  description text not null default '' check (char_length(description) <= 500),
  issued_at timestamptz not null default now(),
  paid_at timestamptz
);
create index invoices_business_issued_idx on public.invoices (business_id, issued_at desc);

-- -----------------------------------------------------------------------------
-- deletion_requests — GDPR / INPDP data-subject requests
-- -----------------------------------------------------------------------------
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 200),
  scope public.deletion_scope not null,
  details text check (details is null or char_length(details) <= 2000),
  business_id uuid references public.businesses (id) on delete set null,
  requester_user_id uuid references auth.users (id) on delete set null,
  status public.deletion_status not null default 'pending',
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index deletion_requests_requester_idx on public.deletion_requests (requester_user_id) where requester_user_id is not null;
create index deletion_requests_status_idx on public.deletion_requests (status, created_at desc);

-- -----------------------------------------------------------------------------
-- audit_logs — metadata must reference ids, never personal data
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 60),
  target_id text check (target_id is null or char_length(target_id) <= 100),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- legal_documents — versioned; a row is "published" once published_at <= now()
-- -----------------------------------------------------------------------------
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug public.legal_slug not null,
  locale public.app_locale not null,
  title text not null check (char_length(title) between 1 and 200),
  body_md text not null check (char_length(body_md) <= 200000),
  version integer not null check (version > 0),
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  constraint legal_documents_slug_locale_version_key unique (slug, locale, version)
);

-- -----------------------------------------------------------------------------
-- contact_requests — purged after 12 months
-- -----------------------------------------------------------------------------
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  business_name text check (business_name is null or char_length(business_name) <= 120),
  message text not null check (char_length(message) between 1 and 2000),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_requests_created_at_idx on public.contact_requests (created_at desc);

-- -----------------------------------------------------------------------------
-- email_subscriptions — explicit opt-in marketing consent records
-- -----------------------------------------------------------------------------
create table public.email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null
    constraint email_subscriptions_email_key unique
    check (char_length(email) between 3 and 200 and email = lower(email)),
  consent_at timestamptz not null default now(),
  consent_source text not null check (char_length(consent_source) between 1 and 60),
  -- sha256 of the raw unsubscribe token; the raw token only ever lives in emails.
  token_hash text not null
    constraint email_subscriptions_token_hash_key unique
    check (char_length(token_hash) between 32 and 128),
  unsubscribed_at timestamptz
);

-- -----------------------------------------------------------------------------
-- rate_limits — fixed-window counters keyed by a salted hash (never a raw IP)
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key_hash text not null check (char_length(key_hash) between 16 and 128),
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (key_hash, window_start)
);
create index rate_limits_window_start_idx on public.rate_limits (window_start);
