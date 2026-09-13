'use client';

import React from 'react';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  AlertTriangle, 
  Copy, 
  Check, 
  Tag, 
  MessageSquare, 
  TrendingDown, 
  ChevronRight,
  Star,
  Award,
  Bell,
  Share2
} from 'lucide-react';
import { ProductDeal, Platform } from '@/lib/types';
import { 
  formatTHB, 
  formatSoldCount, 
  getPlatformMeta, 
  getSmartAffiliateUrl,
  cleanProductTitle,
  getSanitizedOriginalPrice
} from '@/lib/engine';
import { StoreComparisonTable } from '@/components/StoreComparisonTable';

interface ProductCardProps {
  deal: ProductDeal;
  rank: number;
  onOpenPriceAlert?: (deal: ProductDeal) => void;
  onOpenShare?: (deal: ProductDeal) => void;
  selectedPlatform?: Platform | 'all';
}

export function ProductCard({
  deal,
  rank,
  onOpenPriceAlert,
  onOpenShare,
  selectedPlatform = 'all',
}: ProductCardProps) {
  const platformMeta = getPlatformMeta(deal.platform);
  const cleanedTitle = cleanProductTitle(deal.title);

  const sanitizedOriginalPrice = getSanitizedOriginalPrice(deal.estimatedFinalPrice, deal.originalPrice);
  const hasValidDiscount = sanitizedOriginalPrice !== null && sanitizedOriginalPrice > deal.estimatedFinalPrice;
  const savePct = hasValidDiscount
    ? Math.round(((sanitizedOriginalPrice - deal.estimatedFinalPrice) / sanitizedOriginalPrice) * 100)
    : 0;

  const verifiedPlatforms = (deal.priceComparisons || []).filter(
    pc => pc.hasDirectProduct !== false && pc.price > 0
  );
  const isMultiPlatform = verifiedPlatforms.length >= 3;

  // Rank Styling
  const getRankBadge = (r: number) => {
    if (deal.id.startsWith('ingested-')) {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md shadow-orange-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ดึงจากลิงก์สด ⚡</span>
        </span>
      );
    }
    if (r === 1) {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
          <Award className="w-3.5 h-3.5" />
          <span>อันดับ #1</span>
        </span>
      );
    }
    if (r === 2) {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-slate-400 to-slate-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
          <span>อันดับ #2</span>
        </span>
      );
    }
    if (r === 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-700 to-amber-800 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
          <span>อันดับ #3</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center bg-neutral-100 text-neutral-600 border border-neutral-200 text-xs font-black px-2.5 py-1 rounded-full">
        #{r}
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-card hover:shadow-xl hover:-translate-y-0.5 ${
      rank === 1 ? 'border-amber-400/80 ring-2 ring-amber-400/20' : 'border-neutral-200/80'
    }`}>
      
      {/* Absolute Cheapest Banner (แสดงเฉพาะเมื่อเทียบครบ 3 แพลตฟอร์มจริง) */}
      {isMultiPlatform && deal.isAbsoluteCheapest ? (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin-slow" />
            <span>ราคาต่ำสุดใน direct offers ที่พบ: {platformMeta.name}</span>
          </div>
          <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {(() => {
              const other = deal.priceComparisons?.find(pc => pc.platform !== deal.platform && pc.hasDirectProduct !== false && pc.price > deal.basePrice);
              return other ? `ต่างจากข้อเสนออื่น ฿${other.price - deal.basePrice}` : 'ราคาอ้างอิงจาก source';
            })()}
          </span>
        </div>
      ) : !isMultiPlatform ? (
        <div className="bg-neutral-50 text-neutral-700 px-4 py-1.5 flex items-center justify-between text-xs font-medium border-b border-neutral-200/80">
          <div className="flex items-center gap-1.5">
            <span>📍 พบลิงก์ตรงจาก {platformMeta.name} เท่านั้น • ยังไม่มีข้อเสนอจากแอปอื่น</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-semibold">
            {deal.storeType === 'mall' ? 'ประเภท Mall จาก source' : 'มีลิงก์ตรง 1 ร้าน'}
          </span>
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
          
          {/* Image & Badges Column */}
          <div className="relative w-full md:w-52 h-48 md:h-52 shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-150">
            <img
              src={deal.imageUrl}
              alt={cleanedTitle}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            
            {/* Rank badge on image */}
            <div className="absolute top-2.5 left-2.5 z-10">
              {getRankBadge(rank)}
            </div>

            {/* Free Shipping Tag */}
            {deal.freeShipping && (
              <div className="absolute bottom-2.5 left-2.5 z-10 bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                <span>🚚 ส่งฟรี</span>
              </div>
            )}
          </div>

          {/* Details & Comparisons Column */}
          <div className="flex-1 flex flex-col justify-between">
            
            <div>
              {/* Row: Store & Platform Tags */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                
                {/* Platform Pill */}
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${platformMeta.badgeColor}`}>
                  <span>{platformMeta.name}</span>
                </span>

                {/* Store Type Badge */}
                {deal.storeType === 'mall' && (
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3 h-3 text-red-600" />
                    <span>Mall จาก source</span>
                  </span>
                )}
                {deal.storeType === 'preferred' && (
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                    <Award className="w-3 h-3 text-orange-600" />
                    <span>preferred จาก source</span>
                  </span>
                )}

                {/* Source metrics, shown only when supplied by the source. */}
                {deal.storeRating > 0 && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium ml-auto">
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{deal.storeRating}</span>
                    </span>
                  </div>
                )}

              </div>

              {/* Social Proof & Quick Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 p-2 rounded-xl bg-neutral-50/80 border border-neutral-200/70">
                <div className="flex items-center gap-2 text-xs">
                  {deal.soldCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600 font-medium bg-white border border-neutral-200/80 px-2 py-0.5 rounded-lg whitespace-nowrap">
                      <span>ขายแล้ว</span>
                      <strong className="text-neutral-900 font-bold">{formatSoldCount(deal.soldCount)}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenPriceAlert && (
                    <button
                      type="button"
                      onClick={() => onOpenPriceAlert(deal)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-neutral-200 hover:border-emerald-300 px-2.5 py-1 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                      title="บันทึกติดตามราคาลด"
                    >
                      <Bell className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span>ตั้งเตือนราคา</span>
                    </button>
                  )}

                  {onOpenShare && (
                    <button
                      type="button"
                      onClick={() => onOpenShare(deal)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 hover:text-orange-700 bg-white hover:bg-orange-50 border border-neutral-200 hover:border-orange-300 px-2.5 py-1 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                      title="แชร์ดีลนี้"
                    >
                      <Share2 className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span>แชร์ดีล</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug line-clamp-2 hover:text-shopee transition-colors cursor-pointer mb-2">
                {cleanedTitle}
              </h2>

              {/* Option-Bait Warning Banner */}
              {deal.hasOptionBait && deal.baitWarningNote && (
                <div className="mb-3 bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">ดักจับราคาตัวเลือกหลอก (Option Bait):</span>
                    <span className="text-[11px] text-amber-800 leading-normal">{deal.baitWarningNote}</span>
                  </div>
                </div>
              )}

              {/* Intra-Platform & Cross-Platform Multi-Store Comparison */}
              {deal.stores && deal.stores.length > 0 ? (
                <div className="mb-3">
                  <StoreComparisonTable
                    stores={deal.stores}
                    dealTitle={deal.title}
                    defaultPlatform={selectedPlatform}
                  />
                </div>
              ) : (
                /* Fallback to 3-Platform strip if stores not provided */
                <div className="mb-3 bg-neutral-50 rounded-xl p-2.5 border border-neutral-200">
                  <div className="text-[11px] font-bold text-neutral-500 mb-1.5 flex items-center justify-between">
                    <span>เปรียบเทียบราคา 3 แพลตฟอร์ม:</span>
                    <span className="text-neutral-400">ราคาจาก source</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {(() => {
                      const directPrices = deal.priceComparisons
                        .filter(pc => pc.hasDirectProduct !== false && pc.price > 0)
                        .map(pc => pc.price);
                      const lowestPrice = directPrices.length > 0 ? Math.min(...directPrices) : null;
                      return deal.priceComparisons.map((pc) => {
                        const hasDirect = pc.hasDirectProduct !== false && pc.price > 0;
                        const isLowest = hasDirect && lowestPrice !== null && pc.price === lowestPrice;
                      const meta = getPlatformMeta(pc.platform);
                      return (
                        <div
                          key={pc.platform}
                          className={`p-1.5 rounded-lg border flex flex-col items-center text-center transition ${
                            isLowest
                              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/30 font-bold'
                              : 'bg-white border-neutral-200 text-neutral-600'
                          }`}
                        >
                          <span className="text-[10px] text-neutral-500 font-semibold">{meta.name}</span>
                          {hasDirect ? (
                            <>
                              <span className={`text-xs sm:text-sm font-extrabold ${isLowest ? 'text-emerald-700' : 'text-neutral-800'}`}>
                                {formatTHB(pc.price)}
                              </span>
                              {isLowest ? (
                                <span className="text-[9px] text-emerald-600 font-bold">ถูกสุด ✅</span>
                              ) : (
                                <span className="text-[9px] text-neutral-400">
                                  +{formatTHB(pc.price - deal.basePrice)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-neutral-400 mt-1">ยังไม่มีลิงก์ตรง</span>
                          )}
                        </div>
                      );
                      });
                    })()}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Row: Smart Price Tier & Action Buttons */}
            <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              
              {/* Price Tier Block */}
              <div>
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-neutral-500 font-medium">ราคาจาก source:</span>
                  <span className="text-2xl sm:text-3xl font-black text-shopee tracking-tight price-tag">
                    {formatTHB(deal.estimatedFinalPrice)}
                  </span>
                  {hasValidDiscount && sanitizedOriginalPrice && (
                    <span className="text-xs text-neutral-400 line-through font-normal">
                      {formatTHB(sanitizedOriginalPrice)}
                    </span>
                  )}
                  {hasValidDiscount && savePct >= 5 && (
                    <span className="bg-rose-100 text-rose-700 text-xs font-extrabold px-1.5 py-0.5 rounded-md">
                      ลด {savePct}%
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-neutral-500 font-medium">
                  ราคาสินค้าจาก source: <strong className="text-neutral-700">{formatTHB(deal.basePrice)}</strong>
                </div>
              </div>

              {/* Vouchers & Buy CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                
                {/* Primary Buy CTA Button (Affiliate Redirect) */}
                <a
                  href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-3 px-5 sm:px-6 rounded-xl font-extrabold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition active:scale-98 ${
                    deal.platform === 'shopee'
                      ? 'bg-shopee hover:bg-shopee-hover shadow-shopee/30'
                      : deal.platform === 'lazada'
                      ? 'bg-lazada hover:bg-lazada.accent shadow-lazada/30'
                      : 'bg-black hover:bg-neutral-800 shadow-neutral-900/30'
                  }`}
                >
                  <span>ซื้อที่ {platformMeta.name === 'TikTok Shop' ? 'TikTok' : platformMeta.name}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
