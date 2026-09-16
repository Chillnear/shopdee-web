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
      }
    );
  }

  try {
    let deal: ProductDeal;

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const sanitizedUrl = url.trim();
      const lower = sanitizedUrl.toLowerCase();

      // ตรวจจับและปฏิเสธ URL ผลการค้นหา (ไม่อนุญาตให้ใช้เป็นลิงก์สินค้า)
      if (
        lower.includes('/search') ||
        lower.includes('/catalog') ||
        lower.includes('/tag/') ||
        lower.includes('keyword=') ||
        lower.includes('?q=')
      ) {
        return NextResponse.json(
          {
            error: 'search_url_not_allowed',
            message: 'กรุณาวางลิงก์หน้าสินค้าโดยตรง (ไม่ใช่ลิงก์หน้าค้นหา) เพื่อให้ระบบดึงข้อมูลและร้านค้าจริงได้ถูกต้อง',
          },
          { status: 400 }
        );
      }

      // 2A. สกัดข้อมูลจาก URL สินค้าตรง (Shopee, Lazada, TikTok Shop)
      const meta = await fetchUrlMetadata(sanitizedUrl);
      deal = await synthesizeDealWithAI(meta);
    } else {
      // ไม่อนุญาตให้สร้างสินค้าเสมือนจากคำค้นหาที่ไม่มีลิงก์สินค้าจริง
      return NextResponse.json(
        {
          error: 'direct_url_required',
          message: 'กรุณาวางลิงก์หน้าสินค้าจาก Shopee, Lazada หรือ TikTok Shop เพื่อดึงข้อมูลสินค้าและร้านค้าจริง',
        },
        { status: 400 }
      );
    }

    // 3. บันทึกลง Supabase ทันที (Community-driven growth)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // บันทึกตัวสินค้า
        await fetch(`${supabaseUrl}/rest/v1/products`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: deal.id,
            title: deal.title,
            slug: deal.id,
            category: deal.category,
            image_url: deal.imageUrl,
            base_price: deal.basePrice,
            estimated_final_price: deal.estimatedFinalPrice,
            market_avg_price: deal.originalPrice,
            platform: deal.platform,
            store_name: deal.storeName,
            store_type: deal.storeType,
            rating: deal.storeRating,
            sold_count: deal.soldCount,
            affiliate_url: deal.affiliateUrl,
            publication_status: 'approved',
            updated_at: new Date().toISOString()
          })
        });

        // บันทึกร้านค้า (Offers)
        if (deal.stores && deal.stores.length > 0) {
          await fetch(`${supabaseUrl}/rest/v1/store_offers`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(deal.stores.map(s => ({
              id: s.id,
              product_id: deal.id,
              platform: s.platform,
              store_name: s.storeName,
              store_type: s.storeType,
              price: s.price,
              rating: s.storeRating,
              review_count: s.soldCount,
              estimated_after_voucher: s.estimatedAfterVoucher,
              url: s.url,
              updated_at: new Date().toISOString()
            })))
          });
        }
        console.log(`[Ingest] Successfully persisted deal ${deal.id} to Supabase`);
      } catch (dbErr) {
        console.error('[Ingest] Failed to persist to Supabase:', dbErr);
      }
    }

    // เก็บผลลง Cache (เพื่อความเร็วในรอบถัดไป)
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
