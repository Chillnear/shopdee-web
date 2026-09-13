import { NextRequest, NextResponse } from 'next/server';
import { parseSearchIntent } from '@/lib/ai/services';
import { localSearchProvider } from '@/lib/ai/providers/local-engine';
import { 
  validateAndSanitizeInput, 
  checkRateLimit, 
  verifyOriginAndHeaders,
  getCachedQuery, 
  setCachedQuery 
} from '@/lib/ai/security';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // 1. ตรวจสอบ Origin / Anti-Scraping
    const originCheck = verifyOriginAndHeaders(req);
    if (!originCheck.isAuthorized) {
      return NextResponse.json(
        { error: originCheck.reason || 'Forbidden' },
        { status: 403 }
      );
    }

    // 2. รับข้อมูล Request
    const body = await req.json().catch(() => ({}));
    const rawQuery = body?.query;

    // 3. Sanitization & Input Length Cap (ห้ามเกิน 120 ตัวอักษร, กรอง Prompt Injection)
    const validation = validateAndSanitizeInput(rawQuery);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }
    const cleanQuery = validation.sanitized;

    // 4. Rate Limiting ตาม Client IP
    const clientIp = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     '127.0.0.1';

    const rateLimit = checkRateLimit(clientIp);

    // หากเกิน Rate limit ให้ Soft Fallback ไปใช้ Local Heuristic Engine ทันที
    // เพื่อไม่ให้ระบบพัง และป้องกันไม่ให้บอทแตะต้อง Mimi Coach API
    if (!rateLimit.allowed) {
      const localResult = await localSearchProvider.execute(cleanQuery, new AbortController().signal);
      return NextResponse.json(
        {
          data: localResult,
          meta: {
            tier: 'local',
            provider: 'security-rate-limited-fallback',
            latencyMs: 1,
            confidence: 0.8,
            degraded: true,
          },
        },
        {
          headers: {
            'x-ai-tier': 'local',
            'x-ai-provider': 'security-rate-limited-fallback',
            'x-ai-rate-limited': 'true',
            'x-ratelimit-remaining': '0',
          },
        }
      );
    }

    // 5. ตรวจสอบ Query Cache (ลดการเรียก API ซ้ำ)
    const cacheKey = `intent:${cleanQuery.toLowerCase()}`;
    const cached = getCachedQuery<any>(cacheKey);
    if (cached && cached.meta) {
      return NextResponse.json(cached, {
        headers: {
          'x-ai-tier': cached.meta.tier,
          'x-ai-provider': cached.meta.provider,
          'x-ai-cached': 'true',
          'x-ratelimit-remaining': String(rateLimit.remaining),
        },
      });
    }

    // 6. ประมวลผลผ่าน Mimi Coach LiteLLM Engine
    const result = await parseSearchIntent(cleanQuery);

    // 7. บันทึกผลลัพธ์ลง Cache
    setCachedQuery(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'x-ai-tier': result.meta.tier,
        'x-ai-provider': result.meta.provider,
        'x-ai-latency': `${result.meta.latencyMs}ms`,
        'x-ratelimit-remaining': String(rateLimit.remaining),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to parse search intent' },
      { status: 500 }
    );
  }
}
