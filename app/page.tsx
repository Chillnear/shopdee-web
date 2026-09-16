'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useMemo, useEffect } from 'react';
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
import { isValidPersistedDeal } from '@/lib/catalog-loader';
import { DEFAULT_FILTER_STATE } from '@/lib/engine';
import { FilterState, ProductDeal } from '@/lib/types';
import { Flame, CheckCircle2, ChevronDown } from 'lucide-react';
import { parseSearchIntent } from '@/lib/ai/services';
import { SearchIntent } from '@/lib/ai/types';
import { getDeals } from '@/lib/db';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [aiIntent, setAiIntent] = useState<SearchIntent | null>(null);
  
  // Data States
  const [catalogDeals, setCatalogDeals] = useState<ProductDeal[]>([]);
  const [customDeals, setCustomDeals] = useState<ProductDeal[]>([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  
  // Action States
  const [isIngesting, setIsIngesting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modals state
  const [activeDetailDeal, setActiveDetailDeal] = useState<{ deal: ProductDeal; rank: number } | null>(null);
  const [activeAlertDeal, setActiveAlertDeal] = useState<ProductDeal | null>(null);
  const [activeShareDeal, setActiveShareDeal] = useState<ProductDeal | null>(null);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);

  // 1. Fetch deals from Supabase
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    getDeals({
      query: searchQuery,
      category: filter.selectedCategory,
      maxPrice: filter.maxPrice || undefined,
      onlyMall: filter.onlyMall,
      sortBy: filter.sortBy,
      limit: visibleCount,
      platforms: filter.selectedPlatforms,
    }).then((results) => {
      if (!isCancelled) {
        setCatalogDeals(results.deals);
        setTotalCatalogCount(results.total);
        setIsLoading(false);
      }
    }).catch(err => {
      console.error('Failed to fetch deals:', err);
      if (!isCancelled) setIsLoading(false);
    });

    return () => { isCancelled = true; };
  }, [searchQuery, filter.selectedCategory, filter.selectedPlatforms, filter.maxPrice, filter.onlyMall, filter.sortBy, visibleCount]);

  // 2. Load custom deals from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shopdee_custom_deals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validDeals = parsed.filter(isValidPersistedDeal);
          setCustomDeals(validDeals);
        }
      }
    } catch (e) {
      console.warn('Failed to parse shopdee_custom_deals', e);
    }
  }, []);

  // 3. AI Intent Parsing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.startsWith('http')) {
      setAiIntent(null);
      return;
    }
    let isCancelled = false;
    parseSearchIntent(searchQuery).then((res) => {
      if (!isCancelled && res.data) {
        setAiIntent(res.data);
      }
    });
    return () => { isCancelled = true; };
  }, [searchQuery]);

  // Combine deals
  const deals = useMemo(() => {
    const seen = new Set<string>();
    const merged: ProductDeal[] = [];
    for (const d of [...customDeals, ...catalogDeals]) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        merged.push(d);
      }
    }
    return merged;
  }, [customDeals, catalogDeals]);

  const totalMatching = totalCatalogCount + customDeals.length;
  const hasMore = catalogDeals.length < totalCatalogCount;

  const handleIngestProduct = async ({ url, query }: { url?: string; query?: string }) => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, query }),
      });
      const data = await res.json();
      if (data.success && data.deal) {
        const newDeal: ProductDeal = data.deal;
        setCustomDeals(prev => [newDeal, ...prev.filter(d => d.id !== newDeal.id)]);
        setToastMessage(`✨ ดึงข้อมูลสำเร็จ!`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-warm-50">
      <Navbar onOpenWatchlist={() => setIsWatchlistOpen(true)} />
      
      <HeroSearch 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        aiIntent={aiIntent}
        onClearIntent={() => setAiIntent(null)}
        onIngestUrl={(url) => handleIngestProduct({ url })}
        isIngesting={isIngesting}
      />

      <SmartFilterBar
        filter={filter}
        onFilterChange={setFilter}
        totalMatching={totalMatching}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>{searchQuery ? `ผลการค้นหา "${searchQuery}"` : 'สินค้ายอดนิยมแนะนำ'}</span>
            </h2>
            <span className="bg-neutral-200 text-neutral-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
              {isLoading ? <><div className="animate-spin rounded-full h-3 w-3 border-2 border-brand-500 border-t-transparent"/><span>กำลังโหลด...</span></> : `แสดง ${deals.length} จาก ${totalMatching} ดีล`}
            </span>
          </div>
        </div>

        {deals.length > 0 ? (
          <div className="space-y-8">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {deals.map((deal, i) => (
                  <ProductGridCard key={deal.id} deal={deal} rank={i + 1} 
                    onOpenDetail={(d) => setActiveDetailDeal({ deal: d, rank: i + 1 })}
                    onOpenPriceAlert={setActiveAlertDeal}
                    onOpenShare={setActiveShareDeal}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {deals.map((deal, i) => (
                  <ProductCard key={deal.id} deal={deal} rank={i + 1} 
                    onOpenPriceAlert={setActiveAlertDeal}
                    onOpenShare={setActiveShareDeal}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  className="px-8 py-3 rounded-2xl bg-white text-brand-600 border-2 border-brand-500 font-bold flex items-center gap-2"
                >
                  <span>ดูสินค้าเพิ่มเติม</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : !isLoading && (
          <EmptySearchCard 
            searchQuery={searchQuery}
            onClearFilters={() => { setSearchQuery(''); setFilter(DEFAULT_FILTER_STATE); }}
            onIngest={handleIngestProduct}
            isIngesting={isIngesting}
          />
        )}
      </main>

      <FilterDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} filter={filter} onFilterChange={setFilter} />
      <ProductDetailModal deal={activeDetailDeal?.deal || null} rank={activeDetailDeal?.rank || 0} onClose={() => setActiveDetailDeal(null)} />
      <ShareDealModal deal={activeShareDeal} onClose={() => setActiveShareDeal(null)} />
      <WatchlistDrawer isOpen={isWatchlistOpen} onClose={() => setIsWatchlistOpen(false)} />
      <PriceAlertModal deal={activeAlertDeal} isOpen={Boolean(activeAlertDeal)} onClose={() => setActiveAlertDeal(null)} />

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
