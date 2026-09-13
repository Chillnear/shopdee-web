import { NextRequest, NextResponse } from 'next/server';
import { requireIngestAdmin } from '@/lib/ingest/http';
import { getJob, updateJob } from '@/lib/ingest/store';
import type { IngestJobStatus } from '@/lib/ingest/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Context) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  const job = await getJob(params.id);
  return job ? NextResponse.json({ job }) : NextResponse.json({ error: 'job_not_found' }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const unauthorized = requireIngestAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json() as { status?: IngestJobStatus };
    const status = body.status;
    if (!status || !['queued', 'paused', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'invalid_job_action' }, { status: 400 });
    }
    const job = await getJob(params.id);
    if (!job) return NextResponse.json({ error: 'job_not_found' }, { status: 404 });
    if (status === 'queued' && job.status === 'completed') {
      return NextResponse.json({ error: 'completed_job_cannot_resume' }, { status: 409 });
    }
    const updated = await updateJob(params.id, {
      status,
      locked_until: null,
      last_error: status === 'queued' ? null : job.last_error,
      next_run_at: status === 'queued' ? new Date().toISOString() : undefined,
    });
    return NextResponse.json({ job: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'job_update_failed' }, { status: 500 });
  }
}
