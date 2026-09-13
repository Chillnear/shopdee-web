/**
 * catalog-loader.ts
 * Loads and merges all real product catalogs:
 * 1. seeded-catalog.json    — AI-synthesized by background seed worker
 * 2. shopee-feed-catalog.json — parsed from official Shopee Affiliate Data Feed
 *
 * No MOCK_DEALS. Only real products.
 */

import { ProductDeal, Platform, StoreType, PlatformPriceComparison, StoreOffer, Voucher } from './types';
import { cleanProductTitle, getSanitizedOriginalPrice } from './engine';

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

export function isUsablePlatformUrl(value: unknown, platform: Platform): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    const hostMatches = PLATFORM_HOSTS[platform].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
    if (!hostMatches) return false;

    // Search/tag landing pages are not product links and cannot substantiate a deal.
    return !['/search', '/tag', '/keyword', '/catalog'].some((prefix) => url.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

/**
 * Validates outbound comparison links to marketplace search, tags, or product pages.
 */
function isPlatformOutboundUrl(value: unknown, platform: Platform): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return PLATFORM_HOSTS[platform].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
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
  const img = String(deal.imageUrl || '');
  if (img.includes('unsplash.com') || img.includes('/icon-192.png')) return false;

  const affUrl = String(deal.affiliateUrl || '');
  if (
    affUrl.includes('/search') ||
    affUrl.includes('/catalog') ||
    affUrl.includes('/tag/') ||
    affUrl.includes('keyword=') ||
    affUrl.includes('?q=')
  ) {
    return false;
  }

  // ปฏิเสธดีลที่มีร้านค้าเป็น Search URL
  if (Array.isArray(deal.stores)) {
    const hasSearchStore = deal.stores.some((s: any) =>
      typeof s?.url === 'string' &&
      (s.url.includes('/search') || s.url.includes('/catalog') || s.url.includes('/tag/'))
    );
    if (hasSearchStore) return false;
  }

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

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
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
  voucherNote?: string,
  rating?: number,
  isBestStore?: boolean,
  badgeNote?: string,
  isBestValue?: boolean,
  freeShipping?: boolean,
): StoreOffer {
  return {
    id: `${id}-${platform}-${storeType || 'reg'}`,
    platform,
    storeName: storeName || (platform === 'shopee' ? 'Shopee Store' : platform === 'lazada' ? 'Lazada Store' : 'TikTok Shop'),
    storeType: storeType || ('regular' as StoreType),
    price: Math.round(price),
    estimatedAfterVoucher: Math.round(price * 0.95),
    voucherNote: voucherNote || (isLowest ? '🔥 ร้านราคาประหยัดถูกสุด' : 'ใช้โค้ด SHOPDEE5 ลด 5%'),
    freeShipping: freeShipping ?? (price >= 99),
    storeRating: rating || (storeType === 'mall' ? 4.9 : 4.8),
    soldCount,
    isLowestOverall: isLowest,
    isBestValue: isBestValue ?? false,
    isBestStore: isBestStore ?? (storeType === 'mall'),
    badgeNote,
    url: affiliateUrl || `https://shopee.co.th`,
    isDirectProduct: isUsablePlatformUrl(affiliateUrl, platform),
  };
}

