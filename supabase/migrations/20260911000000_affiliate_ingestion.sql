-- Safe affiliate ingestion pipeline. Sources must be official API/feed exports.
-- No marketplace HTML crawling, proxy rotation, CAPTCHA bypass, or stealth behavior.

create extension if not exists "pgcrypto";

-- 1. Ensure the ingestion fields exist on the canonical products table.
-- The main schema uses text IDs (not UUIDs), so this is compatible with it.
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
  store_type text default 'official',
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
  publication_status text not null default 'approved',
  affiliate_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists publication_status text not null default 'approved';
alter table public.products add column if not exists affiliate_source_id text;

-- 2. สร้าง Index สำหรับการค้นหา
create index if not exists idx_products_publication_status on public.products(publication_status, updated_at desc);

-- 3. สร้างระบบท่อส่งข้อมูล (Affiliate Pipeline)
create table if not exists public.affiliate_sources (
  id text primary key,
  name text not null,
  provider text not null check (provider in ('official_api', 'official_feed', 'manual_export')),
  platform text not null check (platform in ('shopee', 'lazada', 'tiktok')),
  feed_env_key text not null,
  auth_env_key text,
  status text not null default 'unconfigured' check (status in ('unconfigured', 'active', 'paused')),
  rate_limit_rpm integer not null default 6 check (rate_limit_rpm between 1 and 60),
  batch_size integer not null default 50 check (batch_size between 1 and 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.affiliate_sources(id) on delete cascade,
  mode text not null default 'incremental' check (mode in ('full', 'incremental')),
  status text not null default 'queued' check (status in ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  cursor jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{"fetched":0,"accepted":0,"upserted":0,"rejected":0,"errors":0}'::jsonb,
  last_error text,
  retry_count integer not null default 0,
  next_run_at timestamptz not null default now(),
  locked_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.affiliate_sources(id) on delete cascade,
  external_id text not null,
  content_hash text not null,
  title text not null,
  image_url text not null,
  affiliate_url text not null,
  platform text not null check (platform in ('shopee', 'lazada', 'tiktok')),
  category text,
  store_name text,
  price numeric not null check (price > 0),
  original_price numeric,
  sold_count numeric,
  rating numeric,
  commission_rate numeric,
  commission_amount numeric,
  score numeric not null default 0,
  score_breakdown jsonb not null default '{}'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create table if not exists public.ingest_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'system',
  action text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingest_jobs_ready on public.ingest_jobs(status, next_run_at, created_at);
create index if not exists idx_ingest_jobs_source on public.ingest_jobs(source_id, created_at desc);
create index if not exists idx_affiliate_candidates_review on public.affiliate_candidates(review_status, score desc);
create index if not exists idx_affiliate_candidates_source on public.affiliate_candidates(source_id, external_id);
create index if not exists idx_ingest_audit_entity on public.ingest_audit_log(entity_id, created_at desc);

alter table public.affiliate_sources enable row level security;
alter table public.ingest_jobs enable row level security;
alter table public.affiliate_candidates enable row level security;
alter table public.ingest_audit_log enable row level security;

create or replace function public.claim_next_ingest_job()
returns setof public.ingest_jobs
language plpgsql
security definer
set search_path = public
as $$
declare claimed public.ingest_jobs;
begin
  select * into claimed
  from public.ingest_jobs
  where next_run_at <= now()
    and (
      status = 'queued'
      or (status = 'running' and locked_until is not null and locked_until < now())
    )
  order by created_at asc
  for update skip locked
  limit 1;

  if claimed.id is null then return; end if;

  update public.ingest_jobs
  set status = 'running',
      locked_until = now() + interval '5 minutes',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

revoke all on function public.claim_next_ingest_job() from public;
grant execute on function public.claim_next_ingest_job() to service_role;

-- 6. กำหนดสิทธิ์ (private pipeline)
revoke all on public.affiliate_sources from anon, authenticated;
revoke all on public.ingest_jobs from anon, authenticated;
revoke all on public.affiliate_candidates from anon, authenticated;
revoke all on public.ingest_audit_log from anon, authenticated;
grant all on public.affiliate_sources, public.ingest_jobs, public.affiliate_candidates, public.ingest_audit_log to service_role;

-- ให้สิทธิ์อ่าน products แก่ทุกคน (เพื่อแสดงหน้าเว็บ)
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
