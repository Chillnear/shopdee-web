/**
 * ShopDee Smart Product Ingestion Engine
 * ดึงข้อมูลสินค้าจริงจาก Shopee, Lazada, TikTok และประมวลผลด้วย Mimi Coach AI
 */

import { ProductDeal, Platform, PlatformPriceComparison, StoreOffer } from '../types';
import { isUsablePlatformUrl } from '../platform-url';

const MAX_MARKETPLACE_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_MARKETPLACE_REDIRECTS = 3;

function isAllowedMarketplaceUrl(value: unknown, platform: Platform): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:' && isUsablePlatformUrl(value, platform);
  } catch {
    return false;
  }
}

async function readResponseText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_MARKETPLACE_RESPONSE_BYTES) {
    throw new Error('marketplace_response_too_large');
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_MARKETPLACE_RESPONSE_BYTES) {
      throw new Error('marketplace_response_too_large');
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_MARKETPLACE_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('marketplace_response_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
}

export interface IngestRequest {
  url?: string;
  query?: string;
}

export interface ExtractedMeta {
  rawTitle: string;
  imageUrl: string;
  description: string;
  rawPrice?: number;
  storeName?: string;
  platform: Platform;
  sourceUrl: string;
}

/**
 * 1. ตรวจสอบและระบุแพลตฟอร์มจาก URL
 */
export function detectPlatform(urlStr: string): Platform {
  const lower = urlStr.toLowerCase();
  if (lower.includes('shopee') || lower.includes('shp.ee')) return 'shopee';
  if (lower.includes('lazada') || lower.includes('laz.')) return 'lazada';
  if (lower.includes('tiktok')) return 'tiktok';
  return 'shopee'; // default
}

/**
 * 2. ดึง Slug หรือชื่อสินค้าจากโครงสร้าง URL (กรณีโดน Bot Blocker หรือโหลดผ่าน Shortlink)
 */
export function extractTitleFromUrlSlug(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = decodeURIComponent(parsed.pathname);

    // Shopee format: /product-name-i.12345.67890
    if (urlStr.includes('shopee') || urlStr.includes('shp.ee')) {
      const match = pathname.match(/\/([^\/]+)-i\.\d+\.\d+/);
      if (match && match[1]) {
        return match[1].replace(/[-_]/g, ' ').trim();
      }
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0 && parts[0] !== 'product') {
        return parts[0].replace(/[-_]/g, ' ').trim();
      }
    }

    // Lazada format: /products/product-name-i12345-s67890.html
    if (urlStr.includes('lazada')) {
      const match = pathname.match(/\/products\/([^\/]+)-i\d+/);
      if (match && match[1]) {
        return match[1].replace(/[-_]/g, ' ').trim();
      }
      const parts = pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last) {
        return last.replace(/\.html$/, '').replace(/[-_]/g, ' ').trim();
      }
    }

    // TikTok format
    if (urlStr.includes('tiktok')) {
      const parts = pathname.split('/').filter(Boolean);
      return parts[parts.length - 1]?.replace(/[-_]/g, ' ') || 'สินค้า TikTok Shop';
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * 3. Fetch OpenGraph & HTML metadata จาก URL
 */
export async function fetchUrlMetadata(targetUrl: string): Promise<ExtractedMeta> {
  const platform = detectPlatform(targetUrl);
  if (!isAllowedMarketplaceUrl(targetUrl, platform)) {
    throw new Error('direct_marketplace_product_url_required');
  }

  let finalUrl = targetUrl;
  let html = '';

  try {
    let requestUrl = targetUrl;
    let res: Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_MARKETPLACE_REDIRECTS; redirectCount += 1) {
      res = await fetch(requestUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get('location');
      if (!location || redirectCount === MAX_MARKETPLACE_REDIRECTS) {
        throw new Error('marketplace_redirect_limit_exceeded');
      }
      const nextUrl = new URL(location, requestUrl).toString();
      if (!isAllowedMarketplaceUrl(nextUrl, platform)) {
        throw new Error('marketplace_redirect_outside_allowlist');
      }
      requestUrl = nextUrl;
    }

    if (!res) throw new Error('marketplace_request_failed');
    finalUrl = res.url || requestUrl;
    if (!isAllowedMarketplaceUrl(finalUrl, platform)) {
      throw new Error('marketplace_final_url_outside_allowlist');
    }
    if (!res.ok) {
      throw new Error(`Marketplace returned HTTP ${res.status}`);
    }
    html = await readResponseText(res);
  } catch (err) {
    throw new Error(`Marketplace product page unavailable: ${err instanceof Error ? err.message : 'request failed'}`);
  }

  // Parse OpenGraph tags from HTML
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                      html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i);

  // Price from JSON-LD supplied by the product page. Never invent a price.
  let rawPrice: number | undefined;
  const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const block of jsonLdMatches) {
      try {
        const jsonContent = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        const parsed = JSON.parse(jsonContent);
        const records = Array.isArray(parsed) ? parsed : [parsed];
        for (const record of records) {
          const price = record?.offers?.price ?? record?.offers?.lowPrice;
          if (price !== undefined && Number(price) > 0) {
            rawPrice = Number(price);
            break;
          }
        }
        if (rawPrice) break;
      } catch {
        // Ignore unrelated JSON-LD blocks.
      }
    }
  }

  const slugTitle = extractTitleFromUrlSlug(finalUrl) || extractTitleFromUrlSlug(targetUrl);
  const rawTitle = decodeHTMLEntities(ogTitleMatch?.[1] || titleMatch?.[1] || slugTitle || '');
  const imageUrl = decodeHTMLEntities(ogImageMatch?.[1] || '');
  const description = decodeHTMLEntities(ogDescMatch?.[1] || '');
  const genericPage = /^(shopee thailand|lazada|tiktok shop)(\s*[|:].*)?$/i.test(rawTitle);

  if (!rawTitle || genericPage || !imageUrl || imageUrl.includes('/icon-192.png') || !rawPrice) {
    throw new Error('Product page did not expose verifiable title, image, and price metadata');
  }

  return {
    rawTitle,
    imageUrl,
    description,
    rawPrice,
    platform,
    sourceUrl: finalUrl,
  };
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * 4. Synthesize Complete ProductDeal using Mimi Coach LLM (Gemini 3.1 Flash Lite)
 */
