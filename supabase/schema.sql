-- ================================================================
-- ShopDee (ช้อปดี) - Legacy SQL Editor schema snapshot
-- Deployment source of truth: apply supabase/migrations with Supabase CLI.
-- This file is retained for reference and is not migration history.
-- ================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- 2. Products Table (Master Deals Catalog)
create table if not exists public.products (
  id text primary key,
  title text not null,
  slug text not null unique,
  category text not null,
  image_url text not null,
  base_price numeric not null,
  estimated_final_price numeric not null,
  market_avg_price numeric not null,
  vip_final_price numeric,
  platform text not null check (platform in ('shopee', 'lazada', 'tiktok')),
  store_name text not null,
  store_type text default 'official' check (store_type in ('mall', 'preferred', 'official', 'verified', 'general')),
  rating numeric default 5.0,
  review_count integer default 0,
  sold_count integer default 0,
  affiliate_url text not null,
  tags text[] default '{}',
  is_best_deal boolean default false,
  is_absolute_cheapest boolean default false,
  verified_real_discount boolean default true,
  has_option_bait boolean default false,
  bait_warning_note text,
  thai_authenticity_score integer default 95,
  active_viewers_count integer default 20,
  price_advice jsonb,
  voucher_stack jsonb,
  review_highlights jsonb default '[]'::jsonb,
  reviews jsonb default '[]'::jsonb,
  available_vouchers jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Intra-Platform & Cross-Platform Store Offers Table
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

-- 4. 30-Day Price History Table
create table if not exists public.price_history (
  id uuid default gen_random_uuid() primary key,
  product_id text references public.products(id) on delete cascade,
  date date not null,
  price numeric not null,
  note text,
  created_at timestamptz default now()
);

-- 5. Price Drop Alerts Table (LINE OA Webhook Subscribers)
create table if not exists public.price_alerts (
  id uuid default gen_random_uuid() primary key,
  product_id text references public.products(id) on delete cascade,
  user_line_id text not null,
  target_price numeric not null,
  status text default 'active' check (status in ('active', 'triggered', 'cancelled')),
  created_at timestamptz default now(),
  notified_at timestamptz
);

-- 6. High-Performance Indexes
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

-- 7. Row Level Security (RLS) - Zero-Cost Security Protocol
alter table public.products enable row level security;
alter table public.store_offers enable row level security;
alter table public.price_history enable row level security;
alter table public.price_alerts enable row level security;

-- Public Read Policies (Allow anonymous users to view all public deals)
create policy "Allow public read on products" 
  on public.products for select using (true);

create policy "Allow public read on store_offers" 
  on public.store_offers for select using (true);

create policy "Allow public read on price_history" 
  on public.price_history for select using (true);

-- Allow public users to subscribe to price alerts (insert only)
create policy "Allow public insert on price_alerts" 
  on public.price_alerts for insert with check (true);

-- Backend Service Role (Scraper & Cron Sync) has full access
create policy "Allow service_role full access to products"
  on public.products for all using (auth.role() = 'service_role');

create policy "Allow service_role full access to store_offers"
  on public.store_offers for all using (auth.role() = 'service_role');

create policy "Allow service_role full access to price_history"
  on public.price_history for all using (auth.role() = 'service_role');

create policy "Allow service_role full access to price_alerts"
  on public.price_alerts for all using (auth.role() = 'service_role');
