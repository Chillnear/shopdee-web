import { FilterState, Platform, ProductDeal } from './types';

export const DEFAULT_FILTER_STATE: FilterState = {
  selectedPlatforms: ['shopee', 'lazada', 'tiktok'],
  onlyMall: false,
  onlyFreeShipping: false,
  minAuthenticity: 0,
  onlyDiscounted: false,
  maxPrice: null,
  sortBy: 'popular',
  // High cap so the full Grade A+B catalog (tens of thousands) is paginated
  // locally via displayedDeals/visibleCount rather than truncated. Only the
  // visible slice is rendered, so a large array is cheap to hold.
  limit: 100000,
  selectedCategory: 'ทั้งหมด',
};

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSoldCount(sold: number): string {
  if (sold >= 10000) {
    return `${(sold / 1000).toFixed(1)}k+ ชิ้น`;
  }
  if (sold >= 1000) {
    return `${(sold / 1000).toFixed(1)}k ชิ้น`;
  }
  return `${sold} ชิ้น`;
}

export function getPlatformMeta(platform: Platform) {
  switch (platform) {
    case 'shopee':
      return {
        name: 'Shopee',
        badgeColor: 'bg-[#EE4D2D] text-white',
        lightBg: 'bg-[#FFF5F1]',
        borderColor: 'border-[#EE4D2D]/30',
        textColor: 'text-[#EE4D2D]',
        accentHex: '#EE4D2D',
      };
    case 'lazada':
      return {
        name: 'Lazada',
        badgeColor: 'bg-[#0F3EAA] text-white',
        lightBg: 'bg-[#F0F2FF]',
        borderColor: 'border-[#0F3EAA]/30',
        textColor: 'text-[#0F3EAA]',
        accentHex: '#0F3EAA',
      };
    case 'tiktok':
      return {
        name: 'TikTok Shop',
        badgeColor: 'bg-gradient-to-r from-[#FE2C55] via-black to-[#25F4EE] text-white',
        lightBg: 'bg-neutral-100',
        borderColor: 'border-neutral-800/30',
        textColor: 'text-black',
        accentHex: '#000000',
      };
  }
}

export function getSmartAffiliateUrl(url: string, platform: Platform, dealId?: string): string {
  if (!url || !dealId) return '';
  return `/api/redirect?url=${encodeURIComponent(url)}&platform=${platform}&dealId=${encodeURIComponent(dealId)}`;
}

