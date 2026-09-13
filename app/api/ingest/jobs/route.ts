import { NextRequest, NextResponse } from 'next/server';
import { requireIngestAdmin, parseLimit } from '@/lib/ingest/http';
import { createJob, getSource, isIngestStorageConfigured, listJobs } from '@/lib/ingest/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  if (!isIngestStorageConfigured()) return NextResponse.json({ jobs: [], storageConfigured: false });
  try {
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
    return NextResponse.json({ jobs: await listJobs(limit), storageConfigured: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'job_list_failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { sourceId?: string; mode?: 'full' | 'incremental' };
    const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : '';
    const mode = body.mode === 'full' ? 'full' : 'incremental';
    const source = sourceId ? await getSource(sourceId) : null;
    if (!source) return NextResponse.json({ error: 'source_not_found' }, { status: 404 });
    if (source.status !== 'active') return NextResponse.json({ error: 'source_not_active' }, { status: 409 });
    const job = await createJob(source.id, mode);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'job_create_failed' }, { status: 500 });
  }
}
