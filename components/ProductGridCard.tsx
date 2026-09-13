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
import { formatTHB, getPlatformMeta, getSmartAffiliateUrl } from '@/lib/engine';

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
  const savePct = Math.round(((deal.marketAvgPrice - deal.estimatedFinalPrice) / deal.marketAvgPrice) * 100);

  // สรุป 1 บรรทัดจาก AI Insight ที่เข้าใจง่ายและสบายตา
  const getAIInsightHeadline = () => {
    if (deal.hasOptionBait) {
      return '⚠️ ตรวจสอบตัวเลือกก่อนสั่งซื้อ';
    }
    if (savePct >= 15) {
      return `✓ ถูกกว่าค่าเฉลี่ย ${savePct}% • ประกันแท้`;
    }
    if (deal.storeType === 'mall') {
      return '✓ ร้าน Mall ทางการ • ของแท้ 100%';
    }
    if (deal.freeShipping) {
      return '✓ ส่งฟรี • ร้านค้าได้รับความนิยม';
    }
    return `✓ เทียบแล้ว ${deal.stores?.length || 3} ร้าน`;
  };

  return (
    <article 
      onClick={() => onOpenDetail(deal)}
      className="group relative bg-white rounded-2xl border border-neutral-200/80 hover:border-neutral-300 hover:shadow-card-hover transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
    >
      
      {/* 1. Image Container */}
      <div className="relative w-full aspect-square bg-neutral-50 overflow-hidden">
        <img
          src={deal.imageUrl}
          alt={deal.title}
          className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        {/* Single Primary Badge (จุดสีเดียวบนภาพ สบายตา ไม่แย่งซีน) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          {rank === 1 ? (
            <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
              <span>คุ้มสุด #1</span>
            </span>
          ) : deal.isAbsoluteCheapest ? (
            <span className="inline-flex items-center bg-shopee text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              <span>ถูกสุด 3 แอป</span>
            </span>
          ) : savePct >= 15 ? (
            <span className="inline-flex items-center bg-neutral-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{savePct}%
            </span>
          ) : null}
        </div>

        {/* Top-Right Quick Actions: Watchlist & Share */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
          {onOpenPriceAlert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPriceAlert(deal);
              }}
              className="w-6 h-6 rounded-full bg-white/95 text-neutral-600 hover:text-emerald-700 flex items-center justify-center shadow-xs transition hover:scale-110 active:scale-95 cursor-pointer"
              title="ติดตามราคาลด"
            >
              <Bell className="w-3 h-3" />
            </button>
          )}

          {onOpenShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenShare(deal);
              }}
              className="w-6 h-6 rounded-full bg-white/95 text-neutral-600 hover:text-orange-700 flex items-center justify-center shadow-xs transition hover:scale-110 active:scale-95 cursor-pointer"
              title="แชร์ดีล"
            >
              <Share2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Platform Indicator (Subtle Bottom Left) */}
        <div className="absolute bottom-2 left-2 z-10">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs ${platformMeta.badgeColor}`}>
            {platformMeta.name}
          </span>
        </div>
      </div>

      {/* 2. Content Body (Clean Typography, Lots of Whitespace) */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        
        <div>
          {/* Title (2 lines clamp) */}
          <h3 className="text-xs sm:text-sm font-semibold text-neutral-800 leading-snug line-clamp-2 group-hover:text-shopee transition-colors mb-2">
            {deal.title}
          </h3>

          {/* AI 1-line Insight (Clean & Subtle) */}
          <p className="text-[11px] text-neutral-500 font-medium mb-3 truncate flex items-center gap-1">
            <span>{getAIInsightHeadline()}</span>
          </p>
        </div>

        {/* 3. Pricing & Actions */}
        <div className="pt-2 border-t border-neutral-100/90">
          
          <div className="flex items-baseline justify-between gap-1 mb-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                {formatTHB(deal.estimatedFinalPrice)}
              </span>
              {deal.originalPrice > deal.estimatedFinalPrice && (
                <span className="text-[11px] text-neutral-400 line-through">
                  {formatTHB(deal.originalPrice)}
                </span>
              )}
            </div>

            <span className="text-[10px] text-neutral-400 font-medium">
              ราคาสุทธิ
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenDetail(deal)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-100/90 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold transition flex items-center justify-center gap-0.5"
            >
              <span>เทียบ 3 แอป</span>
              <ChevronRight className="w-3 h-3 text-neutral-400" />
            </button>

            <a
              href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`py-1.5 px-2.5 rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 shrink-0 ${
                deal.platform === 'shopee'
                  ? 'bg-shopee hover:bg-shopee-hover'
                  : deal.platform === 'lazada'
                  ? 'bg-lazada hover:bg-lazada-accent'
                  : 'bg-neutral-900 hover:bg-neutral-800'
              }`}
              title={`ไปซื้อที่ ${platformMeta.name}`}
            >
              <span>ซื้อ</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

        </div>

      </div>

    </article>
  );
}