export function filterAndRankDeals(
  deals: ProductDeal[],
  query: string,
  filter: FilterState
): { deals: ProductDeal[]; totalMatching: number } {
  let filtered = [...deals];

  // 1. Text Search Filter
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(deal => {
      const matchTitle = deal.title.toLowerCase().includes(q);
      const matchCategory = deal.category.toLowerCase().includes(q);
      const matchTags = deal.tags.some(t => t.toLowerCase().includes(q));
      const matchStore = deal.storeName.toLowerCase().includes(q);
      return matchTitle || matchCategory || matchTags || matchStore;
    });
  }

  // 1.5 Category Filter — match the normalized category field directly.
  // The extraction script maps each feed item to a stable category id
  // (beauty, health, food, home, appliances, electronics, fashion, baby,
  // pets, sports, stationery, hobbies, auto), so we filter on that exact
  // value rather than fragile title-keyword matching.
  if (filter.selectedCategory && filter.selectedCategory !== 'ทั้งหมด') {
    const cat = filter.selectedCategory;
    filtered = filtered.filter((deal) => deal.category === cat);
  }

  // 2. Platform Filter
  if (filter.selectedPlatforms.length > 0 && filter.selectedPlatforms.length < 3) {
    filtered = filtered.filter(deal => {
      const matchesMain = filter.selectedPlatforms.includes(deal.platform);
      const matchesComparisons = deal.priceComparisons.some(pc =>
        filter.selectedPlatforms.includes(pc.platform) && pc.hasDirectProduct !== false && pc.price > 0
      );
      const matchesStores = deal.stores?.some(s => 
        filter.selectedPlatforms.includes(s.platform) && s.isDirectProduct !== false
      );
      return matchesMain || matchesComparisons || matchesStores;
    });
  }

  // Helper for platform-effective price
  const getEffectivePrice = (deal: ProductDeal) => {
    if (filter.selectedPlatforms.length === 3 || filter.selectedPlatforms.length === 0) {
      return deal.estimatedFinalPrice;
    }
    const matchingStores = deal.stores?.filter(s => filter.selectedPlatforms.includes(s.platform) && s.isDirectProduct !== false);
    if (matchingStores && matchingStores.length > 0) {
      return Math.min(...matchingStores.map(s => s.estimatedAfterVoucher));
    }
    const matchingComps = deal.priceComparisons?.filter(pc => filter.selectedPlatforms.includes(pc.platform) && pc.inStock && pc.hasDirectProduct !== false && pc.price > 0);
    if (matchingComps && matchingComps.length > 0) {
      return Math.min(...matchingComps.map(pc => pc.estimatedAfterVoucher));
    }
    return deal.estimatedFinalPrice;
  };

  // 3. Mall / Official Only Filter
  if (filter.onlyMall) {
    filtered = filtered.filter(deal => deal.storeType === 'mall');
  }

  // 4. Free Shipping Filter
  if (filter.onlyFreeShipping) {
    filtered = filtered.filter(deal => deal.freeShipping);
  }

  // 5. Trust threshold (source-backed): Mall store and/or store rating.
  // thaiAuthenticityScore is not sourced from any feed, so it must not gate results.
  if (filter.minAuthenticity > 0) {
    filtered = filtered.filter(deal => {
      const t = (deal.storeType === 'mall' ? 80 : deal.storeType === 'preferred' ? 50 : 20) + deal.storeRating * 10;
      return t >= filter.minAuthenticity;
    });
  }

  // 6. Has Voucher Only
  if (filter.onlyDiscounted) {
    filtered = filtered.filter(deal => (deal.originalPrice || 0) > deal.basePrice);
  }

  // 7. Max Price Filter
  if (filter.maxPrice !== null && filter.maxPrice > 0) {
    filtered = filtered.filter(deal => getEffectivePrice(deal) <= filter.maxPrice!);
  }

  // Total matching before slicing limit
  const totalMatching = filtered.length;

  // 8. Sorting
  filtered.sort((a, b) => {
    switch (filter.sortBy) {
      case 'cheapest':
        return getEffectivePrice(a) - getEffectivePrice(b);
      case 'expensive':
        return getEffectivePrice(b) - getEffectivePrice(a);
      case 'best_discount': {
        const priceA = getEffectivePrice(a);
        const priceB = getEffectivePrice(b);
        const discountPctA = a.originalPrice > priceA ? ((a.originalPrice - priceA) / a.originalPrice) * 100 : 0;
        const discountPctB = b.originalPrice > priceB ? ((b.originalPrice - priceB) / b.originalPrice) * 100 : 0;
        return discountPctB - discountPctA;
      }
      case 'highest_trust': {
        // Source-backed trust signal: Mall store + store rating + verified cross-platform offers.
        // thaiAuthenticityScore is not sourced from any feed, so it is not used here.
        const trustOf = (deal: ProductDeal) => {
          let t = deal.storeType === 'mall' ? 100 : deal.storeType === 'preferred' ? 60 : 30;
          t += deal.storeRating * 10;
          const verified = deal.priceComparisons ? deal.priceComparisons.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length : 0;
          t += verified * 8;
          return t;
        };
        return trustOf(b) - trustOf(a);
      }
      case 'popular':
      default: {
        // Smart popularity scoring: prioritizes real cross-platform comparisons and verified Mall brands
        const getScore = (deal: ProductDeal) => {
          const price = getEffectivePrice(deal);
          const priceFactor = price < 15 ? 0.05 : price < 29 ? 0.4 : 1.0;
          const verifiedCompsCount = deal.priceComparisons ? deal.priceComparisons.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length : 1;
          const multiBonus = verifiedCompsCount >= 3 ? 5.0 : verifiedCompsCount > 1 ? 2.5 : 1.0;
          const mallBonus = deal.storeType === 'mall' ? 2.5 : deal.storeType === 'preferred' ? 1.5 : 1.0;
          const savings = Math.max(0, deal.originalPrice - price);
          return (deal.soldCount * 1.0 + savings * 0.1) * priceFactor * multiBonus * mallBonus;
        };
        return getScore(b) - getScore(a);
      }
    }
  });

  // 9. Limit Ranking (Top 5, 10, 20, 30, All)
  const sliced = filtered.slice(0, filter.limit);

  return { deals: sliced, totalMatching };
}

