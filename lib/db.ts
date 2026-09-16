import { FilterState, Platform, ProductDeal, StoreType } from './types';
import { loadFullCatalog } from './catalog-loader';
import { DEFAULT_FILTER_STATE, filterAndRankDeals } from './engine';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Helper to fetch from Supabase REST API without requiring external dependencies
 */
async function supabaseFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers,
      },
      cache: 'no-store', // Disable cache for instant update
    });

    if (!res.ok) {
      console.warn(`Supabase query failed for ${endpoint}:`, res.status, res.statusText);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Supabase network error for ${endpoint}:`, err);
    return null;
  }
}

/**
 * Map Supabase snake_case row to Application camelCase ProductDeal.
 *
 * NOTE (AGENTS.md real-data policy): synthetic/unsourced fields must stay
 * neutral — they are never read from the DB nor drive ranking. Ranking uses
 * storeType/storeRating/verified comparisons in lib/engine.ts only.
 */
function normalizeStoreType(value: unknown): StoreType {
  return value === 'mall' || value === 'preferred' || value === 'verified' ? value : 'regular';
}

function mapDbRowToProduct(raw: any): ProductDeal {
  return {
    id: raw.id,
    title: raw.title,
    imageUrl: raw.image_url,
    category: raw.category,
    tags: raw.tags || [],
    platform: raw.platform,
    storeName: raw.store_name,
    storeType: normalizeStoreType(raw.store_type),
    storeRating: raw.rating,
    soldCount: raw.sold_count,
    basePrice: Number(raw.base_price),
    originalPrice: Number(raw.market_avg_price || raw.base_price),
    estimatedFinalPrice: Number(raw.estimated_final_price || raw.base_price),
    vipFinalPrice: Number(raw.estimated_final_price || raw.base_price),
    // Neutralized per real-data policy (unsourced in feed/DB):
    hasOptionBait: false,
    thaiAuthenticityScore: 0,
    authenticitySummary: 'ข้อมูลจาก official feed; ยังไม่มีการประเมินความน่าเชื่อถือเพิ่มเติม',
    reviews: [],
    freeShipping: false,
    availableVouchers: [],
    isAbsoluteCheapest: false,
    affiliateUrl: raw.affiliate_url,
    priceComparisons: (raw.store_offers || []).map((o: any) => ({
      platform: o.platform,
      price: Number(o.price),
      estimatedAfterVoucher: Number(o.estimated_after_voucher || o.price),
      storeName: o.store_name,
      storeType: o.store_type,
      url: o.url,
      inStock: true,
      hasDirectProduct: true
    })),
    stores: (raw.store_offers || []).map((o: any) => ({
      id: o.id,
      platform: o.platform,
      storeName: o.store_name,
      storeType: o.store_type,
      price: Number(o.price),
      estimatedAfterVoucher: Number(o.estimated_after_voucher || o.price),
      freeShipping: o.delivery_fee === 0,
      storeRating: Number(o.rating),
      soldCount: Number(o.review_count),
      url: o.url,
      isDirectProduct: true
    }))
  };
}

/**
 * Local JSON fallback (zero-config / Supabase outage).
 * Reuses the same source-backed filter/sort logic as the rest of the app.
 */
async function getFallbackDeals(options: {
  query?: string;
  category?: string;
  maxPrice?: number;
  onlyMall?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
  platforms?: string[];
} = {}): Promise<{ deals: ProductDeal[]; total: number }> {
  const all = await loadFullCatalog();
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  const filter: FilterState = {
    ...DEFAULT_FILTER_STATE,
    selectedCategory: options.category ?? 'ทั้งหมด',
    maxPrice: options.maxPrice ?? null,
    onlyMall: options.onlyMall ?? false,
    sortBy: (options.sortBy as FilterState['sortBy']) ?? 'popular',
    selectedPlatforms: (options.platforms as Platform[] | undefined) ?? ['shopee', 'lazada', 'tiktok'],
    limit: offset + limit,
  };
  const { deals, totalMatching } = filterAndRankDeals(all, options.query ?? '', filter);
  return { deals: deals.slice(offset, offset + limit), total: totalMatching };
}

/**
 * Retrieve product deals from Supabase, falling back to the local JSON
 * catalog when Supabase is unconfigured or unreachable (never blank page).
 */
export async function getDeals(options: {
  query?: string;
  category?: string;
  maxPrice?: number;
  onlyMall?: boolean;
  sortBy?: string;
  limit?: number;
  offset?: number;
  platforms?: string[];
} = {}): Promise<{ deals: ProductDeal[]; total: number }> {
  let dbResults: ProductDeal[] = [];
  let dbTotal = 0;
  let dbOk = false;

  if (isSupabaseConfigured) {
    let endpoint = 'products?select=*,store_offers(*)&publication_status=eq.approved';
    
    if (options.category && options.category !== 'ทั้งหมด') {
      endpoint += `&category=eq.${encodeURIComponent(options.category)}`;
    }
    if (options.query) {
      endpoint += `&title=ilike.*${encodeURIComponent(options.query)}*`;
    }
    if (options.maxPrice) {
      endpoint += `&base_price=lte.${options.maxPrice}`;
    }
    if (options.onlyMall) {
      endpoint += `&store_type=eq.mall`;
    }

    let sortOrder = 'sold_count.desc';
    if (options.sortBy === 'cheapest') sortOrder = 'base_price.asc';
    if (options.sortBy === 'expensive') sortOrder = 'base_price.desc';
    
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    endpoint += `&order=${sortOrder}&limit=${limit}&offset=${offset}`;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const countHeader = res.headers.get('content-range');
        dbTotal = countHeader ? parseInt(countHeader.split('/')[1], 10) : 0;
        const data = await res.json() as any[];
        dbResults = data.map(mapDbRowToProduct);
        dbOk = true;
      } else {
        console.warn(`Supabase getDeals failed: ${res.status} — using local catalog fallback`);
      }
    } catch (err) {
      console.warn('Supabase fetch error, using local catalog fallback:', err);
    }
  }

  if (!dbOk) {
    return getFallbackDeals(options);
  }

  // Final Filtering by Platform (in Memory for accuracy)
  if (options.platforms && options.platforms.length > 0 && options.platforms.length < 3) {
    dbResults = dbResults.filter(deal => {
      const hasMain = options.platforms!.includes(deal.platform);
      const hasOther = deal.priceComparisons.some(pc => options.platforms!.includes(pc.platform));
      return hasMain || hasOther;
    });
  }

  return {
    deals: dbResults,
    total: dbTotal
  };
}

/**
 * Retrieve single deal by ID from real catalog
 */
export async function getDealById(id: string): Promise<ProductDeal | null> {
  if (isSupabaseConfigured) {
    const data = await supabaseFetch<any[]>(`products?id=eq.${id}&select=*,store_offers(*)`);
    if (data && data.length > 0) {
      return mapDbRowToProduct(data[0]);
    }
  }
  const allDeals = await loadFullCatalog();
  return allDeals.find((d) => d.id === id) || null;
}

/**
 * Save external store offers (Lazada, TikTok, Extra Shopee)
 * Called from JIT Ingest logic.
 * Rejects search/catalog URLs — only direct product URLs are persisted.
 */
export async function saveExternalOffers(productId: string, offers: any[]): Promise<void> {
  if (!isSupabaseConfigured) return;

  const directOffers = (offers || []).filter(
    (o) =>
      o &&
      typeof o.url === 'string' &&
      !['/search', '/catalog', '/tag/', 'keyword=', '?q='].some((frag) => o.url.includes(frag)),
  );
  if (directOffers.length === 0) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_offers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(directOffers.map(o => ({
        id: o.id || `${productId}-${o.platform}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: productId,
        platform: o.platform,
        store_name: o.storeName || 'Verified Store',
        store_type: o.storeType || 'regular',
        price: Number(o.price),
        rating: Number(o.rating || 4.8),
        review_count: Number(o.reviewCount || 100),
        estimated_after_voucher: Number(o.price),
        url: o.url,
        updated_at: new Date().toISOString()
      })))
    });

    if (!res.ok) console.warn('Failed to save external offers');
  } catch (err) {
    console.error('saveExternalOffers error:', err);
  }
}
export async function createPriceAlert(
  productId: string,
  userLineId: string,
  targetPrice: number
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/price_alerts`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          product_id: productId,
          user_line_id: userLineId,
          target_price: targetPrice,
          status: 'active',
        }),
      });

      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: `Supabase returned ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // In zero-config mode, log simulation
  console.log(`[PriceAlert Simulation] Product ${productId} -> User ${userLineId} at ฿${targetPrice}`);
  return { success: true };
}
