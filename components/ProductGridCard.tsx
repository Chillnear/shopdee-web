'use client';

import React from 'react';
import { 
  Sparkles, 
  ExternalLink, 
  Bell, 
  Share2,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { ProductDeal } from '@/lib/types';
import { 
  formatTHB, 
  getPlatformMeta, 
  getSmartAffiliateUrl, 
  cleanProductTitle, 
  getSanitizedOriginalPrice 
} from '@/lib/engine';

interface ProductGridCardProps {
  deal: ProductDeal;
  rank: number;
  onOpenDetail: (deal: ProductDeal) => void;
  onOpenPriceAlert?: (deal: ProductDeal) => void;
  onOpenShare?: (deal: ProductDeal) => void;
}

export function ProductGridCard({
  deal,
  rank,
  onOpenDetail,
  onOpenPriceAlert,
  onOpenShare,
}: ProductGridCardProps) {
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
  const verifiedStoresCount = (deal.stores || []).filter(s => s.isDirectProduct !== false).length;

  // Summarize only verified direct offers and source-backed fields.
  const getDataHeadline = () => {
    if (deal.hasOptionBait) {
      return '⚠️ ตรวจสอบตัวเลือกก่อนสั่งซื้อ';
    }
    if (isMultiPlatform && deal.isAbsoluteCheapest) {
      return `✓ ราคาถูกจริง • เทียบ ${verifiedStoresCount || deal.stores?.length || 0} ร้าน`;
    }
    // หากมีแค่แอปเดียว ไม่หลอกผู้ใช้ แสดงสถานะตรงไปตรงมา
    if (deal.storeType === 'mall') {
      return `✓ ร้านค้าทางการ (Mall) • สินค้าแท้ ${platformMeta.name}`;
    }
    if (deal.storeType === 'preferred') {
      return `✓ ร้านค้าแนะนำ • น่าเชื่อถือ ${platformMeta.name}`;
    }
    if (verifiedStoresCount > 1) {
      return `✓ พบราคาถูกจริง ${verifiedStoresCount} ร้าน • เทียบแล้ว`;
    }
    if (hasValidDiscount && savePct >= 15) {
      return `✓ ประหยัด ${savePct}% • พบใน ${platformMeta.name} เท่านั้น`;
    }
    return `📍 พบลิงก์ตรงจาก ${platformMeta.name} เท่านั้น • ยังไม่มีข้อเสนอจากแอปอื่น`;
  };

  return (
    <article 
      onClick={() => onOpenDetail(deal)}
      className="group relative bg-white rounded-2xl border border-neutral-200/80 hover:border-brand-500 card-hover overflow-hidden cursor-pointer flex flex-col justify-between"
    >
      
      {/* 1. Image Container */}
      <div className="relative w-full aspect-square bg-neutral-50 overflow-hidden">
        <img
          src={deal.imageUrl}
          alt={cleanedTitle}
          className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        {/* Single Primary Badge (จุดสีเดียวบนภาพ สบายตา ไม่หลอกตา) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          {deal.id.startsWith('ingested-') ? (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-fade-in">
              <Sparkles className="w-2.5 h-2.5" />
              <span>ดึงจากลิงก์สด ⚡</span>
            </span>
          ) : (deal.isAbsoluteCheapest && isMultiPlatform) ? (
            <span className="inline-flex items-center bg-shopee text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              <span>พบ direct URL 3 แอป</span>
            </span>
          ) : !isMultiPlatform ? (
            <span className="inline-flex items-center bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <span>พบใน {platformMeta.name} เท่านั้น</span>
            </span>
          ) : (hasValidDiscount && savePct >= 15) ? (
            <span className="inline-flex items-center bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{savePct}%
            </span>
          ) : null}
        </div>

        {/* Top-Right Quick Actions: Watchlist & Share (White circle background: rgba(255,255,255,0.85)) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {onOpenPriceAlert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPriceAlert(deal);
              }}
              className="w-7 h-7 rounded-full bg-white/85 backdrop-blur-xs text-neutral-800 hover:text-orange-600 flex items-center justify-center shadow-md border border-neutral-200/90 transition hover:scale-110 active:scale-95 cursor-pointer"
              title="ติดตามราคาลด"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenShare(deal);
              }}
              className="w-7 h-7 rounded-full bg-white/85 backdrop-blur-xs text-neutral-800 hover:text-orange-600 flex items-center justify-center shadow-md border border-neutral-200/90 transition hover:scale-110 active:scale-95 cursor-pointer"
              title="แชร์ดีล"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform & Store Type Indicator (Bottom Left) */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded backdrop-blur-xs ${platformMeta.badgeColor}`}>
            {platformMeta.name}
          </span>
          {deal.storeType === 'mall' && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#D0011B] text-white shadow-xs">
              {platformMeta.name} Mall จาก source
            </span>
          )}
          {deal.storeType === 'preferred' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-xs">
              preferred จาก source
            </span>
          )}
        </div>
      </div>

      {/* 2. Content Body (Clean Typography, Lots of Whitespace) */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        
        <div>
          {/* Title (2 lines clamp with break-words for clean Thai alignment) */}
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-800 leading-snug line-clamp-2 break-words group-hover:text-shopee transition-colors mb-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
            {cleanedTitle}
          </h3>

          {/* AI 1-line Insight (Clean & Subtle) */}
          <p className="text-[11px] text-neutral-500 font-medium mb-3 truncate flex items-center gap-1">
            <span>{getDataHeadline()}</span>
          </p>
        </div>

        {/* 3. Pricing & Actions */}
        <div className="pt-2 border-t border-neutral-100/90">
          
          <div className="flex items-baseline justify-between gap-1 mb-2.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-shopee text-lg sm:text-xl font-black tracking-tight price-tag">
                {formatTHB(deal.estimatedFinalPrice)}
              </span>
              {hasValidDiscount && sanitizedOriginalPrice && (
                <span className="text-xs text-neutral-400 line-through font-normal">
                  {formatTHB(sanitizedOriginalPrice)}
                </span>
              )}
            </div>

            <span className="text-[10px] text-neutral-400 font-medium whitespace-nowrap">
              ราคาล่าสุดวันนี้
            </span>
          </div>

          {/* Action Row: Clear Distinct Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenDetail(deal)}
              className="flex-1 py-2 px-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-bold transition flex items-center justify-center gap-0.5 cursor-pointer"
            >
              <span>{isMultiPlatform ? 'ตารางเทียบ 3 แอป' : 'ตารางเทียบราคา'}</span>
              <ChevronRight className="w-3 h-3 text-neutral-400" />
            </button>

            <a
              href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`py-2 px-2.5 rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 shrink-0 cursor-pointer ${
                deal.platform === 'shopee'
                  ? 'bg-shopee hover:bg-shopee-hover'
                  : deal.platform === 'lazada'
                  ? 'bg-lazada hover:bg-lazada-accent'
                  : 'bg-neutral-900 hover:bg-neutral-800'
              }`}
              title={`ไปซื้อที่ ${platformMeta.name}`}
            >
              <span>ซื้อที่ {platformMeta.name === 'TikTok Shop' ? 'TikTok' : platformMeta.name}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

        </div>

      </div>

    </article>
  );
}
