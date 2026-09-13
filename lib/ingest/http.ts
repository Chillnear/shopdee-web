import { NextRequest, NextResponse } from 'next/server';

function matchesSecret(request: NextRequest, secret: string): boolean {
  const authorization = request.headers.get('authorization');
  const provided = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : request.headers.get('x-ingest-admin-token');
  return Boolean(provided && provided === secret);
}

export function requireIngestAdmin(request: NextRequest): NextResponse | null {
  const secret = process.env.INGEST_ADMIN_TOKEN;
  if (!secret) {
    return NextResponse.json(
      { error: 'ingestion_admin_not_configured', message: 'ตั้งค่า INGEST_ADMIN_TOKEN ก่อนใช้งานหลังบ้าน' },
      { status: 503 },
    );
  }
  if (!matchesSecret(request, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export function requireCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  }
  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export function parseLimit(value: string | null, fallback = 50, maximum = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(parsed)));
}
