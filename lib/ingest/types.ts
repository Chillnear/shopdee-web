import type { Platform } from '@/lib/types';

export type IngestSourceStatus = 'unconfigured' | 'active' | 'paused';
export type IngestJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AffiliateSource {
  id: string;
  name: string;
  provider: 'official_api' | 'official_feed' | 'manual_export';
  platform: Platform;
  feed_env_key: string;
  auth_env_key: string | null;
  status: IngestSourceStatus;
  rate_limit_rpm: number;
  batch_size: number;
  created_at: string;
  updated_at: string;
}

export interface IngestJob {
  id: string;
  source_id: string;
  mode: 'full' | 'incremental';
  status: IngestJobStatus;
  cursor: Record<string, unknown>;
  stats: IngestStats;
  last_error: string | null;
  retry_count: number;
  next_run_at: string;
  locked_until: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestStats {
  fetched: number;
  accepted: number;
  upserted: number;
  rejected: number;
  errors: number;
  last_batch_at?: string;
  last_rejection_reason?: string;
}

export interface AffiliateCandidate {
  id?: string;
  source_id: string;
  external_id: string;
  content_hash: string;
  title: string;
  image_url: string;
  affiliate_url: string;
  platform: Platform;
  category: string | null;
  store_name: string | null;
  price: number;
  original_price: number | null;
  sold_count: number | null;
  rating: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  score: number;
  score_breakdown: Record<string, number>;
  source_payload: Record<string, unknown>;
  review_status: ReviewStatus;
  first_seen_at?: string;
  last_seen_at?: string;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FeedPage {
  items: Record<string, unknown>[];
  nextCursor: string | number | null;
  done: boolean;
}

export interface IngestRunResult {
  status: 'idle' | 'completed' | 'advanced' | 'failed' | 'not_configured';
  jobId?: string;
  sourceName?: string;
  fetched?: number;
  accepted?: number;
  rejected?: number;
  nextStatus?: IngestJobStatus;
  error?: string;
}
