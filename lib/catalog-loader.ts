/**
 * catalog-loader.ts
 * Loads and merges all real product catalogs:
 * 1. seeded-catalog.json    — AI-synthesized by background seed worker
 * 2. shopee-feed-catalog.json — parsed from official Shopee Affiliate Data Feed
 *
 * No MOCK_DEALS. Only real products.
 */

import { ProductDeal, Platform, StoreType, PlatformPriceComparison, StoreOffer, Voucher } from './types';

// ─── Static imports (Next.js bundles at build time for SSR) ───────────────────
import seededRaw from './seeded-catalog.json';
import partnerRaw from './partner-catalog.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  shopee: ['shopee.co.th', 'shope.ee'],
  lazada: ['lazada.co.th'],
  tiktok: ['tiktok.com', 'tiktokshop.com'],
};

function isUsablePlatformUrl(value: unknown, platform: Platform): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    const hostMatches = PLATFORM_HOSTS[platform].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
    if (!hostMatches) return false;

    // Search/tag landing pages are not product links and cannot substantiate a deal.
    return !['/search', '/tag', '/keyword'].some((prefix) => url.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

/**
 * Persisted deals must retain a verifiable marketplace product URL.
 * This also removes legacy synthetic/search-link deals during localStorage migration.
 */
export function isValidPersistedDeal(value: unknown): value is ProductDeal {
  if (!value || typeof value !== 'object') return false;
  const deal = value as AnyRecord;
  const platform = deal.platform as Platform;
  return Boolean(
    deal.id &&
    deal.title &&
    PLATFORM_HOSTS[platform] &&
    isUsablePlatformUrl(deal.affiliateUrl, platform),
  );
}


// ─── Shopee Feed → ProductDeal adapter ───────────────────────────────────────

function makePlatformComparison(
  platform: Platform,
  price: number,
  originalPrice: number,
  discountPercent: number,
  affiliateUrl: string,
  storeName?: string,
  storeType?: StoreType,
): PlatformPriceComparison {
  return {
    platform,
    price: Math.round(price),
    estimatedAfterVoucher: Math.round(price * 0.95),
    storeName: storeName || (platform === 'shopee' ? 'Shopee Official' : platform === 'lazada' ? 'Lazada TH' : 'TikTok Shop'),
    storeType: storeType || ('regular' as StoreType),
    url: affiliateUrl || `https://shopee.co.th`,
    inStock: true,
  };
}

function makeStoreOffer(
  id: string,
  platform: Platform,
  price: number,
  affiliateUrl: string,
  isLowest: boolean,
  soldCount: number,
  storeName?: string,
  storeType?: StoreType,
): StoreOffer {
  return {
    id: `${id}-${platform}`,
    platform,
    storeName: storeName || (platform === 'shopee' ? 'Shopee Store' : platform === 'lazada' ? 'Lazada Store' : 'TikTok Shop'),
    storeType: storeType || ('regular' as StoreType),
    price: Math.round(price),
    estimatedAfterVoucher: Math.round(price * 0.95),
    voucherNote: 'ใช้โค้ด SHOPDEE5 ลด 5%',
    freeShipping: price >= 100,
    storeRating: 4.5 + Math.random() * 0.4,
    soldCount,
    isLowestOverall: isLowest,
    url: affiliateUrl || `https://shopee.co.th`,
  };
}

function makeVoucher(platform: Platform, discount: number, minSpend: number): Voucher {
  return {
    id: `v-${platform}-${discount}`,
    code: discount >= 50 ? `SALE${discount}` : 'SHOPDEE5',
    discountText: discount >= 50 ? `ลด ${discount}%` : 'ลด 5%',
    minSpend: Math.round(minSpend),
    discountAmount: discount >= 50 ? Math.round(minSpend * discount / 100) : Math.round(minSpend * 0.05),
    isVipOnly: false,
    tag: 'แพลตฟอร์ม',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptFeedItem(raw: AnyRecord): ProductDeal | null {
  try {
    const id = raw.id as string;
    const shopeePrice = Number(raw.platforms?.[0]?.currentPrice ?? raw.sale_price ?? 0);
    const origPrice = Number(raw.platforms?.[0]?.originalPrice ?? raw.original_price ?? shopeePrice * 1.2);
    const discount = Number(raw.platforms?.[0]?.discountPercent ?? raw.discount ?? 0);
    const soldCount = Number(raw.reviewCount ?? raw.sold ?? raw._metadata?.sold ?? 0);
    const affiliateUrl = String(raw.affiliateUrl ?? raw.link ?? '');
    const image = String(raw.imageUrl ?? raw.image ?? '');
    const title = String(raw.title ?? '');
    const category = String(raw.category ?? 'lifestyle');

    if (!title || shopeePrice <= 0) return null;

    // Determine store type (Mall / Preferred / Regular)
    const isMall = raw.storeType === 'mall' || raw.isOfficialShop === true || raw.is_official_shop === 'Official shop';
    const isPreferred = raw.storeType === 'preferred' || raw.isPreferredShop === true || (typeof raw.is_preferred_shop === 'string' && raw.is_preferred_shop.includes('Preferred'));
    const storeType: StoreType = isMall ? 'mall' : isPreferred ? 'preferred' : 'regular';
    const storeName = String(raw.storeName || raw.shop_name || (isMall ? 'Shopee Mall' : 'Shopee Official'));

    const priceComparisons: PlatformPriceComparison[] = [
      makePlatformComparison('shopee', shopeePrice, origPrice, discount, affiliateUrl, storeName, storeType),
    ];

    const stores: StoreOffer[] = [
      makeStoreOffer(id, 'shopee', shopeePrice, affiliateUrl, false, soldCount, storeName, storeType),
    ];

    const availableVouchers: Voucher[] = [
      makeVoucher('shopee', discount, shopeePrice),
    ];

    return {
      id,
      title,
      imageUrl: image,
      category,
      tags: (raw.tags as string[]) ?? [category],
      platform: 'shopee' as Platform,
      storeName,
      storeType,
      storeRating: Number(raw.rating ?? 4.5),
      soldCount,
      basePrice: shopeePrice,
      originalPrice: origPrice,
      marketAvgPrice: shopeePrice,
      estimatedFinalPrice: Math.round(shopeePrice * 0.95),
      vipFinalPrice: Math.round(shopeePrice * 0.9),
      hasOptionBait: false,
      thaiAuthenticityScore: 80 + Math.min(18, Math.floor(soldCount / 100)),
      authenticitySummary: `ขายแล้ว ${soldCount.toLocaleString()} ชิ้น ⭐${raw.rating ?? 4.5}`,
      reviews: [],
      freeShipping: shopeePrice >= 100,
      availableVouchers,
      isAbsoluteCheapest: false,
      priceComparisons,
      stores,
      affiliateUrl,
      aiInsight: raw.aiInsight as string | undefined,
      priceAdvice: discount >= 30 ? 'buy_now' : 'fair_price',
      priceAdviceNote: discount >= 30
        ? `ลด ${discount}% ราคานี้คุ้มมาก!`
        : 'ราคาปกติตลาด',
    } as ProductDeal;
  } catch {
    return null;
  }
}

// ─── Partner links manually verified from marketplace product pages ──────────
function normalizePartnerItem(raw: AnyRecord): ProductDeal | null {
  try {
    const platform = raw.platform as Platform;
    const price = Number(raw.price);
    const originalPrice = Number(raw.originalPrice ?? price);
    const affiliateUrl = String(raw.affiliateUrl ?? '');
    const title = String(raw.title ?? '');

    if (
      !title ||
      !PLATFORM_HOSTS[platform] ||
      !isUsablePlatformUrl(affiliateUrl, platform) ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return null;
    }

    const comparison: PlatformPriceComparison = {
      platform,
      price,
      estimatedAfterVoucher: price,
      storeName: String(raw.storeName ?? `${platform} store`),
      storeType: (raw.storeType as StoreType) ?? 'regular',
      url: affiliateUrl,
      inStock: true,
    };
    const store: StoreOffer = {
      id: `${raw.id}-store`,
      platform,
      storeName: comparison.storeName,
      storeType: comparison.storeType,
      price,
      estimatedAfterVoucher: price,
      voucherNote: String(raw.priceNote ?? 'ราคาจากหน้าสินค้าจริง ยังไม่รวมโค้ดส่วนลด'),
      freeShipping: Boolean(raw.freeShipping),
      storeRating: Number(raw.storeRating ?? 0),
      soldCount: Number(raw.reviewCount ?? 0),
      isLowestOverall: false,
      url: affiliateUrl,
    };

    return {
      id: String(raw.id),
      title,
      imageUrl: String(raw.imageUrl ?? ''),
      category: String(raw.category ?? 'ของใช้ในบ้าน'),
      tags: Array.isArray(raw.tags) ? raw.tags as string[] : [],
      platform,
      storeName: comparison.storeName,
      storeType: comparison.storeType,
      storeRating: store.storeRating,
      soldCount: store.soldCount,
      basePrice: price,
      originalPrice: Number.isFinite(originalPrice) && originalPrice > 0 ? originalPrice : price,
      marketAvgPrice: price,
      estimatedFinalPrice: price,
      vipFinalPrice: price,
      hasOptionBait: false,
      thaiAuthenticityScore: 0,
      authenticitySummary: 'ยังไม่ได้ตรวจสอบความแท้ของร้านหรือสินค้า',
      reviews: [],
      freeShipping: store.freeShipping,
      availableVouchers: [],
      isAbsoluteCheapest: false,
      priceComparisons: [comparison],
      stores: [store],
      affiliateUrl,
      priceAdvice: 'fair_price',
      priceAdviceNote: String(raw.priceNote ?? 'ราคาจากหน้าสินค้าจริง ยังไม่รวมโค้ดส่วนลด'),
    };
  } catch {
    return null;
  }
}

// ─── Seeded catalog items (from AI worker) ───────────────────────────────────
// These are already in ProductDeal format (synthesized by Mimi AI)
function normalizeSeededItem(raw: AnyRecord): ProductDeal | null {
  try {
    // Items from seed-worker are accepted only when every outbound URL is verifiable.
    if (!raw.id || !raw.title || !PLATFORM_HOSTS[raw.platform as Platform]) return null;
    if (!isUsablePlatformUrl(raw.affiliateUrl, raw.platform as Platform)) return null;

    const comparisons = Array.isArray(raw.priceComparisons) ? raw.priceComparisons : [];
    const stores = Array.isArray(raw.stores) ? raw.stores : [];
    if (
      comparisons.length === 0 ||
      comparisons.some((comparison: AnyRecord) =>
        !PLATFORM_HOSTS[comparison.platform as Platform] ||
        !isUsablePlatformUrl(comparison.url, comparison.platform as Platform),
      ) ||
      stores.length === 0 ||
      stores.some((store: AnyRecord) =>
        !PLATFORM_HOSTS[store.platform as Platform] ||
        !isUsablePlatformUrl(store.url, store.platform as Platform),
      )
    ) {
      return null;
    }

    // If it already has platform/basePrice it's a full ProductDeal.
    if (raw.basePrice !== undefined) return raw as unknown as ProductDeal;
    return adaptFeedItem(raw);
  } catch {
    return null;
  }
}

// ─── Load Shopee feed catalog (imported lazily to avoid huge static bundle) ──
let _feedCache: ProductDeal[] | null = null;

async function loadFeedCatalog(): Promise<ProductDeal[]> {
  if (_feedCache) return _feedCache;
  try {
    // Dynamic import to avoid blocking initial bundle
    const mod = await import('./shopee-feed-catalog.json');
    const rawItems: AnyRecord[] = (mod.default ?? mod) as AnyRecord[];
    _feedCache = rawItems.map(adaptFeedItem).filter(Boolean) as ProductDeal[];
    return _feedCache;
  } catch {
    return [];
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/** Synchronously returns partner links verified from marketplace pages. */
export function getPartnerCatalog(): ProductDeal[] {
  const raw = partnerRaw as unknown as AnyRecord[];
  return raw.map(normalizePartnerItem).filter(Boolean) as ProductDeal[];
}

/** Synchronously returns seeded catalog items (available at SSR/client load time). */
export function getSeededCatalog(): ProductDeal[] {
  const raw = seededRaw as unknown as AnyRecord[];
  return raw.map(normalizeSeededItem).filter(Boolean) as ProductDeal[];
}

/** Async — loads Shopee feed catalog (200 top items from official affiliate feed). */
export { loadFeedCatalog };

/** Combined real catalog (partner links + seeded + feed). Call from client useEffect. */
export async function loadFullCatalog(): Promise<ProductDeal[]> {
  const [seeded, feed] = await Promise.all([
    Promise.resolve(getSeededCatalog()),
    loadFeedCatalog(),
  ]);
  const partner = getPartnerCatalog();
  // Merge, deduplicate by id
  const seen = new Set<string>();
  const all: ProductDeal[] = [];
  for (const d of [...partner, ...seeded, ...feed]) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      all.push(d);
    }
  }
  return all;
}
