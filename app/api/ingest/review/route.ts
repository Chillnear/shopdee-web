import { NextRequest, NextResponse } from 'next/server';
import { requireIngestAdmin, parseLimit } from '@/lib/ingest/http';
import { isIngestStorageConfigured, listCandidates } from '@/lib/ingest/store';
import type { ReviewStatus } from '@/lib/ingest/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  if (!isIngestStorageConfigured()) return NextResponse.json({ candidates: [], storageConfigured: false });
  const rawStatus = request.nextUrl.searchParams.get('status') || 'pending';
  const status: ReviewStatus = ['pending', 'approved', 'rejected'].includes(rawStatus)
    ? rawStatus as ReviewStatus
    : 'pending';
  try {
    return NextResponse.json({ candidates: await listCandidates(status, parseLimit(request.nextUrl.searchParams.get('limit'))), storageConfigured: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'review_list_failed' }, { status: 500 });
  }
}
