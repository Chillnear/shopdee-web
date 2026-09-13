import { FilterState, Platform, ProductDeal } from './types';

export const DEFAULT_FILTER_STATE: FilterState = {
  selectedPlatforms: ['shopee', 'lazada', 'tiktok'],
  onlyMall: false,
  onlyFreeShipping: false,
  minAuthenticity: 0,
  hasVoucherOnly: false,
  maxPrice: null,
  sortBy: 'popular',
  limit: 999,
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
      const text = `${deal.category} ${deal.tags.join(' ')} ${deal.title}`.toLowerCase();

      if (cat === 'พัดลม & เครื่องใช้ไฟฟ้า') {
        return text.includes('พัดลม') || text.includes('หม้อทอด') || text.includes('ดูดฝุ่น') ||
          text.includes('ฟอกอากาศ') || text.includes('เครื่องใช้ไฟฟ้า') || text.includes('home appliances') ||
          text.includes('appliances') || text.includes('kitchenware');
      }
      if (cat === 'ไอที & แกดเจ็ต') {
        return text.includes('หูฟัง') || text.includes('พาวเวอร์แบงค์') || text.includes('กล้อง') ||
          text.includes('ไอที') || text.includes('gadget') || text.includes('บลูทูธ') ||
          text.includes('mobile') || text.includes('computer') || text.includes('ipad') ||
          text.includes('สายชาร์จ') || text.includes('คีย์บอร์ด') || text.includes('ฟิล์ม');
      }
      if (cat === 'ของใช้ในบ้าน') {
        return text.includes('ซักผ้า') || text.includes('ของใช้ในบ้าน') || text.includes('ทำความสะอาด') ||
          text.includes('home & living') || text.includes('ทิชชู่') || text.includes('แผ่นกันลื่น') ||
          text.includes('ผ้าเช็ด') || text.includes('kitchen');
      }
      if (cat === 'สัตว์เลี้ยง') {
        return text.includes('อาหารแมว') || text.includes('สัตว์เลี้ยง') || text.includes('แมว') ||
          text.includes('ทรายแมว') || text.includes('pet');
      }
      if (cat === 'แม่และเด็ก') {
        return text.includes('นมผง') || text.includes('เด็ก') || text.includes('แม่และเด็ก') ||
          text.includes('ผ้าอ้อม') || text.includes('baby') || text.includes('mom');
      }
      if (cat === 'สกินแคร์ & บิวตี้') {
        return text.includes('ครีมกันแดด') || text.includes('ความงาม') || text.includes('สกินแคร์') ||
          text.includes('เซรั่ม') || text.includes('beauty') || text.includes('skincare') ||
          text.includes('ลิป') || text.includes('มาสคาร่า') || text.includes('แป้งพัฟ') ||
          text.includes('คลีนเซอร์') || text.includes('คอนทัวร์');
      }
      return text.includes(cat.toLowerCase());
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
        const trustA = a.thaiAuthenticityScore * (a.storeType === 'mall' ? 1.3 : 1.0);
        const trustB = b.thaiAuthenticityScore * (b.storeType === 'mall' ? 1.3 : 1.0);
        return trustB - trustA;
      }
      case 'popular':
      default: {
        // Smart popularity scoring: balances sold count, verified discount, and filters out 1-baht knick-knacks from dominating
        const getScore = (deal: ProductDeal) => {
          const price = getEffectivePrice(deal);
          const priceFactor = price < 15 ? 0.05 : price < 29 ? 0.4 : 1.0;
          const multiBonus = deal.priceComparisons && deal.priceComparisons.length > 1 ? 2.5 : 1.0;
          const mallBonus = deal.storeType === 'mall' ? 1.3 : 1.0;
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
