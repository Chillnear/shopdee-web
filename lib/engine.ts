import { MOCK_DEALS } from './mock-data';
import { FilterState, Platform, ProductDeal } from './types';

export const DEFAULT_FILTER_STATE: FilterState = {
  selectedPlatforms: ['shopee', 'lazada', 'tiktok'],
  onlyMall: false,
  onlyFreeShipping: false,
  minAuthenticity: 0,
  hasVoucherOnly: false,
  maxPrice: null,
  sortBy: 'cheapest',
  limit: 10,
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
  if (!url) return '#';
  return `/api/redirect?url=${encodeURIComponent(url)}&platform=${platform}&dealId=${dealId || 'deal'}`;
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

  // 1.5 Category Filter
  if (filter.selectedCategory && filter.selectedCategory !== 'ทั้งหมด') {
    const cat = filter.selectedCategory;
    filtered = filtered.filter(deal => {
      if (cat === 'พัดลม & เครื่องใช้ไฟฟ้า') {
        return deal.category.includes('พัดลม') || deal.category.includes('หม้อทอด') || deal.category.includes('ดูดฝุ่น') || deal.tags.some(t => t.includes('พัดลม') || t.includes('เครื่องใช้ไฟฟ้า'));
      }
      if (cat === 'ไอที & แกดเจ็ต') {
        return deal.category.includes('หูฟัง') || deal.category.includes('พาวเวอร์แบงค์') || deal.category.includes('กล้อง') || deal.tags.some(t => t.includes('ไอที') || t.includes('gadget') || t.includes('บลูทูธ'));
      }
      if (cat === 'ของใช้ในบ้าน') {
        return deal.category.includes('ซักผ้า') || deal.tags.some(t => t.includes('ของใช้ในบ้าน') || t.includes('ทำความสะอาด'));
      }
      if (cat === 'สัตว์เลี้ยง') {
        return deal.category.includes('อาหารแมว') || deal.tags.some(t => t.includes('สัตว์เลี้ยง') || t.includes('แมว'));
      }
      if (cat === 'แม่และเด็ก') {
        return deal.category.includes('นมผง') || deal.tags.some(t => t.includes('เด็ก') || t.includes('แม่และเด็ก'));
      }
      if (cat === 'สกินแคร์ & บิวตี้') {
        return deal.category.includes('ครีมกันแดด') || deal.tags.some(t => t.includes('ความงาม') || t.includes('สกินแคร์'));
      }
      return deal.category.toLowerCase().includes(cat.toLowerCase()) || deal.tags.some(t => t.toLowerCase().includes(cat.toLowerCase()));
    });
  }

  // 2. Platform Filter
  if (filter.selectedPlatforms.length > 0 && filter.selectedPlatforms.length < 3) {
    filtered = filtered.filter(deal => {
      const matchesMain = filter.selectedPlatforms.includes(deal.platform);
      const matchesComparisons = deal.priceComparisons.some(pc =>
        filter.selectedPlatforms.includes(pc.platform)
      );
      const matchesStores = deal.stores?.some(s => 
        filter.selectedPlatforms.includes(s.platform)
      );
      return matchesMain || matchesComparisons || matchesStores;
    });
  }

  // Helper for platform-effective price
  const getEffectivePrice = (deal: ProductDeal) => {
    if (filter.selectedPlatforms.length === 3 || filter.selectedPlatforms.length === 0) {
      return deal.estimatedFinalPrice;
    }
    const matchingStores = deal.stores?.filter(s => filter.selectedPlatforms.includes(s.platform));
    if (matchingStores && matchingStores.length > 0) {
      return Math.min(...matchingStores.map(s => s.estimatedAfterVoucher));
    }
    const matchingComps = deal.priceComparisons?.filter(pc => filter.selectedPlatforms.includes(pc.platform) && pc.inStock);
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

  // 5. Thai Authenticity Threshold
  if (filter.minAuthenticity > 0) {
    filtered = filtered.filter(deal => deal.thaiAuthenticityScore >= filter.minAuthenticity);
  }

  // 6. Has Voucher Only
  if (filter.hasVoucherOnly) {
    filtered = filtered.filter(deal => deal.availableVouchers.length > 0);
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
      case 'best_discount': {
        const priceA = getEffectivePrice(a);
        const priceB = getEffectivePrice(b);
        const discountPctA = ((a.marketAvgPrice - priceA) / a.marketAvgPrice) * 100;
        const discountPctB = ((b.marketAvgPrice - priceB) / b.marketAvgPrice) * 100;
        return discountPctB - discountPctA;
      }
      case 'highest_trust': {
        const trustA = a.thaiAuthenticityScore * (a.storeType === 'mall' ? 1.2 : 1.0);
        const trustB = b.thaiAuthenticityScore * (b.storeType === 'mall' ? 1.2 : 1.0);
        return trustB - trustA;
      }
      case 'popular':
      default:
        return b.soldCount - a.soldCount;
    }
  });

  // 9. Limit Ranking (Top 5, 10, 20, 30, All)
  const sliced = filtered.slice(0, filter.limit);

  return { deals: sliced, totalMatching };
}
