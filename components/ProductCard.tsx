'use client';

import React, { useState } from 'react';
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
  Flame,
  Award,
  Bell,
  Eye,
  Share2
} from 'lucide-react';
import { ProductDeal, Platform } from '@/lib/types';
import { formatTHB, formatSoldCount, getPlatformMeta, getSmartAffiliateUrl } from '@/lib/engine';
import { StoreComparisonTable } from '@/components/StoreComparisonTable';
import { PriceTrendGraph } from '@/components/PriceTrendGraph';
import { ReviewSentimentTags } from '@/components/ReviewSentimentTags';
import { VoucherStackFormula } from '@/components/VoucherStackFormula';
import { useDealViewers } from '@/lib/view-tracker';

interface ProductCardProps {
  deal: ProductDeal;
  rank: number;
  onOpenReviews: (deal: ProductDeal) => void;
  onOpenVouchers: (deal: ProductDeal) => void;
  onOpenPriceAlert?: (deal: ProductDeal) => void;
  onOpenShare?: (deal: ProductDeal) => void;
  selectedPlatform?: Platform | 'all';
}

export function ProductCard({
  deal,
  rank,
  onOpenReviews,
  onOpenVouchers,
  onOpenPriceAlert,
  onOpenShare,
  selectedPlatform = 'all',
}: ProductCardProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const viewersCount = useDealViewers(deal.id, deal.soldCount, false);

  const platformMeta = getPlatformMeta(deal.platform);

  // Discount percentage against market average
  const savePct = Math.round(((deal.marketAvgPrice - deal.estimatedFinalPrice) / deal.marketAvgPrice) * 100);

  const handleCopy = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md shadow-amber-500/30">
          <Award className="w-3.5 h-3.5" />
          <span>#1 ดีลคุ้มสุดยอด</span>
        </span>
      );
    }
    if (r === 2) {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-slate-400 to-slate-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs">
          <span>#2 อันดับ 2</span>
        </span>
      );
    }
    if (r === 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-700 to-amber-800 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs">
          <span>#3 อันดับ 3</span>
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
      
      {/* Absolute Cheapest Banner */}
      {deal.isAbsoluteCheapest && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin-slow" />
            <span>ถูกสุดข้ามแพลตฟอร์ม: ซื้อบน {platformMeta.name} คุ้มที่สุด ณ เวลานี้</span>
          </div>
          <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
            ประหยัดกว่าเจ้าอื่น ~฿{deal.priceComparisons.length > 1 ? deal.priceComparisons[1].price - deal.basePrice : 100}
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
          
          {/* Image & Badges Column */}
          <div className="relative w-full md:w-52 h-48 md:h-52 shrink-0 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-150">
            <img
              src={deal.imageUrl}
              alt={deal.title}
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
                    <span>Mall ทางการแท้ 100%</span>
                  </span>
                )}
                {deal.storeType === 'preferred' && (
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                    <Award className="w-3 h-3 text-orange-600" />
                    <span>ร้านแนะนำ</span>
                  </span>
                )}

                {/* Rating & Sold count */}
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium ml-auto">
                  <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{deal.storeRating}</span>
                  </span>
                  <span>•</span>
                  <span>ขายแล้ว {formatSoldCount(deal.soldCount)}</span>
                </div>

              </div>

              {/* Trip.com Social Proof & Price Alert Trigger */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                  <span className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full font-bold">
                    <Flame className="w-3 h-3 text-rose-500" />
                    <span>{viewersCount} คนกำลังดูอยู่นี้</span>
                  </span>
                  <span className="hidden sm:inline text-neutral-300">•</span>
                  <span className="hidden sm:inline text-neutral-400">เช็คราคาสุดคุ้ม</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {onOpenPriceAlert && (
                    <button
                      onClick={() => onOpenPriceAlert(deal)}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs transition active:scale-95 cursor-pointer"
                      title="บันทึกติดตามราคาลด"
                    >
                      <Bell className="w-3 h-3 text-emerald-600" />
                      <span>ตั้งเตือนราคาลด</span>
                    </button>
                  )}

                  {onOpenShare && (
                    <button
                      onClick={() => onOpenShare(deal)}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-full shadow-2xs transition active:scale-95 cursor-pointer"
                      title="แชร์ดีลนี้ / บันทึกรูปการ์ดดีล"
                    >
                      <Share2 className="w-3 h-3 text-orange-600" />
                      <span>แชร์ดีล</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug line-clamp-2 hover:text-shopee transition-colors cursor-pointer mb-2">
                {deal.title}
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

              {/* AI Review Sentiment Tags (Trip.com Style) */}
              <div className="mb-3">
                <ReviewSentimentTags
                  highlights={deal.reviewHighlights}
                  thaiAuthenticityScore={deal.thaiAuthenticityScore}
                  onViewAllReviews={() => onOpenReviews(deal)}
                  reviewCount={deal.reviews.length}
                />
              </div>

              {/* Price Trend & Timing Advice (Trip.com Style) */}
              <div className="mb-3">
                <PriceTrendGraph
                  history={deal.priceHistory}
                  currentPrice={deal.estimatedFinalPrice}
                  marketAvgPrice={deal.marketAvgPrice}
                  advice={deal.priceAdvice}
                  adviceNote={deal.priceAdviceNote}
                />
              </div>

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
                    <span className="text-neutral-400">อัปเดตล่าสุดวันนี้</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {deal.priceComparisons.map((pc) => {
                      const isLowest = pc.platform === deal.platform;
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Voucher Stacking Formula (Trip.com Style) */}
              <div className="mb-3">
                <VoucherStackFormula
                  formula={deal.voucherStackFormula}
                  basePrice={deal.basePrice}
                  finalPrice={deal.estimatedFinalPrice}
                />
              </div>

            </div>

            {/* Bottom Row: Smart Price Tier & Action Buttons */}
            <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              
              {/* Price Tier Block */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs text-neutral-500 font-medium">ราคาหลังโค้ด:</span>
                  <span className="text-2xl sm:text-3xl font-black text-shopee tracking-tight">
                    {formatTHB(deal.estimatedFinalPrice)}
                  </span>
                  {deal.originalPrice > deal.estimatedFinalPrice && (
                    <span className="text-xs text-neutral-400 line-through">
                      {formatTHB(deal.originalPrice)}
                    </span>
                  )}
                  <span className="bg-rose-100 text-rose-700 text-xs font-extrabold px-1.5 py-0.5 rounded-md">
                    ลด {savePct}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                  <span>ราคาหน้าร้าน: <strong className="text-neutral-700">{formatTHB(deal.basePrice)}</strong></span>
                  <span>•</span>
                  <span>สิทธิ์ VIP/Payday: <strong className="text-emerald-600">~{formatTHB(deal.vipFinalPrice)}</strong></span>
                </div>
              </div>

              {/* Vouchers & Buy CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                
                {/* 1-Tap Copy Voucher Pill */}
                {deal.availableVouchers.length > 0 && (
                  <button
                    onClick={(e) => handleCopy(deal.availableVouchers[0].code, e)}
                    className="px-3 py-2.5 rounded-xl border border-dashed border-shopee/60 bg-orange-50/70 hover:bg-orange-100/80 text-shopee font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                    title="กดเพื่อคัดลอกโค้ดลด"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{deal.availableVouchers[0].code}</span>
                    {copiedCode === deal.availableVouchers[0].code ? (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded font-bold">คัดลอกแล้ว!</span>
                    ) : (
                      <Copy className="w-3 h-3 text-shopee/70" />
                    )}
                  </button>
                )}

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
                  <span>ไปซื้อบน {platformMeta.name}</span>
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
