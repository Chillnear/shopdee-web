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
  Store,
  Zap,
  Sparkles,
  Flame,
  Search
} from 'lucide-react';

interface StoreComparisonTableProps {
  stores: StoreOffer[];
  dealTitle?: string;
  defaultPlatform?: Platform | 'all';
  initiallyExpanded?: boolean;
}

function extractSearchKeywords(title: string): string {
  return title
    .replace(/[【\[\(][^】\]\)]*[】\]\)]/g, ' ')
    .replace(/[^\w\s\u0E00-\u0E7F]/gi, ' ')
    .replace(/\b(COD|TH|BK|PRO|HOT|SALE)\b/gi, ' ')
    .replace(/(ใหม่|สินค้าใหม่|ของแท้|ส่งฟรี|พร้อมส่ง|ลดราคา|แท้100%?|ราคาถูก|โปรโมชั่น|1แถม1|ซื้อ 1 แถม 1|ในไทย|จัดส่งไว|ด่วน)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 1)
    .slice(0, 5)
    .join(' ');
}

interface SearchAssistantProps {
  dealTitle?: string;
  missingPlatforms: Platform[];
}

function SearchAssistant({ dealTitle, missingPlatforms }: SearchAssistantProps) {
  if (!dealTitle || missingPlatforms.length === 0) return null;

  const cleanKeywords = extractSearchKeywords(dealTitle);
  const queryEnc = encodeURIComponent(cleanKeywords);

  return (
    <div className="mt-3 p-3 bg-white rounded-xl border border-neutral-200/90 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-neutral-800">
        <Search className="w-3.5 h-3.5 text-neutral-500" />
        <span>🔍 ค้นหาเปรียบเทียบเพิ่มเติมบนแอปอื่น ({missingPlatforms.map(p => getPlatformMeta(p).name).join(', ')})</span>
      </div>
      <p className="text-[11px] text-neutral-500 mb-2 leading-relaxed">
        *ระบบยังไม่มีลิงก์ตรงของสินค้านี้บนแอปอื่น ท่านสามารถกดปุ่มด้านล่างเพื่อเปิดผลการค้นหาตามชื่อสินค้าบนแอปนั้นๆ ได้โดยตรง
      </p>
      <div className="flex flex-wrap gap-2">
        {missingPlatforms.map(platform => {
          const meta = getPlatformMeta(platform);
          let searchUrl = '';
          if (platform === 'lazada') {
            searchUrl = `https://www.lazada.co.th/catalog/?q=${queryEnc}`;
          } else if (platform === 'tiktok') {
            searchUrl = `https://www.tiktok.com/search?q=${queryEnc}`;
          } else {
            searchUrl = `https://shopee.co.th/search?keyword=${queryEnc}`;
          }
          return (
            <a
              key={platform}
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-bold flex items-center gap-1 transition active:scale-95"
            >
              <span>ค้นหาชื่อนี้บน {meta.name}</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function StoreComparisonTable({
  stores,
  dealTitle,
  defaultPlatform = 'all',
  initiallyExpanded = false,
}: StoreComparisonTableProps) {
  const [activeTab, setActiveTab] = useState<Platform | 'all'>(defaultPlatform);
  const [isExpanded, setIsExpanded] = useState<boolean>(initiallyExpanded);

  // Filter ONLY verified direct product stores (strictly reject search / catalog URLs)
  const validStores = (stores || []).filter(s =>
    s.url &&
    s.isDirectProduct !== false &&
    !s.url.includes('/catalog/?') &&
    !s.url.includes('/search?') &&
    !s.url.includes('/tag/')
  );

  if (validStores.length === 0) return null;

  const representedPlatforms = new Set(validStores.map(s => s.platform));
  const missingPlatforms: Platform[] = (['shopee', 'lazada', 'tiktok'] as Platform[]).filter(
    p => !representedPlatforms.has(p)
  );

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

  // If only 1 verified store exists
  if (validStores.length === 1) {
    const singleStore = validStores[0];
    const platformMeta = getPlatformMeta(singleStore.platform);

    return (
      <div className="bg-neutral-50 rounded-2xl p-3 sm:p-4 border border-neutral-200/90 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-neutral-200">
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-black text-neutral-900">
              ร้านค้าที่พบลิงก์สินค้าตรง (1 ร้าน)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>ลิงก์ตรงสินค้าแท้ 100%</span>
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-emerald-300 ring-1 ring-emerald-400/20 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${platformMeta.badgeColor}`}>
                  {platformMeta.name}
                </span>
                {getStoreTypeBadge(singleStore.storeType)}
                {singleStore.freeShipping && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                    <Truck className="w-2.5 h-2.5" />
                    <span>ส่งฟรี</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
                <span className="font-extrabold text-neutral-900 truncate">
                  {singleStore.storeName}
                </span>
                <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
                  <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{singleStore.storeRating}</span>
                  </span>
                  <span>•</span>
                  <span>ขายแล้ว {formatSoldCount(singleStore.soldCount)}</span>
                </div>
              </div>

              {singleStore.voucherNote && (
                <div className="mt-1 text-[11px] text-amber-800 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="font-semibold">{singleStore.voucherNote}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-150">
              <div className="text-left sm:text-right">
                <div className="flex items-baseline gap-1.5 sm:justify-end">
                  <span className="text-[10px] text-neutral-400">เหลือเพียง</span>
                  <span className="text-base sm:text-lg font-black text-emerald-700">
                    {formatTHB(singleStore.estimatedAfterVoucher)}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  ราคาหน้าร้าน: {formatTHB(singleStore.price)}
                </div>
              </div>

              <a
                href={getSmartAffiliateUrl(singleStore.url, singleStore.platform, singleStore.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`py-2 px-4 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 transition shadow-xs active:scale-95 whitespace-nowrap ${
                  singleStore.platform === 'shopee'
                    ? 'bg-shopee hover:bg-shopee-hover shadow-shopee/20'
                    : singleStore.platform === 'lazada'
                    ? 'bg-lazada hover:bg-lazada-accent shadow-lazada/20'
                    : 'bg-black hover:bg-neutral-800'
                }`}
              >
                <span>ไปซื้อที่ {platformMeta.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <SearchAssistant dealTitle={dealTitle} missingPlatforms={missingPlatforms} />
      </div>
    );
  }

  // Counts by platform for multi-store comparisons
  const shopeeStores = validStores.filter(s => s.platform === 'shopee');
  const lazadaStores = validStores.filter(s => s.platform === 'lazada');
  const tiktokStores = validStores.filter(s => s.platform === 'tiktok');

  let displayedStores: StoreOffer[] = [];

  if (activeTab === 'all') {
    displayedStores = [...validStores].sort((a, b) => a.estimatedAfterVoucher - b.estimatedAfterVoucher);
  } else {
    displayedStores = validStores
      .filter(s => s.platform === activeTab)
      .sort((a, b) => a.estimatedAfterVoucher - b.estimatedAfterVoucher);
  }

  // 1. ร้านถูกสุด (Lowest Price)
  const cheapestStore = displayedStores[0];

  // 2. ร้านดีสุด (Best / Official Mall) - prefer Mall with distinct ID from cheapest
  const bestStore = displayedStores.find(s => (s.isBestStore || s.storeType === 'mall') && s.id !== cheapestStore?.id) ||
                    displayedStores.find(s => s.isBestStore || s.storeType === 'mall') ||
                    [...displayedStores].sort((a, b) => b.storeRating - a.storeRating)[0];
  const hasDistinctBest = Boolean(bestStore && bestStore.id !== cheapestStore?.id);

  // 3. ร้านคุ้มค่าสุด (Best Value: ส่งฟรี + เรตติ้งดี + คูปองคุ้ม + ราคาจับต้องได้) - prefer distinct ID
  const bestValueStore = displayedStores.find(s => s.id !== cheapestStore?.id && s.id !== bestStore?.id && (s.isBestValue || s.freeShipping)) ||
                         displayedStores.find(s => s.id !== cheapestStore?.id && s.id !== bestStore?.id) ||
                         displayedStores.find(s => s.id !== cheapestStore?.id) ||
                         displayedStores[1] ||
                         cheapestStore;
  const hasDistinctValue = Boolean(bestValueStore && bestValueStore.id !== cheapestStore?.id && bestValueStore.id !== bestStore?.id);

  // Visible items (3 if collapsed, all if expanded)
  const visibleStores = isExpanded ? displayedStores : displayedStores.slice(0, 3);
  const hasMore = displayedStores.length > 3;

  return (
    <div className="bg-neutral-50 rounded-2xl p-3 sm:p-4 border border-neutral-200/90 shadow-2xs">
      
      {/* Header with Title & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-black text-neutral-900">
              เปรียบเทียบร้านค้าที่พบลิงก์ตรง ({validStores.length} ร้าน)
            </h4>
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            เปรียบเทียบร้านค้าจริงที่มีลิงก์ตรง: ถูกสุด • คุ้มสุด • ดีสุด
          </p>
        </div>

        {/* Platform Filter Tabs within the comparison */}
        {representedPlatforms.size > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 sm:pt-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              รวมทุกแอป ({validStores.length})
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
        )}
      </div>

      {/* 3-Pillar Smart Decision Bar: "ถูกสุด" • "คุ้มค่าสุด" • "ดีสุด" */}
      {cheapestStore && (
        <div className={`grid gap-2 mb-3 ${
          hasDistinctBest && hasDistinctValue 
            ? 'grid-cols-1 md:grid-cols-3' 
            : hasDistinctBest 
            ? 'grid-cols-1 sm:grid-cols-2' 
            : 'grid-cols-1 sm:grid-cols-2'
        }`}>
          {/* 1. ร้านถูกสุด (Lowest Price) */}
          <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 flex flex-col justify-between gap-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-amber-300" />
                  <span>🔥 ถูกสุด</span>
                </span>
                <span className="text-[10px] font-bold text-neutral-500">
                  {getPlatformMeta(cheapestStore.platform).name}
                </span>
              </div>
              <p className="text-xs font-black text-neutral-900 truncate" title={cheapestStore.storeName}>
                {cheapestStore.storeName}
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[10px] text-neutral-500">จ่ายน้อยสุด</span>
                <span className="text-sm sm:text-base font-black text-emerald-700">
                  {formatTHB(cheapestStore.estimatedAfterVoucher)}
                </span>
              </div>
            </div>

            <a
              href={getSmartAffiliateUrl(cheapestStore.url, cheapestStore.platform, cheapestStore.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1 shrink-0 shadow-2xs transition active:scale-95"
            >
              <span>ซื้อถูกสุด ({getPlatformMeta(cheapestStore.platform).name})</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* 2. ร้านคุ้มค่าสุด (Best Value / Sweet Spot) */}
          {hasDistinctValue && (
            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 flex flex-col justify-between gap-2 shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 text-white" />
                    <span>💎 คุ้มค่าสุด</span>
                  </span>
                  <span className="text-[10px] font-bold text-neutral-500">
                    {getPlatformMeta(bestValueStore.platform).name}
                  </span>
                </div>
                <p className="text-xs font-black text-neutral-900 truncate" title={bestValueStore.storeName}>
                  {bestValueStore.storeName}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm sm:text-base font-black text-amber-800">
                    {formatTHB(bestValueStore.estimatedAfterVoucher)}
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold">
                    • ส่งฟรี 0.-
                  </span>
                </div>
              </div>

              <a
                href={getSmartAffiliateUrl(bestValueStore.url, bestValueStore.platform, bestValueStore.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1 shrink-0 shadow-2xs transition active:scale-95"
              >
                <span>ซื้อตัวคุ้มค่า ({getPlatformMeta(bestValueStore.platform).name})</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* 3. ร้านดีสุด (Official Mall 100% Genuine) */}
          {hasDistinctBest ? (
            <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 flex flex-col justify-between gap-2 shadow-2xs">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>👑 ดีสุด (Mall แท้)</span>
                  </span>
                  <span className="text-[10px] font-bold text-neutral-500">
                    {getPlatformMeta(bestStore.platform).name}
                  </span>
                </div>
                <p className="text-xs font-black text-neutral-900 truncate" title={bestStore.storeName}>
                  {bestStore.storeName}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-sm sm:text-base font-black text-blue-800">
                    {formatTHB(bestStore.estimatedAfterVoucher)}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold">
                    • แท้ 100%
                  </span>
                </div>
              </div>

              <a
                href={getSmartAffiliateUrl(bestStore.url, bestStore.platform, bestStore.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1 shrink-0 shadow-2xs transition active:scale-95"
              >
                <span>ซื้อร้านแท้ ({getPlatformMeta(bestStore.platform).name})</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-purple-50/90 border border-purple-200 flex flex-col justify-between gap-1 shadow-2xs">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] font-black bg-purple-600 text-white px-1.5 py-0.2 rounded">
                  👑 คุ้ม 2 ต่อ
                </span>
                <span className="text-[10px] font-bold text-purple-800">
                  ร้านถูกสุดเป็น Mall ทางการ
                </span>
              </div>
              <p className="text-xs font-black text-purple-950">
                ได้ทั้งราคาถูกสุดและได้ของแท้ 100% ในร้านเดียว!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stores List */}
      <div className="space-y-2">
        {visibleStores.map((store, index) => {
          const platformMeta = getPlatformMeta(store.platform);
          const isCheapest = store.id === cheapestStore?.id;
          const isBestValue = store.id === bestValueStore?.id && !isCheapest;
          const isBest = store.id === bestStore?.id && !isCheapest && !isBestValue && hasDistinctBest;

          return (
            <div
              key={store.id}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                isCheapest
                  ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/30'
                  : isBestValue
                  ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/30'
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
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 bg-emerald-600 text-white shadow-2xs">
                        <Flame className="w-3 h-3 text-amber-300" />
                        <span>#1 ถูกสุด{activeTab === 'all' && representedPlatforms.size > 1 ? 'ทุกแอป 🏆' : ' 🏆'}</span>
                      </span>
                    ) : isBestValue ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 bg-amber-500 text-white shadow-2xs">
                        <Zap className="w-3 h-3 text-white" />
                        <span>💎 คุ้มค่าสุด (ส่งฟรี+คูปอง)</span>
                      </span>
                    ) : isBest ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 bg-blue-600 text-white shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-white" />
                        <span>👑 ร้านดีสุด (Mall ทางการ)</span>
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
                        isCheapest 
                          ? 'text-emerald-700' 
                          : isBestValue 
                          ? 'text-amber-800' 
                          : isBest 
                          ? 'text-blue-800' 
                          : 'text-neutral-900'
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
                        : isBestValue
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                        : isBest
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                        : store.platform === 'shopee'
                        ? 'bg-shopee hover:bg-shopee-hover'
                        : store.platform === 'lazada'
                        ? 'bg-lazada hover:bg-lazada-accent'
                        : 'bg-black hover:bg-neutral-800'
                    }`}
                  >
                    <span>ไป {platformMeta.name}</span>
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
                {activeTab === 'all' ? '' : ` ใน ${activeTab.toUpperCase()}`}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}

      {/* Honest Search Assistant for missing platforms */}
      <SearchAssistant dealTitle={dealTitle} missingPlatforms={missingPlatforms} />

    </div>
  );
}
