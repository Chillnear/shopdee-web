import { NextRequest, NextResponse } from 'next/server';
import { requireIngestAdmin, parseLimit } from '@/lib/ingest/http';
import { createSource, isIngestStorageConfigured, listSources } from '@/lib/ingest/store';
import type { AffiliateSource } from '@/lib/ingest/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const platforms = new Set(['shopee', 'lazada', 'tiktok']);
const providers = new Set(['official_api', 'official_feed', 'manual_export']);

export async function GET(request: NextRequest) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  if (!isIngestStorageConfigured()) return NextResponse.json({ sources: [], storageConfigured: false });
  try {
    return NextResponse.json({ sources: await listSources(), storageConfigured: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'source_list_failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as Partial<AffiliateSource>;
    const id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const feedEnvKey = typeof body.feed_env_key === 'string' ? body.feed_env_key.trim() : '';
    const authEnvKey = body.auth_env_key === null || body.auth_env_key === undefined
      ? null
      : String(body.auth_env_key).trim();
    const provider = body.provider;
    const platform = body.platform;
    if (!/^[a-z0-9_-]{2,64}$/.test(id) || !name || !feedEnvKey || !/^[A-Z][A-Z0-9_]{2,63}$/.test(feedEnvKey)) {
      return NextResponse.json({ error: 'invalid_source_fields' }, { status: 400 });
    }
    if (!providers.has(provider || '') || !platforms.has(platform || '')) {
      return NextResponse.json({ error: 'invalid_source_type' }, { status: 400 });
    }
    if (authEnvKey && !/^[A-Z][A-Z0-9_]{2,63}$/.test(authEnvKey)) {
      return NextResponse.json({ error: 'invalid_auth_env_key' }, { status: 400 });
    }
    const source = await createSource({
      id,
      name,
      provider: provider as AffiliateSource['provider'],
      platform: platform as AffiliateSource['platform'],
      feed_env_key: feedEnvKey,
      auth_env_key: authEnvKey,
      status: 'unconfigured',
      rate_limit_rpm: parseLimit(String(body.rate_limit_rpm || 6), 6, 60),
      batch_size: parseLimit(String(body.batch_size || 50), 50, 250),
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'source_create_failed' }, { status: 500 });
  }
}
