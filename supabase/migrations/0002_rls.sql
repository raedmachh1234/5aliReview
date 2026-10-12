-- =============================================================================
-- 5ali Review — 0002: privileges + row level security
--
-- Model:
--   * anon           — NO table privileges at all. Anonymous customers only
--                      reach the database through the SECURITY DEFINER RPCs in
--                      0003, which validate every argument.
--   * authenticated  — narrow, column-level grants; RLS decides which rows.
--                      Business members see their own tenant only; platform
--                      admins see everything.
--   * service_role   — bypasses RLS; used only by the maintenance cron.
--
-- RLS is ENABLED on every table but not FORCED: the table owner (postgres)
-- only acts through migrations and the SECURITY DEFINER functions, which do
-- their own checks. Forcing RLS on the owner would make those functions depend
-- on whether the owner role has BYPASSRLS, which differs between setups.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reset Supabase's permissive defaults (it grants ALL on new public tables and
-- EXECUTE on new functions to anon/authenticated). Everything below is opt-in.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
-- (PUBLIC's built-in EXECUTE on new functions cannot be revoked per schema; 0003 revokes it explicitly.)
alter default privileges in schema public revoke execute on functions from anon, authenticated;

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from anon, authenticated;

-- Used inside CHECK constraints, which are evaluated with the writer's privileges.
grant execute on function public.is_allowed_google_review_url(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Policy helpers. SECURITY DEFINER so they can read profiles/business_members
-- without recursing into those tables' own policies; STABLE so the planner can
-- evaluate them once per statement where possible.
-- -----------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- Role order: viewer < manager < owner. Unknown role names never match.
create or replace function public.has_business_role(p_business_id uuid, p_min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
      and m.role >= case p_min_role
        when 'viewer' then 'viewer'::public.member_role
        when 'manager' then 'manager'::public.member_role
        when 'owner' then 'owner'::public.member_role
      end
  );
$$;

-- Set-returning variant for read policies on high-volume tables:
-- `business_id in (select ...)` is evaluated once per query instead of once
-- per row. Only ever reveals the caller's own memberships.
create or replace function public.member_business_ids(p_min_role text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id
  from public.business_members m
  where m.user_id = (select auth.uid())
    and m.role >= case p_min_role
      when 'viewer' then 'viewer'::public.member_role
      when 'manager' then 'manager'::public.member_role
      when 'owner' then 'owner'::public.member_role
    end;
$$;

-- Storage paths in 'business-logos' are '<business_id>/<file>'. CASE keeps the
-- uuid cast from ever running on a non-matching name (it would raise).
create or replace function public.business_id_from_storage_path(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,100}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.has_business_role(uuid, text) to authenticated, service_role;
grant execute on function public.member_business_ids(text) to authenticated, service_role;
grant execute on function public.business_id_from_storage_path(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Column guards. Column privileges below already stop most of this; the
-- triggers are a second layer that also covers columns a role CAN update but
-- only under conditions (e.g. retention is owner-only, slug is admin-only).
-- current_user is the API role here because these triggers are not definers;
-- SECURITY DEFINER RPCs run as the owner and are therefore not affected.
-- -----------------------------------------------------------------------------
create or replace function private.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.is_platform_admin is distinct from old.is_platform_admin
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'profile field is read-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

create or replace function private.guard_business_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_platform_admin() then
    if new.id is distinct from old.id
       or new.slug is distinct from old.slug
       or new.status is distinct from old.status
       or new.is_demo is distinct from old.is_demo
       or new.created_at is distinct from old.created_at then
      raise exception 'only platform admins can change this field' using errcode = '42501';
    end if;
    if new.feedback_retention_months is distinct from old.feedback_retention_months
       and not public.has_business_role(old.id, 'owner') then
      raise exception 'only owners can change data retention' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_guard_update
  before update on public.businesses
  for each row execute function private.guard_business_update();

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.locations enable row level security;
alter table public.business_members enable row level security;
alter table public.nfc_cards enable row level security;
alter table public.feedback enable row level security;
alter table public.event_daily_counts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.legal_documents enable row level security;
alter table public.contact_requests enable row level security;
alter table public.email_subscriptions enable row level security;
alter table public.rate_limits enable row level security;

-- -----------------------------------------------------------------------------
-- Table privileges for authenticated (anon: none). Column lists keep ids,
-- timestamps and privileged flags out of reach of direct API writes.
-- -----------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, locale) on public.profiles to authenticated;

grant select, delete on public.businesses to authenticated;
grant insert (
  name, slug, logo_path, logo_alt, brand_primary, brand_accent, description, google_review_url, website,
  phone, email, address, opening_hours, social_links, default_locale, status, feedback_retention_months, is_demo
) on public.businesses to authenticated;
grant update (
  name, slug, logo_path, logo_alt, brand_primary, brand_accent, description, google_review_url, website,
  phone, email, address, opening_hours, social_links, default_locale, status, feedback_retention_months, is_demo
) on public.businesses to authenticated;

grant select, delete on public.locations to authenticated;
grant insert (business_id, name, slug, address, phone, google_review_url, opening_hours) on public.locations to authenticated;
grant update (name, slug, address, phone, google_review_url, opening_hours) on public.locations to authenticated;

grant select, insert, update, delete on public.business_members to authenticated;

grant select, delete on public.nfc_cards to authenticated;
grant insert (code, business_id, location_id, label, status) on public.nfc_cards to authenticated;
grant update (label, location_id, status) on public.nfc_cards to authenticated;

grant select, delete on public.feedback to authenticated;
grant select on public.event_daily_counts to authenticated;

grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant usage on sequence public.invoice_number_seq to authenticated;

grant select on public.deletion_requests to authenticated;
grant insert (email, scope, details, business_id, requester_user_id) on public.deletion_requests to authenticated;
grant update (status, resolution_note, resolved_at) on public.deletion_requests to authenticated;

-- Audit logs are append-only through the API: no update/delete for anyone.
grant select on public.audit_logs to authenticated;
grant insert (actor_user_id, action, target_type, target_id, metadata) on public.audit_logs to authenticated;

-- Legal documents are versioned and immutable: new versions are inserted.
grant select on public.legal_documents to authenticated;
grant insert (slug, locale, title, body_md, version, published_at, published_by) on public.legal_documents to authenticated;

grant select, delete on public.contact_requests to authenticated;
grant select on public.email_subscriptions to authenticated;
-- rate_limits: no grants; only check_rate_limit() touches it.

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------

-- profiles ---------------------------------------------------------------------
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_platform_admin()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- businesses -------------------------------------------------------------------
create policy businesses_select_member on public.businesses
  for select to authenticated
  using (id in (select public.member_business_ids('viewer')));

create policy businesses_update_manager on public.businesses
  for update to authenticated
  using (public.has_business_role(id, 'manager'))
  with check (public.has_business_role(id, 'manager'));

create policy businesses_admin_all on public.businesses
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- locations --------------------------------------------------------------------
create policy locations_select_member on public.locations
  for select to authenticated
  using (business_id in (select public.member_business_ids('viewer')));

create policy locations_write_manager on public.locations
  for all to authenticated
  using (public.has_business_role(business_id, 'manager'))
  with check (public.has_business_role(business_id, 'manager'));

create policy locations_admin_all on public.locations
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- business_members -------------------------------------------------------------
-- Members see the whole team of their businesses; only admins change it.
create policy business_members_select on public.business_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or business_id in (select public.member_business_ids('viewer'))
  );

create policy business_members_admin_all on public.business_members
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- nfc_cards ----------------------------------------------------------------------
create policy nfc_cards_select_member on public.nfc_cards
  for select to authenticated
  using (business_id in (select public.member_business_ids('viewer')));

create policy nfc_cards_insert_manager on public.nfc_cards
  for insert to authenticated
  with check (public.has_business_role(business_id, 'manager'));

create policy nfc_cards_update_manager on public.nfc_cards
  for update to authenticated
  using (public.has_business_role(business_id, 'manager'))
  with check (public.has_business_role(business_id, 'manager'));

create policy nfc_cards_admin_all on public.nfc_cards
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- feedback (inserted only via submit_feedback) ----------------------------------
create policy feedback_select_member on public.feedback
  for select to authenticated
  using (business_id in (select public.member_business_ids('viewer')));

create policy feedback_admin_all on public.feedback
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- event_daily_counts (written only via RPCs) -------------------------------------
create policy event_daily_counts_select_member on public.event_daily_counts
  for select to authenticated
  using (business_id in (select public.member_business_ids('viewer')));

create policy event_daily_counts_admin_select on public.event_daily_counts
  for select to authenticated
  using ((select public.is_platform_admin()));

-- subscriptions (owners change cancel_at_period_end via RPC only) ----------------
create policy subscriptions_select_member on public.subscriptions
  for select to authenticated
  using (business_id in (select public.member_business_ids('viewer')));

create policy subscriptions_admin_all on public.subscriptions
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- invoices -------------------------------------------------------------------------
create policy invoices_select_member on public.invoices
  for select to authenticated
  using (business_id in (select public.member_business_ids('viewer')));

create policy invoices_admin_all on public.invoices
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- deletion_requests ----------------------------------------------------------------
create policy deletion_requests_select_own on public.deletion_requests
  for select to authenticated
  using (requester_user_id = (select auth.uid()));

-- A signed-in user files requests for themselves, under their own email, and
-- can only reference businesses they belong to.
create policy deletion_requests_insert_own on public.deletion_requests
  for insert to authenticated
  with check (
    requester_user_id = (select auth.uid())
    and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    and status = 'pending'
    and resolution_note is null
    and resolved_at is null
    and (business_id is null or public.has_business_role(business_id, 'viewer'))
  );

create policy deletion_requests_admin_all on public.deletion_requests
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- audit_logs -------------------------------------------------------------------------
create policy audit_logs_insert_self on public.audit_logs
  for insert to authenticated
  with check (actor_user_id = (select auth.uid()));

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using ((select public.is_platform_admin()));

-- legal_documents (anon reads through get_legal_document()) -----------------------------
create policy legal_documents_select_published on public.legal_documents
  for select to authenticated
  using (published_at <= now());

create policy legal_documents_select_admin on public.legal_documents
  for select to authenticated
  using ((select public.is_platform_admin()));

create policy legal_documents_insert_admin on public.legal_documents
  for insert to authenticated
  with check ((select public.is_platform_admin()));

-- contact_requests / email_subscriptions: admin only ---------------------------------------
create policy contact_requests_admin_select on public.contact_requests
  for select to authenticated
  using ((select public.is_platform_admin()));

create policy contact_requests_admin_delete on public.contact_requests
  for delete to authenticated
  using ((select public.is_platform_admin()));

create policy email_subscriptions_admin_select on public.email_subscriptions
  for select to authenticated
  using ((select public.is_platform_admin()));

-- rate_limits: RLS enabled with no policies = no direct access for API roles.
