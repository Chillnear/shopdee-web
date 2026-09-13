import { createHash } from 'node:crypto';
import type { AffiliateCandidate, AffiliateSource, IngestJob, IngestStats, ReviewStatus } from './types';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class IngestStorageError extends Error {}

function ensureConfigured(): { url: string; key: string } {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new IngestStorageError('ingestion_storage_not_configured');
  return { url: SUPABASE_URL.replace(/\/$/, ''), key: SERVICE_ROLE_KEY };
}

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { url, key } = ensureConfigured();
  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new IngestStorageError(`supabase_${response.status}:${detail}`);
  }
  if (response.status === 204) return [] as T;
  return (await response.json()) as T;
}

export function isIngestStorageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

export async function listSources(): Promise<AffiliateSource[]> {
  return adminFetch<AffiliateSource[]>('affiliate_sources?select=*&order=created_at.asc');
}

export async function getSource(id: string): Promise<AffiliateSource | null> {
  const rows = await adminFetch<AffiliateSource[]>(`affiliate_sources?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] || null;
}

export async function createSource(input: Omit<AffiliateSource, 'created_at' | 'updated_at'>): Promise<AffiliateSource> {
  const rows = await adminFetch<AffiliateSource[]>('affiliate_sources', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return rows[0];
}

export async function updateSource(id: string, patch: Partial<AffiliateSource>): Promise<AffiliateSource | null> {
  const rows = await adminFetch<AffiliateSource[]>(`affiliate_sources?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows[0] || null;
}

export async function listJobs(limit = 50): Promise<IngestJob[]> {
  return adminFetch<IngestJob[]>(`ingest_jobs?select=*&order=created_at.desc&limit=${limit}`);
}

export async function getJob(id: string): Promise<IngestJob | null> {
  const rows = await adminFetch<IngestJob[]>(`ingest_jobs?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] || null;
}

export async function createJob(sourceId: string, mode: 'full' | 'incremental'): Promise<IngestJob> {
  const rows = await adminFetch<IngestJob[]>('ingest_jobs', {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId, mode, status: 'queued', cursor: { offset: 0 }, stats: emptyStats() }),
  });
  return rows[0];
}

export async function updateJob(id: string, patch: Partial<IngestJob>): Promise<IngestJob | null> {
  const rows = await adminFetch<IngestJob[]>(`ingest_jobs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows[0] || null;
}

export async function claimNextJob(): Promise<IngestJob | null> {
  const rows = await adminFetch<IngestJob[]>('rpc/claim_next_ingest_job', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return rows[0] || null;
}

export function emptyStats(): IngestStats {
  return { fetched: 0, accepted: 0, upserted: 0, rejected: 0, errors: 0 };
}

export async function upsertCandidates(candidates: AffiliateCandidate[]): Promise<void> {
  if (!candidates.length) return;
  const now = new Date().toISOString();
  const rows = candidates.map(({ review_status: _reviewStatus, ...candidate }) => ({
    ...candidate,
    last_seen_at: now,
    updated_at: now,
  }));
  await adminFetch('affiliate_candidates?on_conflict=source_id%2Cexternal_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

export async function listCandidates(status: ReviewStatus, limit = 50): Promise<AffiliateCandidate[]> {
  return adminFetch<AffiliateCandidate[]>(`affiliate_candidates?review_status=eq.${status}&select=*&order=score.desc&limit=${limit}`);
}

export async function getCandidate(id: string): Promise<AffiliateCandidate | null> {
  const rows = await adminFetch<AffiliateCandidate[]>(`affiliate_candidates?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] || null;
}

export async function updateCandidate(id: string, patch: Partial<AffiliateCandidate>): Promise<AffiliateCandidate | null> {
  const rows = await adminFetch<AffiliateCandidate[]>(`affiliate_candidates?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows[0] || null;
}

export async function publishCandidate(candidate: AffiliateCandidate): Promise<void> {
  const productId = `affiliate-${createHash('sha256').update(`${candidate.source_id}:${candidate.external_id}`).digest('hex').slice(0, 24)}`;
  const storeName = candidate.store_name?.trim();
  if (!storeName) {
    throw new Error('Cannot publish candidate without a source store name');
  }
  const product = {
    id: productId,
    title: candidate.title,
    slug: productId,
    category: candidate.category || 'สินค้า',
    image_url: candidate.image_url,
    base_price: candidate.price,
    estimated_final_price: candidate.price,
    market_avg_price: candidate.original_price || candidate.price,
    vip_final_price: candidate.price,
    platform: candidate.platform,
    store_name: storeName,
    store_type: 'verified',
    rating: candidate.rating || 0,
    review_count: 0,
    sold_count: candidate.sold_count || 0,
    affiliate_url: candidate.affiliate_url,
    tags: candidate.category ? [candidate.category] : [],
    is_best_deal: false,
    is_absolute_cheapest: false,
    verified_real_discount: Boolean(candidate.original_price && candidate.original_price > candidate.price),
    has_option_bait: false,
    thai_authenticity_score: 0,
    active_viewers_count: 0,
    price_advice: null,
    voucher_stack: null,
    review_highlights: [],
    reviews: [],
    available_vouchers: [],
    publication_status: 'approved',
    affiliate_source_id: candidate.source_id,
    updated_at: new Date().toISOString(),
  };
  await adminFetch('products?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(product),
  });
  await adminFetch('store_offers?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: `${productId}-offer`,
      product_id: productId,
      platform: candidate.platform,
      store_name: storeName,
      store_type: 'verified',
      price: candidate.price,
      rating: candidate.rating || 0,
      review_count: 0,
      estimated_after_voucher: candidate.price,
      url: candidate.affiliate_url,
      in_stock: true,
    }),
  });
}

export async function writeAuditEvent(action: string, entityId: string, metadata: Record<string, unknown>): Promise<void> {
  await adminFetch('ingest_audit_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ action, entity_id: entityId, metadata, actor: 'system' }),
  });
}
