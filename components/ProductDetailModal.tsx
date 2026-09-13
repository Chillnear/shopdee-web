'use client';

import React from 'react';
import { 
  X, 
  ShieldCheck,
  ExternalLink, 
  Award,
  Bell,
  Share2
} from 'lucide-react';
import { ProductDeal, Platform } from '@/lib/types';
import { formatTHB, formatSoldCount, getPlatformMeta, getSmartAffiliateUrl, cleanProductTitle } from '@/lib/engine';
import { StoreComparisonTable } from '@/components/StoreComparisonTable';

interface ProductDetailModalProps {
  deal: ProductDeal | null;
  rank: number;
  onClose: () => void;
  onOpenPriceAlert?: (deal: ProductDeal) => void;
  onOpenShare?: (deal: ProductDeal) => void;
  selectedPlatform?: Platform | 'all';
}

export function ProductDetailModal({ 
  deal, 
  rank, 
  onClose, 
  onOpenPriceAlert,
  onOpenShare,
  selectedPlatform = 'all' 
}: ProductDetailModalProps) {
  if (!deal) return null;

  const platformMeta = getPlatformMeta(deal.platform);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-white font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Award className="w-3.5 h-3.5" />
              <span>อันดับ #{rank}</span>
            </span>
            <span className="text-xs font-bold text-neutral-600">รายละเอียดจาก source</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Main Product Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
              <img
                src={deal.imageUrl}
                alt={cleanProductTitle(deal.title)}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${platformMeta.badgeColor}`}>
                  {platformMeta.name}
                </span>
                {deal.storeType === 'mall' && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-red-600" />
                    <span>Mall จาก source</span>
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm sm:text-base text-neutral-900 leading-snug line-clamp-2 mb-1.5">
                {cleanProductTitle(deal.title)}
              </h3>

              <div className="text-xs text-neutral-500 font-medium">
                ร้าน: <strong className="text-neutral-700">{deal.storeName}</strong>
              </div>
            </div>
          </div>

          {/* Source-backed sales statistic and quick actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-neutral-50/90 border border-neutral-200/80">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {deal.soldCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-neutral-600 font-medium bg-white border border-neutral-200/80 px-2.5 py-1 rounded-xl shadow-2xs whitespace-nowrap">
                  <span>ขายแล้ว</span>
                  <strong className="text-neutral-900 font-bold">{formatSoldCount(deal.soldCount)}</strong>
                </span>
              ) : (
                <span className="text-xs text-neutral-500">ยังไม่มีข้อมูลยอดขายจาก source</span>
              )}
            </div>

            {/* Right: Quick Action Buttons (ปุ่มตั้งเตือนและแชร์ สไตล์มินิมอล ไม่ตีกัน) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenPriceAlert && (
                <button
                  type="button"
                  onClick={() => onOpenPriceAlert(deal)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-neutral-200 hover:border-emerald-300 px-2.5 py-1.5 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  title="ตั้งเตือนเมื่อราคาลดลง"
                >
                  <Bell className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>ตั้งเตือนราคา</span>
                </button>
              )}

              {onOpenShare && (
                <button
                  type="button"
                  onClick={() => onOpenShare(deal)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-orange-700 bg-white hover:bg-orange-50 border border-neutral-200 hover:border-orange-300 px-2.5 py-1.5 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  title="แชร์ดีลนี้"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>แชร์ดีล</span>
                </button>
              )}
            </div>
          </div>

          {/* Intra-Platform & Cross-Platform Multi-Store Comparison Table (แสดงร้านค้าและราคาเปรียบเทียบเป็นอันดับแรก) */}
          {deal.stores && deal.stores.length > 0 ? (
            <StoreComparisonTable
              stores={deal.stores}
              dealTitle={deal.title}
              defaultPlatform={selectedPlatform}
              initiallyExpanded={true}
            />
          ) : (
            <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-600">
                <span>
                  {(deal.priceComparisons?.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length || 1) >= 3
                    ? 'เปรียบเทียบราคา 3 แพลตฟอร์ม'
                    : `สถานะราคาบนแพลตฟอร์ม (${platformMeta.name})`}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">อัปเดตเรียลไทม์</span>
              </div>

              <div className="space-y-1.5">
                {deal.priceComparisons.map((pc) => {
                  const hasDirect = pc.hasDirectProduct !== false && pc.price > 0;
                  const isLowest = pc.platform === deal.platform && hasDirect;
                  const meta = getPlatformMeta(pc.platform);
                  return (
                    <div
                      key={pc.platform}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                        isLowest
                          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
                          : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isLowest ? 'bg-emerald-500' : 'bg-neutral-300'}`}></span>
                        <div>
                          <span className="font-bold text-xs text-neutral-800 block">{meta.name}</span>
                          <span className="text-[10px] text-neutral-400">{hasDirect ? pc.storeName : 'ยังไม่มีลิงก์ตรง'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        {hasDirect ? (
                          <>
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className={`text-sm font-black ${isLowest ? 'text-emerald-700' : 'text-neutral-800'}`}>
                                {formatTHB(pc.price)}
                              </span>
                              {isLowest && (
                                <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                                  ถูกสุด ✅
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-400 block">
                              หลังโค้ด ~{formatTHB(pc.estimatedAfterVoucher)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-400 font-medium">รออัปเดตลิงก์ตรง</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


        </div>

        {/* Sticky Footer CTA */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-neutral-400 block font-medium">ราคาจาก source</span>
            <span className="text-xl sm:text-2xl font-black text-shopee tracking-tight">
              {formatTHB(deal.estimatedFinalPrice)}
            </span>
          </div>

          <a
            href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={`py-3 px-6 rounded-2xl font-extrabold text-sm text-white flex items-center gap-2 shadow-lg transition active:scale-95 ${
              deal.platform === 'shopee'
                ? 'bg-shopee hover:bg-shopee-hover shadow-shopee/25'
                : deal.platform === 'lazada'
                ? 'bg-lazada hover:bg-lazada-accent shadow-lazada/25'
                : 'bg-black hover:bg-neutral-800 shadow-neutral-900/25'
            }`}
          >
            <span>ไปสั่งซื้อบน {platformMeta.name}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
