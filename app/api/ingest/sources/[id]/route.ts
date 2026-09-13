import { NextRequest, NextResponse } from 'next/server';
import { requireIngestAdmin } from '@/lib/ingest/http';
import { getSource, isIngestStorageConfigured, updateSource } from '@/lib/ingest/store';
import type { IngestSourceStatus } from '@/lib/ingest/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Context) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  if (!isIngestStorageConfigured()) return NextResponse.json({ source: null, storageConfigured: false });
  const source = await getSource(params.id);
  return source ? NextResponse.json({ source }) : NextResponse.json({ error: 'source_not_found' }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { status?: IngestSourceStatus };
    if (!body.status || !['unconfigured', 'active', 'paused'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid_source_status' }, { status: 400 });
    }
    const current = await getSource(params.id);
    if (!current) return NextResponse.json({ error: 'source_not_found' }, { status: 404 });
    if (body.status === 'active' && !process.env[current.feed_env_key]) {
      return NextResponse.json({ error: 'source_feed_not_configured', message: `ตั้งค่า ${current.feed_env_key} ใน server environment ก่อนเปิด source` }, { status: 409 });
    }
    const source = await updateSource(params.id, { status: body.status });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'source_update_failed' }, { status: 500 });
  }
}
