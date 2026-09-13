'use client';

import React, { useState } from 'react';
import { 
  StoreOffer, 
  Platform, 
  StoreType 
} from '@/lib/types';
import { formatTHB, formatSoldCount, getPlatformMeta, getSmartAffiliateUrl } from '@/lib/engine';
import { 
  ShieldCheck, 
  Award, 
  Star, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Tag, 
  CheckCircle2, 
  Store
} from 'lucide-react';

interface StoreComparisonTableProps {
  stores: StoreOffer[];
  dealTitle?: string;
  defaultPlatform?: Platform | 'all';
  initiallyExpanded?: boolean;
}

export function StoreComparisonTable({
  stores,
  dealTitle,
  defaultPlatform = 'all',
  initiallyExpanded = false,
}: StoreComparisonTableProps) {
  const [activeTab, setActiveTab] = useState<Platform | 'all'>(defaultPlatform);
  const [isExpanded, setIsExpanded] = useState<boolean>(initiallyExpanded);

  if (!stores || stores.length === 0) return null;

  // Counts by platform
  const shopeeStores = stores.filter(s => s.platform === 'shopee');
  const lazadaStores = stores.filter(s => s.platform === 'lazada');
  const tiktokStores = stores.filter(s => s.platform === 'tiktok');

  // Filtered stores based on active tab
  const displayedStores = (activeTab === 'all' 
    ? [...stores] 
    : stores.filter(s => s.platform === activeTab)
  ).sort((a, b) => a.estimatedAfterVoucher - b.estimatedAfterVoucher);

  // Find absolute cheapest store in current view
  const cheapestStore = displayedStores[0];
  // Find best/official store (Mall or highest rating)
  const bestStore = displayedStores.find(s => s.isBestStore || s.storeType === 'mall') || 
                    [...displayedStores].sort((a, b) => b.storeRating - a.storeRating)[0];
  const hasDistinctBest = bestStore && bestStore.id !== cheapestStore?.id;

  // Visible items (3 if collapsed, all if expanded)
  const visibleStores = isExpanded ? displayedStores : displayedStores.slice(0, 3);
  const hasMore = displayedStores.length > 3;

  const getStoreTypeBadge = (type: StoreType) => {
    switch (type) {
      case 'mall':
        return (
          <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3 text-red-600" />
            <span>Mall ทางการแท้</span>
          </span>
        );
      case 'preferred':
        return (
          <span className="inline-flex items-center gap-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
            <Award className="w-3 h-3 text-orange-600" />
            <span>ร้านแนะนำ</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>ยืนยันตัวตน</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
            ร้านทั่วไป
          </span>
        );
    }
  };

  return (
    <div className="bg-neutral-50 rounded-2xl p-3 sm:p-4 border border-neutral-200/90 shadow-2xs">
      
      {/* Header with Title & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-black text-neutral-900">
              เปรียบเทียบทุกร้านค้า ({stores.length} ร้าน) เรียงจากถูกสุดไปแพง
            </h4>
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            เทียบทั้งข้ามแอป และเทียบหลายร้านในแอปเดียวกัน ไม่ต้องเปิดหาเองทีละร้าน
          </p>
        </div>

        {/* Platform Filter Tabs within the comparison */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 sm:pt-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            รวมทุกแอป ({stores.length})
          </button>

          {shopeeStores.length > 0 && (
            <button
              onClick={() => setActiveTab('shopee')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'shopee'
                  ? 'bg-shopee text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <span>Shopee ({shopeeStores.length})</span>
            </button>
          )}

          {lazadaStores.length > 0 && (
            <button
              onClick={() => setActiveTab('lazada')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'lazada'
                  ? 'bg-lazada text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <span>Lazada ({lazadaStores.length})</span>
            </button>
          )}

          {tiktokStores.length > 0 && (
            <button
              onClick={() => setActiveTab('tiktok')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'tiktok'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <span>TikTok ({tiktokStores.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Card Smart Decision Bar: "ร้านไหนถูกสุด" vs "ร้านไหนดีสุด" */}
      {cheapestStore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {/* Card 1: ตัวเลือกราคาถูกสุด */}
          <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                  🔥 ร้านถูกสุด
                </span>
                <span className="text-[10px] font-bold text-neutral-600">
                  {getPlatformMeta(cheapestStore.platform).name}
                </span>
              </div>
              <p className="text-xs font-black text-neutral-900 truncate">
                {cheapestStore.storeName}
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[10px] text-neutral-500">หลังลดเหลือ</span>
                <span className="text-sm font-black text-emerald-700">
                  {formatTHB(cheapestStore.estimatedAfterVoucher)}
                </span>
              </div>
            </div>

            <a
              href={getSmartAffiliateUrl(cheapestStore.url, cheapestStore.platform, cheapestStore.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shrink-0 shadow-2xs transition active:scale-95"
            >
              <span>ซื้อถูกสุด</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Card 2: ตัวเลือกของแท้/ดีสุด (Mall ทางการ) */}
          {hasDistinctBest ? (
            <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>ร้านดีสุด (ของแท้)</span>
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600">
                    {getPlatformMeta(bestStore.platform).name}
                  </span>
                </div>
                <p className="text-xs font-black text-neutral-900 truncate">
                  {bestStore.storeName}
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[10px] text-neutral-500">ของแท้ 100%</span>
                  <span className="text-sm font-black text-blue-800">
                    {formatTHB(bestStore.estimatedAfterVoucher)}
                  </span>
                  <span className="text-[10px] text-amber-600 font-bold">
                    ⭐{bestStore.storeRating}
                  </span>
                </div>
              </div>

              <a
                href={getSmartAffiliateUrl(bestStore.url, bestStore.platform, bestStore.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1 shrink-0 shadow-2xs transition active:scale-95"
              >
                <span>ซื้อร้านแท้</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-purple-50/90 border border-purple-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-black bg-purple-600 text-white px-1.5 py-0.2 rounded">
                    👑 คุ้ม 2 ต่อ
                  </span>
                  <span className="text-[10px] font-bold text-purple-800">
                    ร้านถูกสุดเป็น Mall ทางการ
                  </span>
                </div>
                <p className="text-xs font-black text-purple-950 truncate">
                  ได้ทั้งราคาถูกสุดและได้ของแท้ 100% ในร้านเดียว!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stores List */}
      <div className="space-y-2">
        {visibleStores.map((store, index) => {
          const platformMeta = getPlatformMeta(store.platform);
          const isCheapest = store.id === cheapestStore?.id;
          const isBest = store.id === bestStore?.id && hasDistinctBest;

          return (
            <div
              key={store.id}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                isCheapest
                  ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/30'
                  : isBest
                  ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-300/30'
                  : 'bg-white border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Left: Store Rank, Platform, Store Name, Trust Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    
                    {/* Store Rank within the active tab */}
                    {isCheapest ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 bg-emerald-600 text-white shadow-2xs">
                        <span>#1 ถูกสุด{activeTab === 'all' ? 'ทุกแอป 🏆' : `ใน ${platformMeta.name} 👑`}</span>
                      </span>
                    ) : isBest ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 bg-blue-600 text-white shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-white" />
                        <span>⭐ ร้านดีสุด (Mall ทางการ)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-700">
                        #{index + 1}
                      </span>
                    )}

                    {/* Platform Badge */}
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${platformMeta.badgeColor}`}>
                      {platformMeta.name}
                    </span>

                    {/* Store Type Badge */}
                    {getStoreTypeBadge(store.storeType)}

                    {/* Free shipping */}
                    {store.freeShipping && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                        <Truck className="w-2.5 h-2.5" />
                        <span>ส่งฟรี</span>
                      </span>
                    )}

                  </div>

                  {/* Store Name & Metrics */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
                    <span className="font-extrabold text-neutral-900 truncate">
                      {store.storeName}
                    </span>
                    <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{store.storeRating}</span>
                      </span>
                      <span>•</span>
                      <span>ขายแล้ว {formatSoldCount(store.soldCount)}</span>
                    </div>
                  </div>

                  {/* Voucher Note if present */}
                  {store.voucherNote && (
                    <div className="mt-1 text-[11px] text-amber-800 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="font-semibold">{store.voucherNote}</span>
                    </div>
                  )}
                </div>

                {/* Right: Pricing & CTA Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-150">
                  <div className="text-left sm:text-right">
                    <div className="flex items-baseline gap-1.5 sm:justify-end">
                      <span className="text-[10px] text-neutral-400">เหลือเพียง</span>
                      <span className={`text-base sm:text-lg font-black tracking-tight ${
                        isCheapest ? 'text-emerald-700' : isBest ? 'text-blue-800' : 'text-neutral-900'
                      }`}>
                        {formatTHB(store.estimatedAfterVoucher)}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      ราคาหน้าร้าน: {formatTHB(store.price)}
                    </div>
                  </div>

                  <a
                    href={getSmartAffiliateUrl(store.url, store.platform, store.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-2 px-3.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1 transition shadow-xs active:scale-95 whitespace-nowrap ${
                      isCheapest
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : isBest
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                        : store.platform === 'shopee'
                        ? 'bg-shopee hover:bg-shopee-hover'
                        : store.platform === 'lazada'
                        ? 'bg-lazada hover:bg-lazada-accent'
                        : 'bg-black hover:bg-neutral-800'
                    }`}
                  >
                    <span>ไปร้านนี้</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse Button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2.5 w-full py-2 px-3 rounded-xl border border-neutral-300/80 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
        >
          {isExpanded ? (
            <>
              <span>ย่อรายชื่อร้านค้า</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>
                ดูร้านค้าอื่นเพิ่มเติมอีก {displayedStores.length - 3} ร้าน 
                {activeTab === 'all' ? ' (ทั้ง Shopee, Lazada, TikTok)' : ` ใน ${activeTab.toUpperCase()}`}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}

    </div>
  );
}