/**
 * Clean up product titles: remove trailing dangling punctuation, open brackets,
 * unclosed parentheses, and truncated Thai syllables/words cut by hard limit.
 */
export function cleanProductTitle(title: string): string {
  if (!title) return '';
  let cleaned = title.trim();

  // 1. Remove dangling trailing open punctuation/separators
  cleaned = cleaned.replace(/[\s\(\[\{【（\-\|\/\&,:\u2010-\u2015]+$/, '');

  // 2. Unmatched open parenthesis near the end
  const openParen = (cleaned.match(/\(/g) || []).length;
  const closeParen = (cleaned.match(/\)/g) || []).length;
  if (openParen > closeParen) {
    const lastOpen = cleaned.lastIndexOf('(');
    if (lastOpen !== -1 && !cleaned.slice(lastOpen).includes(')')) {
      cleaned = cleaned.slice(0, lastOpen).trim();
    }
  }

  // 3. Unmatched open brackets '[' or '【'
  const openBracket = (cleaned.match(/[\[【]/g) || []).length;
  const closeBracket = (cleaned.match(/[\]】]/g) || []).length;
  if (openBracket > closeBracket) {
    const lastOpen = Math.max(cleaned.lastIndexOf('['), cleaned.lastIndexOf('【'));
    if (lastOpen !== -1 && !cleaned.slice(lastOpen).match(/[\]】]/)) {
      cleaned = cleaned.slice(0, lastOpen).trim();
    }
  }

  // 4. Truncated Thai words cut by hard character limits
  cleaned = cleaned.replace(/\s[ก-ฮ]$/, '');
  cleaned = cleaned.replace(/(เหมาะสำ|ทนต่อการสึกห|มีคุณภา|ไม่ต้อ|สกัดก|Skin Fa|Digital Di)$/, '');
  cleaned = cleaned.replace(/\s(จา|สำ|ที|ส|พ)$/, '');

  // 5. Remove any trailing dangling punctuation again after word removal
  cleaned = cleaned.replace(/[\s\(\[\{【（\-\|\/\&,:\u2010-\u2015]+$/, '').trim();

  return cleaned || title;
}

/**
 * Detects and filters out scam anchor prices (e.g. Mascara ฿9,999 down to ฿379).
 * Returns null if the original price is missing, <= current price, artificially inflated (> 3.5x),
 * or claims an abnormal fake discount (> 85%).
 */
export function getSanitizedOriginalPrice(currentPrice: number, originalPrice: number): number | null {
  if (!originalPrice || !currentPrice || !Number.isFinite(originalPrice) || !Number.isFinite(currentPrice)) {
    return null;
  }
  if (originalPrice <= currentPrice) {
    return null;
  }
  // If original price is more than 3.5x current price, it is an inflated anchor price
  if (originalPrice > currentPrice * 3.5) {
    return null;
  }
  // If discount percentage exceeds 85%, it's almost always a seller anchor price trick
  const discountPct = (originalPrice - currentPrice) / originalPrice;
  if (discountPct > 0.85) {
    return null;
  }
  return originalPrice;
}
