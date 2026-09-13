import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/ingest/http';
import { isIngestStorageConfigured } from '@/lib/ingest/store';
import { runNextIngestJob } from '@/lib/ingest/runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleCron(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;
  if (!isIngestStorageConfigured()) return NextResponse.json({ status: 'not_configured', error: 'ingestion_storage_not_configured' }, { status: 503 });
  try {
    return NextResponse.json(await runNextIngestJob());
  } catch (error) {
    console.error('[Ingest Cron]', error);
    return NextResponse.json({ status: 'failed', error: 'cron_execution_failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