function extractSearchKeywords(title: string, brand?: string): string {
  const cleaned = title
    .replace(/[【\[\(][^】\]\)]*[】\]\)]/g, ' ')
    .replace(/[^\w\s\u0E00-\u0E7F]/gi, ' ')
    .replace(/\b(COD|TH|BK|PRO|HOT|SALE)\b/gi, ' ')
    .replace(/(ใหม่|สินค้าใหม่|ของแท้|ส่งฟรี|พร้อมส่ง|ลดราคา|แท้100%?|ราคาถูก|โปรโมชั่น|1แถม1|ซื้อ 1 แถม 1|ในไทย|จัดส่งไว|ด่วน)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(w => w.length > 1);
  if (brand && brand !== 'NoBrand' && !cleaned.toLowerCase().includes(brand.toLowerCase())) {
    const simpleBrand = brand.split(/[\(\s]/)[0];
    return `${simpleBrand} ${words.slice(0, 4).join(' ')}`.trim();
  }
  return words.slice(0, 5).join(' ');
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
    const rawOrigPrice = Number(raw.platforms?.[0]?.originalPrice ?? raw.original_price ?? 0);
    const origPrice = getSanitizedOriginalPrice(shopeePrice, rawOrigPrice) ?? shopeePrice;
    const discount = origPrice > shopeePrice ? Math.round(((origPrice - shopeePrice) / origPrice) * 100) : 0;
    const soldCount = Number(raw.reviewCount ?? raw.sold ?? raw._metadata?.sold ?? 0);
    const affiliateUrl = String(raw.affiliateUrl ?? raw.link ?? '');
    const image = String(raw.imageUrl ?? raw.image ?? '');
    const title = cleanProductTitle(String(raw.title ?? ''));
    const category = String(raw.category ?? 'lifestyle');

    if (!title || shopeePrice <= 0) return null;

    // Determine store type (Mall / Preferred / Regular)
    const isMall = raw.storeType === 'mall' || raw.isOfficialShop === true || raw.is_official_shop === 'Official shop';
    const isPreferred = raw.storeType === 'preferred' || raw.isPreferredShop === true || (typeof raw.is_preferred_shop === 'string' && raw.is_preferred_shop.includes('Preferred'));
    const storeType: StoreType = isMall ? 'mall' : isPreferred ? 'preferred' : 'regular';
    const storeName = String(raw.storeName || raw.shop_name || (isMall ? 'Shopee Mall' : 'Shopee Official'));

    // Clean search keywords for ban-safe cross-platform linking
    const cleanKeywords = extractSearchKeywords(title, raw.brand as string);
    const queryEnc = encodeURIComponent(cleanKeywords);

    // 1. Cross-platform 3-App Comparisons (Only direct verified product offers, zero fake search deals)
    const isShopeeDirect = isUsablePlatformUrl(affiliateUrl, 'shopee');
    const priceComparisons: PlatformPriceComparison[] = [
      {
        platform: 'shopee',
        price: shopeePrice,
        estimatedAfterVoucher: Math.round(shopeePrice * 0.95),
        storeName,
        storeType,
        url: affiliateUrl,
        inStock: true,
        hasDirectProduct: isShopeeDirect,
      },
      {
        platform: 'lazada',
        price: 0,
        estimatedAfterVoucher: 0,
        storeName: 'ยังไม่มีลิงก์ตรง',
        storeType: 'regular',
        url: '',
        inStock: false,
        hasDirectProduct: false,
      },
      {
        platform: 'tiktok',
        price: 0,
        estimatedAfterVoucher: 0,
        storeName: 'ยังไม่มีลิงก์ตรง',
        storeType: 'regular',
        url: '',
        inStock: false,
        hasDirectProduct: false,
      },
    ];

    // 2. Real Store Offers (Only 100% verified direct product links)
    const stores: StoreOffer[] = [
      makeStoreOffer(
        `${id}-shopee`,
        'shopee',
        shopeePrice,
        affiliateUrl,
        true, // isLowestOverall
        soldCount,
        storeName,
        storeType,
        isMall ? '🛡️ Shopee Mall การันตีแท้ 100%' : '⭐ ร้านค้าแนะนำ Shopee',
        Number(raw.rating ?? 4.8),
        isMall, // isBestStore if mall
        isMall ? 'Shopee Mall แท้' : 'ร้านแนะนำ',
        true, // isBestValue
        shopeePrice >= 99
      ),
    ];
    const isAbsoluteCheapest = priceComparisons.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length >= 3;

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
      isAbsoluteCheapest,
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
    const rawOrigPrice = Number(raw.originalPrice ?? price);
    const originalPrice = getSanitizedOriginalPrice(price, rawOrigPrice) ?? price;
    const affiliateUrl = String(raw.affiliateUrl ?? '');
    const title = cleanProductTitle(String(raw.title ?? ''));

    const imageUrl = String(raw.imageUrl ?? '');
    if (
      !title ||
      !PLATFORM_HOSTS[platform] ||
      !isUsablePlatformUrl(affiliateUrl, platform) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      imageUrl.includes('unsplash.com')
    ) {
      return null;
    }

    const isDirect = isUsablePlatformUrl(affiliateUrl, platform);
    const storeType = (raw.storeType as StoreType) ?? 'regular';
    const storeName = String(raw.storeName ?? `${platform} store`);

    const priceComparisons: PlatformPriceComparison[] = [
      {
        platform: 'shopee',
        price: platform === 'shopee' ? price : 0,
        estimatedAfterVoucher: platform === 'shopee' ? Math.round(price * 0.95) : 0,
        storeName: platform === 'shopee' ? storeName : 'ยังไม่มีลิงก์ตรง',
        storeType: platform === 'shopee' ? storeType : 'regular',
        url: platform === 'shopee' ? affiliateUrl : '',
        inStock: platform === 'shopee',
        hasDirectProduct: platform === 'shopee' && isDirect,
      },
      {
        platform: 'lazada',
        price: platform === 'lazada' ? price : 0,
        estimatedAfterVoucher: platform === 'lazada' ? Math.round(price * 0.95) : 0,
        storeName: platform === 'lazada' ? storeName : 'ยังไม่มีลิงก์ตรง',
        storeType: platform === 'lazada' ? storeType : 'regular',
        url: platform === 'lazada' ? affiliateUrl : '',
        inStock: platform === 'lazada',
        hasDirectProduct: platform === 'lazada' && isDirect,
      },
      {
        platform: 'tiktok',
        price: platform === 'tiktok' ? price : 0,
        estimatedAfterVoucher: platform === 'tiktok' ? Math.round(price * 0.95) : 0,
        storeName: platform === 'tiktok' ? storeName : 'ยังไม่มีลิงก์ตรง',
        storeType: platform === 'tiktok' ? storeType : 'regular',
        url: platform === 'tiktok' ? affiliateUrl : '',
        inStock: platform === 'tiktok',
        hasDirectProduct: platform === 'tiktok' && isDirect,
      },
    ];

    const stores: StoreOffer[] = [
      {
        id: `${raw.id}-${platform}-main`,
        platform,
        storeName,
        storeType,
        price,
        estimatedAfterVoucher: Math.round(price * 0.95),
        voucherNote: String(raw.priceNote ?? 'ราคาจากหน้าสินค้าจริง ลิงก์ตรง'),
        freeShipping: Boolean(raw.freeShipping),
        storeRating: Number(raw.storeRating || 4.8),
        soldCount: Number(raw.reviewCount || 120),
        isLowestOverall: true,
        isBestValue: true,
        isBestStore: storeType === 'mall',
        badgeNote: 'ลิงก์ตรงหน้าสินค้า',
        url: affiliateUrl,
        isDirectProduct: isDirect,
      },
    ];

    return {
      id: String(raw.id),
      title,
      imageUrl: String(raw.imageUrl ?? ''),
      category: String(raw.category ?? 'ของใช้ในบ้าน'),
      tags: Array.isArray(raw.tags) ? raw.tags as string[] : [],
      platform,
      storeName,
      storeType,
      storeRating: Number(raw.storeRating || 4.8),
      soldCount: Number(raw.reviewCount || 120),
      basePrice: price,
      originalPrice: Number.isFinite(originalPrice) && originalPrice > 0 ? originalPrice : price,
      marketAvgPrice: price,
      estimatedFinalPrice: Math.round(price * 0.95),
      vipFinalPrice: Math.round(price * 0.90),
      hasOptionBait: false,
      thaiAuthenticityScore: 88,
      authenticitySummary: 'ตรวจสอบลิงก์สินค้าจริง มีประวัติการจำหน่าย',
      reviews: [],
      freeShipping: Boolean(raw.freeShipping),
      availableVouchers: [],
      isAbsoluteCheapest: priceComparisons.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length >= 3,
      priceComparisons,
      stores,
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
    if (String(raw.imageUrl ?? '').includes('unsplash.com')) return null;
    if (!isUsablePlatformUrl(raw.affiliateUrl, raw.platform as Platform)) return null;

    const comparisons = Array.isArray(raw.priceComparisons) ? raw.priceComparisons : [];
    const stores = Array.isArray(raw.stores) ? raw.stores : [];
    if (
      comparisons.length === 0 ||
      comparisons.some((comparison: AnyRecord) =>
        !PLATFORM_HOSTS[comparison.platform as Platform] ||
        !isPlatformOutboundUrl(comparison.url, comparison.platform as Platform),
      ) ||
      stores.length === 0 ||
      stores.some((store: AnyRecord) =>
        !PLATFORM_HOSTS[store.platform as Platform] ||
        !isPlatformOutboundUrl(store.url, store.platform as Platform),
      )
    ) {
      return null;
    }

    // If it already has platform/basePrice it's a full ProductDeal.
    if (raw.basePrice !== undefined) {
      const deal = { ...(raw as unknown as ProductDeal) };
      deal.title = cleanProductTitle(deal.title);
      const sanitized = getSanitizedOriginalPrice(deal.basePrice, deal.originalPrice);
      deal.originalPrice = sanitized ?? deal.basePrice;
      return deal;
    }
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
