-- Per-product title and description for search results (Google).
-- Safe to run more than once.

alter table public.products
  add column if not exists seo_title text not null default '' check (char_length(seo_title) <= 70),
  add column if not exists seo_description text not null default '' check (char_length(seo_description) <= 160);
