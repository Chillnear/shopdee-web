export type Platform = 'shopee' | 'lazada' | 'tiktok';

export type StoreType = 'mall' | 'preferred' | 'verified' | 'regular';

export interface Voucher {
  id: string;
  code: string;
  discountText: string;
  minSpend: number;
  discountAmount: number;
  isVipOnly?: boolean;
  tag: 'แพลตฟอร์ม' | 'ร้านค้า' | 'ส่งฟรี' | 'VIP';
}

export interface ReviewSnippet {
  id: string;
  author: string;
  comment: string;
  isAuthenticThai: boolean;
  authenticityNote: string;
  rating: number;
  date: string;
}

export interface PlatformPriceComparison {
  platform: Platform;
  price: number;
  estimatedAfterVoucher: number;
  storeName: string;
  storeType: StoreType;
  url: string;
  inStock: boolean;
}

export interface StoreOffer {
  id: string;
  platform: Platform;
  storeName: string;
  storeType: StoreType;
  price: number;
  estimatedAfterVoucher: number;
  voucherNote?: string;
  freeShipping: boolean;
  storeRating: number;
  soldCount: number;
  isLowestOverall?: boolean;
  isBestStore?: boolean;
  badgeNote?: string;
  url: string;
}

export type PriceAdviceType = 'buy_now' | 'wait_for_sale' | 'fair_price';

export interface PricePoint {
  date: string;
  price: number;
}

export interface ReviewHighlight {
  tag: string;
  type: 'pro' | 'con';
  percentage: number;
}

export interface VoucherStackFormula {
  basePrice: number;
  platformDiscount: number;
  storeDiscount: number;
  shippingDiscount: number;
  finalPrice: number;
}

export interface ProductDeal {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  tags: string[];
  platform: Platform;
  storeName: string;
  storeType: StoreType;
  storeRating: number;
  soldCount: number;
  
  // Pricing
  basePrice: number;            // ราคาจริงของตัวสินค้าหลัก (ตัดตัวเลือกหลอกแล้ว)
  originalPrice: number;        // ราคาป้ายก่อนลด
  marketAvgPrice: number;       // ราคากลางเปรียบเทียบในตลาด
  estimatedFinalPrice: number;  // ราคาคาดการณ์หลังหักโค้ดลดทั่วไป
  vipFinalPrice: number;        // ราคาสำหรับคนมีสิทธิ์ VIP / Payday
  
  // Option Bait Warning
  hasOptionBait: boolean;
  baitWarningNote?: string;
  
  // Trust Metrics
  thaiAuthenticityScore: number; // 0 - 100%
  authenticitySummary: string;
  reviews: ReviewSnippet[];
  
  // Delivery & Vouchers
  freeShipping: boolean;
  availableVouchers: Voucher[];
  
  // Platform & Multi-Store Comparison
  isAbsoluteCheapest: boolean;
  priceComparisons: PlatformPriceComparison[];
  stores: StoreOffer[];         // เปรียบเทียบทุกร้านค้า ทั้งในแอปเดียวกันและข้ามแอป เรียงจากถูกไปแพง

  // Trip.com Intelligence Features
  priceHistory?: PricePoint[];
  priceAdvice?: PriceAdviceType;
  priceAdviceNote?: string;
  reviewHighlights?: ReviewHighlight[];
  activeViewersCount?: number;
  voucherStackFormula?: VoucherStackFormula;
  
  // Affiliate Redirect
  affiliateUrl: string;
}

export interface FilterState {
  selectedPlatforms: Platform[]; // 'shopee', 'lazada', 'tiktok'
  onlyMall: boolean;
  onlyFreeShipping: boolean;
  minAuthenticity: number;       // e.g. 80%
  hasVoucherOnly: boolean;
  maxPrice: number | null;
  sortBy: 'popular' | 'best_discount' | 'cheapest' | 'expensive' | 'highest_trust';
  limit: number;                 // items to show (e.g. 16, 32, 999)
  selectedCategory?: string;     // e.g. 'เครื่องใช้ไฟฟ้า', 'ไอที & แกดเจ็ต'
}
