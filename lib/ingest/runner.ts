import { fetchOfficialFeedPage } from './feed';
import { normalizeAffiliateCandidate } from './normalize';
import {
  claimNextJob,
  getSource,
  updateJob,
  upsertCandidates,
  writeAuditEvent,
} from './store';
import type { IngestJob, IngestRunResult, IngestStats } from './types';

function withStats(stats: IngestStats, patch: Partial<IngestStats>): IngestStats {
  return { ...stats, ...patch, last_batch_at: new Date().toISOString() };
}

function nextRetryAt(retryCount: number): string {
  const delayMs = Math.min(5 * 60_000, 1_000 * (2 ** Math.min(retryCount, 8)));
  return new Date(Date.now() + delayMs).toISOString();
}

export async function runNextIngestJob(): Promise<IngestRunResult> {
  const job = await claimNextJob();
  if (!job) return { status: 'idle' };

  const source = await getSource(job.source_id);
  if (!source) {
    await updateJob(job.id, { status: 'failed', last_error: 'source_not_found', finished_at: new Date().toISOString(), locked_until: null });
    return { status: 'failed', jobId: job.id, error: 'source_not_found' };
  }
  if (source.status !== 'active') {
    await updateJob(job.id, { status: 'paused', last_error: 'source_not_active', locked_until: null });
    return { status: 'not_configured', jobId: job.id, sourceName: source.name, error: 'source_not_active' };
  }

  try {
    const waitMs = Math.max(500, Math.min(15_000, Math.ceil(60_000 / Math.max(1, source.rate_limit_rpm))));
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const page = await fetchOfficialFeedPage(source, job.cursor || {});
    const candidates = page.items.map((item) => normalizeAffiliateCandidate(item, source)).filter(Boolean);
    const accepted = candidates.filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    if (accepted.length) await upsertCandidates(accepted);

    const stats = withStats(job.stats, {
      fetched: job.stats.fetched + page.items.length,
      accepted: job.stats.accepted + accepted.length,
      upserted: job.stats.upserted + accepted.length,
      rejected: job.stats.rejected + page.items.length - accepted.length,
      last_rejection_reason: page.items.length !== accepted.length ? 'invalid_or_non_direct_product_record' : undefined,
    });
    const nextStatus = page.done ? 'completed' : 'queued';
    await updateJob(job.id, {
      status: nextStatus,
      cursor: page.nextCursor === null
        ? {}
        : typeof page.nextCursor === 'number'
          ? { offset: page.nextCursor }
          : { providerCursor: page.nextCursor },
      stats,
      finished_at: page.done ? new Date().toISOString() : null,
      locked_until: null,
      last_error: null,
      next_run_at: new Date().toISOString(),
    });
    await writeAuditEvent('feed_batch_processed', job.id, {
      source_id: source.id,
      fetched: page.items.length,
      accepted: accepted.length,
      rejected: page.items.length - accepted.length,
      done: page.done,
    });

    return {
      status: page.done ? 'completed' : 'advanced',
      jobId: job.id,
      sourceName: source.name,
      fetched: page.items.length,
      accepted: accepted.length,
      rejected: page.items.length - accepted.length,
      nextStatus,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'ingest_failed';
    const retryCount = job.retry_count + 1;
    const terminal = retryCount >= 5;
    await updateJob(job.id, {
      status: terminal ? 'failed' : 'queued',
      retry_count: retryCount,
      last_error: message,
      stats: withStats(job.stats, { errors: job.stats.errors + 1 }),
      next_run_at: terminal ? new Date().toISOString() : nextRetryAt(retryCount),
      locked_until: null,
      finished_at: terminal ? new Date().toISOString() : null,
    });
    await writeAuditEvent('feed_batch_failed', job.id, { error: message, retry_count: retryCount, terminal });
    return { status: 'failed', jobId: job.id, sourceName: source.name, error: message };
  }
}
