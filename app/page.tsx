'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSearch } from '@/components/HeroSearch';
import { SmartFilterBar } from '@/components/SmartFilterBar';
import { FilterDrawer } from '@/components/FilterDrawer';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridCard } from '@/components/ProductGridCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { PriceAlertModal } from '@/components/PriceAlertModal';
import { ShareDealModal } from '@/components/ShareDealModal';
import { WatchlistDrawer } from '@/components/WatchlistDrawer';
import { LineOptinBanner } from '@/components/LineOptinBanner';
import { EmptySearchCard } from '@/components/EmptySearchCard';
import { isValidPersistedDeal } from '@/lib/persisted-deal';
import { DEFAULT_FILTER_STATE, filterAndRankDeals } from '@/lib/engine';
import { FilterState, ProductDeal } from '@/lib/types';
import { Sparkles, ShieldCheck, Flame, RotateCcw, HelpCircle, LayoutGrid, List, CheckCircle2, ChevronDown, ArrowUp } from 'lucide-react';
import { parseSearchIntent } from '@/lib/ai/services';
import { SearchIntent } from '@/lib/ai/types';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [aiIntent, setAiIntent] = useState<SearchIntent | null>(null);
  
  // The server returns only the current page; the full feed never enters this bundle.
  const [catalogDeals, setCatalogDeals] = useState<ProductDeal[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Custom deals ingested by the user are kept locally and merged into the current page.
  const [customDeals, setCustomDeals] = useState<ProductDeal[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const catalogRequestId = useRef(0);

  const loadCatalogPage = useCallback(async (offset: number, append: boolean) => {
    const requestId = ++catalogRequestId.current;
    setIsCatalogLoading(true);
    setCatalogError(null);

    const params = new URLSearchParams({
      offset: String(offset),
      limit: '16',
      sort: filter.sortBy,
    });
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (filter.selectedPlatforms.length < 3) params.set('platforms', filter.selectedPlatforms.join(','));
    if (filter.selectedCategory && filter.selectedCategory !== 'ทั้งหมด') params.set('category', filter.selectedCategory);
    if (filter.maxPrice !== null) params.set('maxPrice', String(filter.maxPrice));
    if (filter.onlyMall) params.set('onlyMall', '1');
    if (filter.onlyFreeShipping) params.set('onlyFreeShipping', '1');
    if (filter.onlyDiscounted) params.set('onlyDiscounted', '1');

    try {
      const response = await fetch(`/api/catalog?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'catalog_load_failed');
      if (requestId !== catalogRequestId.current) return;

      setCatalogDeals((current) => append ? [...current, ...(payload.deals || [])] : (payload.deals || []));
      setCatalogTotal(Number(payload.totalMatching) || 0);
    } catch (error) {
      if (requestId !== catalogRequestId.current) return;
      setCatalogError(error instanceof Error ? error.message : 'catalog_load_failed');
      if (!append) setCatalogDeals([]);
    } finally {
      if (requestId === catalogRequestId.current) setIsCatalogLoading(false);
    }
  }, [filter.maxPrice, filter.onlyDiscounted, filter.onlyFreeShipping, filter.onlyMall, filter.selectedCategory, filter.selectedPlatforms, filter.sortBy, searchQuery]);

  // Debounce search/filter changes so every keystroke does not trigger a catalog query.
  useEffect(() => {
    const timer = window.setTimeout(() => loadCatalogPage(0, false), 250);
    return () => window.clearTimeout(timer);
  }, [loadCatalogPage]);

  // Load custom ingested deals from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shopdee_custom_deals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validDeals = parsed.filter(isValidPersistedDeal);
          setCustomDeals(validDeals);

          if (validDeals.length === 0) {
            localStorage.removeItem('shopdee_custom_deals');
          } else if (validDeals.length !== parsed.length) {
            localStorage.setItem('shopdee_custom_deals', JSON.stringify(validDeals));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse shopdee_custom_deals', e);
    }
  }, []);

  // View mode: 'grid' (ช่องๆ ดูเร็ว Shopee style) vs 'list' (รายการ เจาะลึก)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals state
  const [activeDetailDeal, setActiveDetailDeal] = useState<{ deal: ProductDeal; rank: number } | null>(null);
  const [activeAlertDeal, setActiveAlertDeal] = useState<ProductDeal | null>(null);
  const [activeShareDeal, setActiveShareDeal] = useState<ProductDeal | null>(null);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);

  // Trigger AI Intent Parsing in background when user searches
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
      setAiIntent(null);
      return;
    }

    let isCancelled = false;
    parseSearchIntent(searchQuery).then((res) => {
      if (isCancelled) return;
      const intent = res.data;
      setAiIntent(intent);

      // Auto-apply intent filters if detected
      if (intent.maxPrice !== undefined || intent.category || (intent.preferredPlatform && intent.preferredPlatform !== 'all')) {
        setFilter(prev => ({
          ...prev,
          maxPrice: intent.maxPrice !== undefined ? intent.maxPrice : prev.maxPrice,
          selectedCategory: intent.category || prev.selectedCategory,
          selectedPlatforms: intent.preferredPlatform && intent.preferredPlatform !== 'all' 
            ? [intent.preferredPlatform] 
            : prev.selectedPlatforms,
        }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  const handleClearIntent = () => {
    setSearchQuery('');
    setAiIntent(null);
    setFilter(DEFAULT_FILTER_STATE);
  };

  const customResult = useMemo(() => filterAndRankDeals(customDeals, searchQuery, {
    ...filter,
    limit: 100000,
  }), [customDeals, filter, searchQuery]);

  // Ingested deals are local and always take priority over the server page.
  const displayedDeals = useMemo(() => {
    const seen = new Set<string>();
    const merged: ProductDeal[] = [];
    for (const deal of [...customResult.deals, ...catalogDeals]) {
      if (!seen.has(deal.id)) {
        seen.add(deal.id);
        merged.push(deal);
      }
    }
    return merged;
  }, [catalogDeals, customResult.deals]);

  const totalMatching = catalogTotal + customResult.totalMatching;
  const hasMore = catalogDeals.length < catalogTotal;

  // Handle Smart Ingestion (via URL or On-Demand Query)
  const handleIngestProduct = async ({ url, query }: { url?: string; query?: string }) => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, query }),
      });

      const data = await res.json();
      if (data.success && data.deal) {
        const newDeal: ProductDeal = data.deal;
        setCustomDeals(prev => {
          const filtered = prev.filter(d => d.id !== newDeal.id);
          const updated = [newDeal, ...filtered];
          try {
            localStorage.setItem('shopdee_custom_deals', JSON.stringify(updated));
          } catch (e) {
            console.warn('Failed to save to localStorage', e);
          }
          return updated;
        });

        // Reset search/filter to see the new deal immediately
        setSearchQuery('');
        setFilter(DEFAULT_FILTER_STATE);

        // Open detailed comparison modal for instant satisfaction
        setActiveDetailDeal({ deal: newDeal, rank: 1 });
        
        // Show celebratory toast
        setToastMessage(`✨ ดึงข้อมูล "${newDeal.title.slice(0, 30)}..." สำเร็จ พร้อมวิเคราะห์ราคาจริงแล้ว!`);
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        alert(data.message || 'ไม่สามารถดึงข้อมูลสินค้านี้ได้ กรุณาตรวจสอบลิงก์หรือลองใหม่อีกครั้ง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleClearCustomDeals = () => {
    setCustomDeals([]);
    try {
      localStorage.removeItem('shopdee_custom_deals');
    } catch (e) {
      // ignore
    }
  };

  const handleResetHome = () => {
    setSearchQuery('');
    setAiIntent(null);
    setFilter(DEFAULT_FILTER_STATE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-warm-50">
      
      {/* 1. Header Navigation */}
      <Navbar 
        onOpenWatchlist={() => setIsWatchlistOpen(true)} 
        onResetHome={handleResetHome}
      />

      {/* 2. Hero Search Section with AI Intent & URL Ingestion */}
      <HeroSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        aiIntent={aiIntent}
        onClearIntent={handleClearIntent}
        onIngestUrl={(url) => handleIngestProduct({ url })}
        isIngesting={isIngesting}
      />

      {/* 3. Smart Sticky Filter Bar */}
      <SmartFilterBar
        filter={filter}
        onFilterChange={setFilter}
        totalMatching={totalMatching}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 4. Main Results Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Results Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>
                {searchQuery ? `ผลการค้นหา "${searchQuery}"` : 'สินค้ายอดนิยมแนะนำสำหรับคุณ'}
              </span>
            </h2>
            <span className="bg-neutral-200 text-neutral-700 text-xs font-bold px-2 py-0.5 rounded-full">
              แสดง {displayedDeals.length} จาก {totalMatching} ดีล
            </span>

            {customDeals.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-orange-100 text-shopee text-xs font-bold px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                <span>เพิ่มจากลิงก์สด {customDeals.length} รายการ</span>
                <button
                  onClick={handleClearCustomDeals}
                  className="ml-1 text-[10px] text-neutral-400 hover:text-neutral-700 underline"
                  title="ล้างรายการที่คุณเพิ่ม"
                >
                  ล้าง
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
            <span className="hidden sm:inline">
              {viewMode === 'grid' ? '📱 มุมมองแบบช่อง (แตะเพื่อดูรายละเอียดและร้านค้า)' : '📋 มุมมองแบบรายการ (รายละเอียดเปรียบเทียบเต็ม)'}
            </span>
            <span className="text-neutral-400">•</span>
            <span>
              เรียงตาม: {filter.sortBy === 'popular' ? '🔎 ข้อมูล source' : filter.sortBy === 'best_discount' ? '🏷️ ลดจากราคาหน้าร้าน %' : filter.sortBy === 'cheapest' ? '💰 ราคาต่ำไปสูง' : filter.sortBy === 'expensive' ? '💎 ราคาสูงไปต่ำ' : '🛡️ ร้านทางการจาก source'}
            </span>
          </div>
        </div>

        {/* Product Deals Display */}
        {isCatalogLoading && displayedDeals.length === 0 ? (
          <div className="rounded-2xl border border-orange-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-brand-600" />
            <p className="font-bold text-neutral-700">กำลังโหลดสินค้าจาก source...</p>
            <p className="mt-1 text-xs text-neutral-400">ระบบกำลังโหลดเฉพาะรายการหน้านี้</p>
          </div>
        ) : catalogError && displayedDeals.length === 0 ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center shadow-sm">
            <p className="font-bold text-red-700">โหลดรายการสินค้าไม่สำเร็จ</p>
            <p className="mt-1 text-xs text-red-500">กรุณาลองใหม่อีกครั้ง</p>
            <button
              onClick={() => loadCatalogPage(0, false)}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              ลองใหม่
            </button>
          </div>
        ) : displayedDeals.length > 0 ? (
          <div>
            {/* GRID VIEW (Shopee Style 2-Columns on Mobile) */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {displayedDeals.map((deal, index) => (
                  <ProductGridCard
                    key={deal.id}
                    deal={deal}
                    rank={index + 1}
                    onOpenDetail={(d) => setActiveDetailDeal({ deal: d, rank: index + 1 })}
                    onOpenPriceAlert={(d) => setActiveAlertDeal(d)}
                    onOpenShare={(d) => setActiveShareDeal(d)}
                  />
                ))}
              </div>
            ) : (
              /* LIST VIEW (Detailed Multi-Platform View) */
              <div className="space-y-4 sm:space-y-5">
                {displayedDeals.map((deal, index) => (
                  <ProductCard
                    key={deal.id}
                    deal={deal}
                    rank={index + 1}
                    onOpenPriceAlert={(d) => setActiveAlertDeal(d)}
                    onOpenShare={(d) => setActiveShareDeal(d)}
                    selectedPlatform={filter.selectedPlatforms.length === 1 ? filter.selectedPlatforms[0] : 'all'}
                  />
                ))}
              </div>
            )}

            {/* Progressive Load More Pagination Section (Immediately follows items) */}
            {hasMore ? (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-3">
                <div className="text-xs font-bold text-neutral-600">
                  แสดงแล้ว <span className="text-brand-600">{displayedDeals.length}</span> จากทั้งหมด <span className="text-neutral-900">{totalMatching}</span> รายการ
                </div>
                <div className="w-56 h-2 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (displayedDeals.length / totalMatching) * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => loadCatalogPage(catalogDeals.length, true)}
                  disabled={isCatalogLoading}
                  className="mt-2 px-8 py-3.5 rounded-2xl bg-white hover:bg-orange-50 text-brand-600 border-2 border-brand-500 hover:border-brand-600 font-black text-sm shadow-md hover:shadow-brand-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:cursor-wait disabled:opacity-60"
                >
                  <span>{isCatalogLoading ? 'กำลังโหลด...' : 'ดูสินค้าเพิ่มเติม (+16 รายการ)'}</span>
                  <ChevronDown className="w-4 h-4 text-brand-600" />
                </button>
              </div>
            ) : displayedDeals.length > 16 ? (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-2">
                <div className="text-xs font-bold text-neutral-500">
                  🎉 แสดงสินค้าทั้งหมดครบแล้ว ({totalMatching} รายการ)
                </div>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="mt-1 text-xs font-extrabold text-neutral-600 hover:text-brand-600 flex items-center gap-1.5 transition py-1.5 px-3 rounded-lg hover:bg-neutral-100 cursor-pointer"
                >
                  <span>กลับขึ้นด้านบน</span>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            {/* Web Watchlist & Price Tracker Banner (Positioned smoothly at the bottom) */}
            <div className="pt-4">
              <LineOptinBanner onOpenWatchlist={() => setIsWatchlistOpen(true)} />
            </div>
          </div>
        ) : (
          /* Empty State Upgraded with Smart Ingestion */
          <EmptySearchCard
            searchQuery={searchQuery}
            onClearFilters={() => {
              setSearchQuery('');
              setFilter(DEFAULT_FILTER_STATE);
            }}
            onIngest={handleIngestProduct}
            isIngesting={isIngesting}
          />
        )}

        {/* Bottom Callout: Value Proposition Summary */}
        <div className="mt-12 p-6 rounded-2xl bg-neutral-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-neutral-800 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ภารกิจของเรา: ไม่ยอมให้คนไทยโดนหลอก</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              ช้อปปิ้งฉลาดขึ้นด้วยข้อมูลสินค้าจาก source
            </h3>
            <p className="text-xs text-neutral-400 max-w-xl">
              ShopDee (ช้อปดี) ไม่ใช่ร้านค้า แต่เป็นเครื่องมือช่วยค้นหาและเปรียบเทียบราคาที่โปร่งใสที่สุด ไม่เก็บค่าบริการ ไม่ต้องสมัครสมาชิก ใช้ฟรีได้ตลอดชีพ
            </p>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-6 py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-extrabold text-xs sm:text-sm shrink-0 transition shadow-md active:scale-95"
          >
            ค้นหาดีลอื่นต่อ ⬆️
          </button>
        </div>

      </main>

      {/* 5. Footer */}
      <footer className="mt-12 bg-white border-t border-neutral-200 py-8 px-4 sm:px-6 text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-extrabold text-neutral-800 text-sm mb-1">
              ShopDee (ช้อปดี)
            </div>
            <p className="text-[11px] text-neutral-400">
              © {new Date().getFullYear()} ShopDee. แสดงข้อมูลสินค้าจาก source พร้อม direct URL ของ Shopee, Lazada และ TikTok Shop
            </p>
          </div>

          <div className="text-[11px] text-neutral-400 max-w-md leading-normal">
            หมายเหตุ: เว็บไซต์นี้อาจได้รับค่าตอบแทนจากลิงก์พันธมิตร (Affiliate) เมื่อคุณสั่งซื้อสินค้าผ่านแอป Shopee, Lazada หรือ TikTok Shop โดยที่คุณไม่ต้องจ่ายเงินเพิ่มแม้แต่บาทเดียว
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Grid Item Quick Detail Modal */}
      <ProductDetailModal
        deal={activeDetailDeal ? activeDetailDeal.deal : null}
        rank={activeDetailDeal ? activeDetailDeal.rank : 0}
        onClose={() => setActiveDetailDeal(null)}
        onOpenPriceAlert={(d) => setActiveAlertDeal(d)}
        onOpenShare={(d) => setActiveShareDeal(d)}
        selectedPlatform={filter.selectedPlatforms.length === 1 ? filter.selectedPlatforms[0] : 'all'}
      />

      {/* Viral Social Media Deal Card & Share Modal */}
      <ShareDealModal
        deal={activeShareDeal}
        onClose={() => setActiveShareDeal(null)}
      />

      {/* Web-Native Watchlist Slide-Over Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
      />

      {/* Web-Native Price Drop Alert Modal */}
      <PriceAlertModal
        deal={activeAlertDeal}
        isOpen={Boolean(activeAlertDeal)}
        onClose={() => setActiveAlertDeal(null)}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
      />

      {/* Ingestion Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
