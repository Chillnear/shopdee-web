/**
 * catalog-loader.ts
 * Loads and merges all real product catalogs:
 * 1. seeded-catalog.json    — AI-synthesized by background seed worker
 * 2. shopee-feed-catalog.json — parsed from official Shopee Affiliate Data Feed
 *
 * No MOCK_DEALS. Only real products.
 */

import { ProductDeal, Platform, StoreType, PlatformPriceComparison, StoreOffer } from './types';
import { cleanProductTitle, getSanitizedOriginalPrice } from './engine';

// ─── Static imports (Next.js bundles at build time for SSR) ───────────────────
import verifiedRaw from './verified-catalog.json';
import partnerRaw from './partner-catalog.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  shopee: ['shopee.co.th', 'shope.ee'],
  lazada: ['lazada.co.th', 's.lazada.co.th'],
  tiktok: ['tiktok.com', 'tiktokshop.com', 'shop.tiktok.com', 'vt.tiktok.com'],
};

const SEARCH_PATH_PREFIXES = ['/search', '/tag', '/keyword', '/catalog'];

/**
 * Accept only direct PDP URLs or platform-owned short affiliate links.
 * A marketplace homepage, profile, category, or search URL is never an offer.
 */
export function isUsablePlatformUrl(value: unknown, platform: Platform): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    const hostMatches = PLATFORM_HOSTS[platform].some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`),
    );
    if (!hostMatches || SEARCH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;

    if (platform === 'shopee') {
      const parts = path.split('/').filter(Boolean);
      const numericProduct = parts.length >= 3 && parts.at(-3) === 'product'
        && parts.slice(-2).every((part) => /^[0-9]+$/.test(part));
      const slugProduct = path.includes('-i.') && path.split('-i.')[1]?.includes('.');
      let decodedSearch = url.search.toLowerCase();
      try {
        decodedSearch = decodeURIComponent(decodedSearch);
      } catch {
        // Keep the encoded query when it is malformed.
      }
      return numericProduct || slugProduct || (
        host === 'shope.ee' && path === '/an_redir' && decodedSearch.includes('origin_link=') && decodedSearch.includes('/product/')
      );
    }

    if (platform === 'lazada') {
      const directLazadaPath = path.startsWith('/products/') && path.includes('-i') && path.includes('-s');
      return directLazadaPath || (host === 's.lazada.co.th' && path.startsWith('/s.'));
    }

    return (
      (host === 'vt.tiktok.com' && path.length > 1) ||
      (host === 'shop.tiktok.com' && (path.includes('/pdp/') || path.includes('/product/'))) ||
      (host === 'tiktok.com' && path.includes('/view/product/')) ||
      (host === 'tiktokshop.com' && path.includes('/product/'))
    );
  } catch {
    return false;
  }
}

/**
 * Comparison/store offers use the same direct-product rule as primary links.
 */
function isPlatformOutboundUrl(value: unknown, platform: Platform): value is string {
  return isUsablePlatformUrl(value, platform);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptFeedItem(raw: AnyRecord): ProductDeal | null {
  try {
    if (raw.is_active === false) return null;
    const id = String(raw.id ?? '');
    const platform = 'shopee' as Platform;
    const sourceOffer = Array.isArray(raw.platforms) ? raw.platforms.find((item: AnyRecord) => item?.platform === platform) : undefined;
    const price = Number(sourceOffer?.currentPrice ?? raw.sale_price ?? 0);
    const rawOriginalPrice = Number(sourceOffer?.originalPrice ?? raw.original_price ?? price);
    const originalPrice = getSanitizedOriginalPrice(price, rawOriginalPrice) ?? price;
    const affiliateUrl = String(sourceOffer?.affiliateUrl ?? raw.affiliateUrl ?? raw.link ?? '');
    const title = cleanProductTitle(String(raw.title ?? ''));
    const imageUrl = String(raw.imageUrl ?? raw.image ?? '');
    const storeName = String(raw.storeName ?? raw.shop_name ?? '');
    const storeType = raw.storeType as StoreType;
    const storeRating = Number(raw.rating ?? 0);
    // The feed exposes reviewCount, not sales. Never present it as sold count.
    const soldCount = Number(raw.soldCount ?? raw.sold ?? 0);

    if (
      !id || !title || !imageUrl || imageUrl.startsWith('/') || imageUrl.includes('unsplash.com') ||
      !storeName || !PLATFORM_HOSTS[platform] || !isUsablePlatformUrl(affiliateUrl, platform) ||
      !Number.isFinite(price) || price <= 0
    ) return null;

    const comparison: PlatformPriceComparison = {
      platform,
      price,
      estimatedAfterVoucher: price,
      storeName,
      storeType: storeType === 'mall' || storeType === 'preferred' ? storeType : 'regular',
      url: affiliateUrl,
      inStock: true,
      hasDirectProduct: true,
    };
    const store: StoreOffer = {
      id: `${id}-${platform}`,
      platform,
      storeName,
      storeType: comparison.storeType,
      price,
      estimatedAfterVoucher: price,
      freeShipping: Boolean(raw.freeShipping),
      storeRating: Number.isFinite(storeRating) && storeRating > 0 ? storeRating : 0,
      soldCount: Number.isFinite(soldCount) && soldCount > 0 ? soldCount : 0,
      isLowestOverall: false,
      isBestValue: false,
      isBestStore: comparison.storeType === 'mall',
      badgeNote: 'ข้อมูลจาก official Shopee feed',
      url: affiliateUrl,
      isDirectProduct: true,
    };

    return {
      id,
      title,
      imageUrl,
      category: String(raw.category ?? 'อื่นๆ'),
      tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      platform,
      storeName,
      storeType: comparison.storeType,
      storeRating: store.storeRating,
      soldCount: store.soldCount,
      basePrice: price,
      originalPrice,
      estimatedFinalPrice: price,
      vipFinalPrice: price,
      hasOptionBait: false,
      thaiAuthenticityScore: 0,
      authenticitySummary: 'ข้อมูลจาก official Shopee feed; ยังไม่มีการประเมินความน่าเชื่อถือเพิ่มเติม',
      reviews: [],
      freeShipping: store.freeShipping,
      availableVouchers: [],
      isAbsoluteCheapest: false,
      priceComparisons: [comparison],
      stores: [store],
      affiliateUrl,
    };
  } catch {
    return null;
  }
}

// ─── Partner links from marketplace product pages ────────────────────────────
function normalizePartnerItem(raw: AnyRecord): ProductDeal | null {
  try {
    if (raw.is_active === false) return null;
    const id = String(raw.id ?? '');
    const platform = raw.platform as Platform;
    const price = Number(raw.price);
    const rawOriginalPrice = Number(raw.originalPrice ?? price);
    const originalPrice = getSanitizedOriginalPrice(price, rawOriginalPrice) ?? price;
    const affiliateUrl = String(raw.affiliateUrl ?? '');
    const title = cleanProductTitle(String(raw.title ?? ''));
    const imageUrl = String(raw.imageUrl ?? '');
    const storeName = String(raw.storeName ?? '');
    const storeType = raw.storeType as StoreType;
    const storeRating = Number(raw.storeRating ?? 0);
    // reviewCount is review volume, not sales; no sales field is assumed here.
    const soldCount = Number(raw.soldCount ?? raw.sold ?? 0);

    if (
      !id || !title || !imageUrl || imageUrl.startsWith('/') || imageUrl.includes('unsplash.com') ||
      !PLATFORM_HOSTS[platform] || !isUsablePlatformUrl(affiliateUrl, platform) ||
      !storeName || !Number.isFinite(price) || price <= 0
    ) return null;

    const comparison: PlatformPriceComparison = {
      platform,
      price,
      estimatedAfterVoucher: price,
      storeName,
      storeType: storeType === 'mall' || storeType === 'preferred' ? storeType : 'regular',
      url: affiliateUrl,
      inStock: true,
      hasDirectProduct: true,
    };
    const store: StoreOffer = {
      id: `${id}-${platform}-main`,
      platform,
      storeName,
      storeType: comparison.storeType,
      price,
      estimatedAfterVoucher: price,
      freeShipping: Boolean(raw.freeShipping),
      storeRating: Number.isFinite(storeRating) && storeRating > 0 ? storeRating : 0,
      soldCount: Number.isFinite(soldCount) && soldCount > 0 ? soldCount : 0,
      isLowestOverall: false,
      isBestValue: false,
      isBestStore: comparison.storeType === 'mall',
      badgeNote: 'ข้อมูลจากหน้าสินค้าโดยตรง',
      url: affiliateUrl,
      isDirectProduct: true,
    };

    return {
      id,
      title,
      imageUrl,
      category: String(raw.category ?? 'อื่นๆ'),
      tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      platform,
      storeName,
      storeType: comparison.storeType,
      storeRating: store.storeRating,
      soldCount: store.soldCount,
      basePrice: price,
      originalPrice,
      estimatedFinalPrice: price,
      vipFinalPrice: price,
      hasOptionBait: false,
      thaiAuthenticityScore: 0,
      authenticitySummary: 'ข้อมูลจากหน้าสินค้าโดยตรง; ยังไม่มีการประเมินความน่าเชื่อถือเพิ่มเติม',
      reviews: [],
      freeShipping: store.freeShipping,
      availableVouchers: [],
      isAbsoluteCheapest: false,
      priceComparisons: [comparison],
      stores: [store],
      affiliateUrl,
    };
  } catch {
    return null;
  }
}

// ─── verified catalog items (from official source worker) ───────────────────────
// These records retain only source-backed product and offer fields.
function normalizeVerifiedItem(raw: AnyRecord): ProductDeal | null {
  try {
    if (raw.is_active === false) return null;
    // Every outbound comparison/store URL must be a direct platform product URL.
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

// ─── Published products from Supabase (approved candidates only) ─────────────
async function loadPublishedCatalog(): Promise<ProductDeal[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) return [];

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/rest/v1/products?select=id,title,image_url,category,platform,base_price,market_avg_price,rating,sold_count,store_name,store_type,affiliate_url,tags&publication_status=eq.approved&order=updated_at.desc`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) return [];
    const rows = await response.json() as AnyRecord[];
    return rows.map((raw) => normalizePartnerItem({
      id: raw.id,
      title: raw.title,
      imageUrl: raw.image_url,
      category: raw.category,
      tags: raw.tags,
      platform: raw.platform,
      price: raw.base_price,
      originalPrice: raw.market_avg_price,
      affiliateUrl: raw.affiliate_url,
      storeName: raw.store_name,
      storeType: raw.store_type,
      storeRating: raw.rating,
      soldCount: raw.sold_count,
    })).filter(Boolean) as ProductDeal[];
  } catch {
    return [];
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

/** Synchronously returns only catalog items accepted from verified sources. */
export function getVerifiedCatalog(): ProductDeal[] {
  const raw = verifiedRaw as unknown as AnyRecord[];
  return raw.map(normalizeVerifiedItem).filter(Boolean) as ProductDeal[];
}

/** @deprecated Use getVerifiedCatalog; retained for compatibility with older imports. */
export const getSeededCatalog = getVerifiedCatalog;

/** Async — loads Shopee feed catalog (200 top items from official affiliate feed). */
export { loadFeedCatalog };

/** Combined real catalog (partner links + verified + feed). Call from client useEffect. */
export async function loadFullCatalog(): Promise<ProductDeal[]> {
  const [published, verified, feed] = await Promise.all([
    loadPublishedCatalog(),
    Promise.resolve(getVerifiedCatalog()),
    loadFeedCatalog(),
  ]);
  const partner = getPartnerCatalog();
  // Merge, deduplicate by id; approved database records take priority.
  const seen = new Set<string>();
  const all: ProductDeal[] = [];
  for (const d of [...published, ...partner, ...verified, ...feed]) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      all.push(d);
    }
  }
  return all;
}