export async function synthesizeDealWithAI(meta: ExtractedMeta): Promise<ProductDeal> {
  const baseUrl = process.env.MIMI_BASE_URL || 'https://scgc-ailylab-eco.scg.com';
  const token = process.env.MIMI_TOKEN || '';
  const model = process.env.MIMI_PRIMARY_MODEL || 'gemini-3.1-flash-lite-preview';

  if (!token) {
    throw new Error('MIMI_TOKEN is not configured');
  }

  const systemPrompt = `You are a conservative data-normalization assistant for ShopDee.
Use only facts present in the supplied product-page metadata. You may clean the title and assign a broad category, but you must never invent prices, stores, ratings, sales, reviews, vouchers, stock, or links.
Return only valid JSON. For every field that is not directly supported by the input, return null, an empty array, or false as appropriate.`;

  const userPrompt = JSON.stringify({
    title: meta.rawTitle,
    description: meta.description,
    platform: meta.platform,
    hintPrice: meta.rawPrice,
  });

  try {
    const res = await fetch(`${baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(4500),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Normalize this product metadata and return valid JSON only:\n${userPrompt}\n\nSchema:\n{
  "cleanTitle": string,
  "category": string,
  "tags": string[]
}` },
        ],
        temperature: 0.2,
        max_tokens: 850,
      }),
    });

    if (!res.ok) {
      throw new Error(`Mimi returned HTTP ${res.status}`);
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content || '';
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(content);

    return constructProductDealFromAI(meta, parsed);
  } catch (err) {
    console.error('[Ingest] Error in AI synthesis:', err);
    throw err instanceof Error ? err : new Error('AI normalization failed');
  }
}

/**
 * Build a deal from verified page metadata. AI may only normalize text fields.
 */
function constructProductDealFromAI(meta: ExtractedMeta, ai: Record<string, unknown>): ProductDeal {
  const dealId = `ingested-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const price = Number(meta.rawPrice);
  const platform = meta.platform;
  const title = typeof ai.cleanTitle === 'string' && ai.cleanTitle.trim() ? ai.cleanTitle.trim() : meta.rawTitle;
  const category = typeof ai.category === 'string' && ai.category.trim() ? ai.category.trim() : 'สินค้า';
  const tags = Array.isArray(ai.tags)
    ? ai.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];
  const storeName = meta.storeName || `ร้านค้า ${platform}`;

  if (!Number.isFinite(price) || price <= 0 || !isUsablePlatformUrl(meta.sourceUrl, platform)) {
    throw new Error('Verified product metadata is incomplete');
  }

  const comparison: PlatformPriceComparison = {
    platform,
    price,
    estimatedAfterVoucher: price,
    storeName,
    storeType: 'regular',
    url: meta.sourceUrl,
    inStock: true,
    hasDirectProduct: true,
  };

  const store: StoreOffer = {
    id: `${dealId}-${platform}-main`,
    platform,
    storeName,
    storeType: 'regular',
    price,
    estimatedAfterVoucher: price,
    freeShipping: false,
    storeRating: 0,
    soldCount: 0,
    isLowestOverall: false,
    isBestValue: false,
    isBestStore: false,
    badgeNote: 'ข้อมูลจากหน้าสินค้าโดยตรง',
    url: meta.sourceUrl,
    isDirectProduct: true,
  };

  return {
    id: dealId,
    title,
    imageUrl: meta.imageUrl,
    category,
    tags,
    platform,
    storeName,
    storeType: 'regular',
    storeRating: 0,
    soldCount: 0,
    basePrice: price,
    originalPrice: price,
    estimatedFinalPrice: price,
    vipFinalPrice: price,
    hasOptionBait: false,
    thaiAuthenticityScore: 0,
    authenticitySummary: 'ยังไม่มีข้อมูลยืนยันร้าน รีวิว หรือราคาเปรียบเทียบจากแพลตฟอร์มอื่น',
    reviews: [],
    freeShipping: false,
    availableVouchers: [],
    isAbsoluteCheapest: false,
    priceComparisons: [comparison],
    stores: [store],
    affiliateUrl: meta.sourceUrl,
  };
}
