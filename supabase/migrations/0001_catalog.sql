-- Product catalogue for the store.
-- Row Level Security is enabled with no policies: the anon and authenticated
-- roles can do nothing, and only the app server (service-role key) reads and
-- writes. Admin access is checked by the app's own session.

create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (char_length(name) between 1 and 120),
  tagline          text not null default '' check (char_length(tagline) <= 160),
  description      text not null default '' check (char_length(description) <= 5000),
  price            numeric(12, 3) not null check (price >= 0),
  compare_at_price numeric(12, 3) check (compare_at_price is null or compare_at_price > price),
  sku              text not null default '',
  stock            integer check (stock is null or stock >= 0),
  category         text not null default '',
  tags             text[] not null default '{}',
  images           text[] not null default '{}',
  specs            jsonb not null default '[]'::jsonb,
  status           text not null default 'draft' check (status in ('published', 'draft')),
  featured         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_category_idx on public.products (category);

-- A single row (id = 1) holding the store settings as JSON.
create table if not exists public.store_settings (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.store_settings enable row level security;

-- Public bucket for product photos (read by anyone, written only by the server).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do nothing;
