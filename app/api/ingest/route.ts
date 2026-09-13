import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, validateAndSanitizeInput } from '@/lib/ai/security';
import { fetchUrlMetadata, synthesizeDealWithAI, ExtractedMeta, detectPlatform } from '@/lib/ai/ingest-engine';
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

  let body: { url?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { url, query } = body;

  if (!url && !query) {
    return NextResponse.json(
      { error: 'missing_input', message: 'กรุณาระบุ URL หรือคำค้นหาสินค้า' },
      { status: 400 }
    );
  }

  // 1. ตรวจสอบ Cache ล่วงหน้า (0ms Instant Hit)
  const cacheKey = (url || query || '').trim().toLowerCase();
  const cached = ingestCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < INGEST_CACHE_TTL_MS) {
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
      }
    );
  }

  try {
    let deal: ProductDeal;

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // 2A. สกัดข้อมูลจาก URL (Shopee, Lazada, TikTok Shop)
      const sanitizedUrl = url.trim();
      const meta = await fetchUrlMetadata(sanitizedUrl);
      deal = await synthesizeDealWithAI(meta);
    } else if (query) {
      // 2B. สร้างดีลเปรียบเทียบสดจากชื่อสินค้าที่ค้นหา
      const sanitized = validateAndSanitizeInput(query);
      if (!sanitized.isValid) {
        return NextResponse.json({ error: 'invalid_query', message: sanitized.reason }, { status: 400 });
      }

      const meta: ExtractedMeta = {
        rawTitle: sanitized.sanitized,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        description: `เปรียบเทียบราคา ${sanitized.sanitized} 3 แอป`,
        platform: 'shopee',
        sourceUrl: `https://shopee.co.th/search?keyword=${encodeURIComponent(sanitized.sanitized)}`,
      };
      deal = await synthesizeDealWithAI(meta);
    } else {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }

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
