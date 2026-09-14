-- Complete the runtime catalog schema without dropping existing data.
-- The affiliate ingestion migration owns products and ingestion tables; this
-- migration owns the remaining catalog tables used by the web application.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create table if not exists public.store_offers (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  platform text not null check (platform in ('shopee', 'lazada', 'tiktok')),
  store_name text not null,
  store_type text not null,
  price numeric not null,
  rating numeric not null,
  review_count integer not null,
  estimated_after_voucher numeric not null,
  delivery_fee numeric default 0,
  delivery_days integer default 2,
  available_vouchers jsonb default '[]'::jsonb,
  url text not null,
  in_stock boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.price_history (
  id uuid default gen_random_uuid() primary key,
  product_id text references public.products(id) on delete cascade,
  date date not null,
  price numeric not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.price_alerts (
  id uuid default gen_random_uuid() primary key,
  product_id text references public.products(id) on delete cascade,
  user_line_id text not null,
  target_price numeric not null check (target_price > 0),
  status text default 'active' check (status in ('active', 'triggered', 'cancelled')),
  created_at timestamptz default now(),
  notified_at timestamptz
);

alter table public.products enable row level security;
alter table public.store_offers enable row level security;
alter table public.price_history enable row level security;
alter table public.price_alerts enable row level security;

drop policy if exists "Allow public read on products" on public.products;
drop policy if exists "Allow service_role full access to products" on public.products;

create policy "Allow public read on products"
  on public.products for select
  using (publication_status = 'approved');

create policy "Allow service_role full access to products"
  on public.products for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_platform on public.products(platform);
create index if not exists idx_products_final_price on public.products(estimated_final_price);
create index if not exists idx_products_sold_count on public.products(sold_count desc);
create index if not exists idx_products_title_trgm on public.products using gin(title gin_trgm_ops);
create index if not exists idx_store_offers_product on public.store_offers(product_id);
create index if not exists idx_store_offers_platform on public.store_offers(platform);
create index if not exists idx_store_offers_price on public.store_offers(estimated_after_voucher);
create index if not exists idx_price_history_product on public.price_history(product_id, date);
create index if not exists idx_price_alerts_status on public.price_alerts(status, product_id);

-- Recreate named policies so this migration is safe after the old schema.sql.
drop policy if exists "Allow public read on store_offers" on public.store_offers;
drop policy if exists "Allow public read on price_history" on public.price_history;
drop policy if exists "Allow public insert on price_alerts" on public.price_alerts;
drop policy if exists "Allow service_role full access to store_offers" on public.store_offers;
drop policy if exists "Allow service_role full access to price_history" on public.price_history;
drop policy if exists "Allow service_role full access to price_alerts" on public.price_alerts;

create policy "Allow public read on store_offers"
  on public.store_offers for select
  using (
    exists (
      select 1
      from public.products
      where products.id = store_offers.product_id
        and products.publication_status = 'approved'
    )
  );

create policy "Allow public read on price_history"
  on public.price_history for select
  using (
    exists (
      select 1
      from public.products
      where products.id = price_history.product_id
        and products.publication_status = 'approved'
    )
  );

create policy "Allow public insert on price_alerts"
  on public.price_alerts for insert
  with check (char_length(user_line_id) between 1 and 128 and target_price > 0);

create policy "Allow service_role full access to store_offers"
  on public.store_offers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Allow service_role full access to price_history"
  on public.price_history for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Allow service_role full access to price_alerts"
  on public.price_alerts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant select on public.store_offers, public.price_history to anon, authenticated;
grant insert on public.price_alerts to anon, authenticated;
grant all on public.store_offers, public.price_history, public.price_alerts to service_role;
