import { useState, useEffect } from 'react';
import { ProductDeal, Platform } from './types';

export interface TrackedDeal {
  id: string;
  dealId: string;
  title: string;
  imageUrl: string;
  category: string;
  platform: Platform;
  currentPrice: number;
  initialPrice: number;
  targetPrice: number;
  marketAvgPrice?: number;
  affiliateUrl: string;
  savedAt: string;
  targetType: 'tier1' | 'tier2' | 'custom';
}

const WATCHLIST_STORAGE_KEY = 'shopdee_tracked_watchlist_v1';
const WATCHLIST_EVENT = 'shopdee_watchlist_changed';

/**
 * Get all tracked deals from localStorage
 */
export function getStoredWatchlist(): TrackedDeal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse watchlist:', err);
    return [];
  }
}

/**
 * Save tracked deals to localStorage and dispatch event
 */
function setStoredWatchlist(items: TrackedDeal[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(WATCHLIST_EVENT));
  } catch (err) {
    console.error('Failed to save watchlist:', err);
  }
}

/**
 * Add or update deal tracking in watchlist
 */
export function addOrUpdateTrackedDeal(
  deal: ProductDeal,
  targetPrice: number,
  targetType: 'tier1' | 'tier2' | 'custom' = 'tier1'
): TrackedDeal {
  const current = getStoredWatchlist();
  const existingIdx = current.findIndex((item) => item.dealId === deal.id);

  const entry: TrackedDeal = {
    id: `track-${deal.id}`,
    dealId: deal.id,
    title: deal.title,
    imageUrl: deal.imageUrl,
    category: deal.category,
    platform: deal.platform,
    currentPrice: deal.estimatedFinalPrice,
    initialPrice: existingIdx >= 0 ? current[existingIdx].initialPrice : deal.estimatedFinalPrice,
    targetPrice,
    marketAvgPrice: deal.marketAvgPrice,
    affiliateUrl: deal.affiliateUrl,
    savedAt: new Date().toISOString(),
    targetType,
  };

  if (existingIdx >= 0) {
    current[existingIdx] = entry;
  } else {
    current.unshift(entry);
  }

  setStoredWatchlist(current);
  return entry;
}

/**
 * Remove deal from watchlist
 */
export function removeTrackedDeal(dealId: string) {
  const current = getStoredWatchlist();
  const filtered = current.filter((item) => item.dealId !== dealId);
  setStoredWatchlist(filtered);
}

/**
 * Check if a deal is currently tracked
 */
export function isDealTracked(dealId: string): boolean {
  const current = getStoredWatchlist();
  return current.some((item) => item.dealId === dealId);
}

/**
 * React Hook to subscribe to Watchlist changes reactively
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<TrackedDeal[]>([]);

  useEffect(() => {
    // Initial load
    setWatchlist(getStoredWatchlist());

    const handleUpdate = () => {
      setWatchlist(getStoredWatchlist());
    };

    window.addEventListener(WATCHLIST_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(WATCHLIST_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    watchlist,
    count: watchlist.length,
    addTrackedDeal: addOrUpdateTrackedDeal,
    removeTrackedDeal,
    isDealTracked,
  };
}
