import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, verifyOriginAndHeaders } from '@/lib/ai/security';
import { fetchUrlMetadata, synthesizeDealWithAI, detectPlatform } from '@/lib/ai/ingest-engine';
import { isUsablePlatformUrl } from '@/lib/platform-url';
import { ProductDeal } from '@/lib/types';

// In-memory cache สำหรับ Ingested deals (1 ชั่วโมง)
const INGEST_CACHE_TTL_MS = 60 * 60 * 1000;
interface CachedDeal {
  deal: ProductDeal;
  cachedAt: number;
}
const ingestCache = new Map<string, CachedDeal>();

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'คุณเรียกใช้งานบ่อยเกินไป กรุณารอสักครู่' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const originCheck = verifyOriginAndHeaders(req);
  if (!originCheck.isAuthorized) {
    return NextResponse.json(
      { error: originCheck.reason || 'forbidden' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 });
  }

  const rawUrl = 'url' in body && typeof body.url === 'string' ? body.url.trim() : '';
  const rawQuery = 'query' in body && typeof body.query === 'string' ? body.query.trim() : '';
  if (!rawUrl && !rawQuery) {
    return NextResponse.json(
      { error: 'missing_input', message: 'กรุณาระบุ URL หรือคำค้นหาสินค้า' },
      { status: 400 },
    );
  }

  // This endpoint intentionally accepts only direct marketplace product URLs.
  if (!rawUrl || rawQuery || !/^https:\/\//i.test(rawUrl)) {
    return NextResponse.json(
      {
        error: 'direct_url_required',
        message: 'กรุณาวางลิงก์หน้าสินค้าจาก Shopee, Lazada หรือ TikTok Shop โดยตรง (HTTPS เท่านั้น)',
      },
      { status: 400 },
    );
  }

  const platform = detectPlatform(rawUrl);
  if (!isUsablePlatformUrl(rawUrl, platform)) {
    return NextResponse.json(
      {
        error: 'invalid_direct_product_url',
        message: 'ลิงก์นี้ไม่ใช่หน้าสินค้าโดยตรงของ Shopee, Lazada หรือ TikTok Shop',
      },
      { status: 400 },
    );
  }

  // 1. ตรวจสอบ Cache ล่วงหน้า (0ms Instant Hit)
  const cacheKey = rawUrl.toLowerCase();
  const cached = ingestCache.get(cacheKey);
  if (
    cached &&
    Date.now() - cached.cachedAt < INGEST_CACHE_TTL_MS &&
    cached.deal?.affiliateUrl &&
    !cached.deal.affiliateUrl.includes('/search') &&
    !cached.deal.affiliateUrl.includes('/catalog') &&
    !cached.deal.imageUrl?.includes('/icon-192.png')
  ) {
    return NextResponse.json(
      {
        success: true,
        deal: cached.deal,
        source: 'cache',
      },
      {
        headers: {
          'x-ai-cached': 'true',
        },
      },
    );
  }

  try {
    let deal: ProductDeal;

    // 2A. สกัดข้อมูลจาก URL สินค้าตรง (Shopee, Lazada, TikTok Shop)
    const meta = await fetchUrlMetadata(rawUrl);
    deal = await synthesizeDealWithAI(meta);

    // เก็บผลลง Cache
    ingestCache.set(cacheKey, {
      deal,
      cachedAt: Date.now(),
    });

    return NextResponse.json(
      {
        success: true,
        deal,
        source: 'live',
      },
      {
        headers: {
          'x-ai-cached': 'false',
        },
      }
    );
  } catch (error: any) {
    console.error('[Ingest API] Error:', error);
    return NextResponse.json(
      {
        error: 'ingest_failed',
        message: 'ไม่สามารถดึงข้อมูลสินค้านี้ได้ กรุณาลองใหม่อีกครั้ง',
      },
      { status: 500 }
    );
  }
}
