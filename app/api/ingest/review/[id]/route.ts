import { NextRequest, NextResponse } from 'next/server';
import { requireIngestAdmin } from '@/lib/ingest/http';
import { getCandidate, publishCandidate, updateCandidate, writeAuditEvent } from '@/lib/ingest/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { status?: 'approved' | 'rejected' };
    if (!body.status || !['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid_review_status' }, { status: 400 });
    }
    const candidate = await getCandidate(params.id);
    if (!candidate) return NextResponse.json({ error: 'candidate_not_found' }, { status: 404 });

    if (body.status === 'approved') await publishCandidate(candidate);
    const updated = await updateCandidate(params.id, {
      review_status: body.status,
      reviewed_at: new Date().toISOString(),
    });
    await writeAuditEvent(`candidate_${body.status}`, params.id, {
      source_id: candidate.source_id,
      external_id: candidate.external_id,
    });
    return NextResponse.json({ candidate: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'review_update_failed' }, { status: 500 });
  }
}
