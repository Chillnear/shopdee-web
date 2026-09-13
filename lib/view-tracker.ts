'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'shopdee_deal_views';

/** Deterministic string hash to generate realistic numbers per deal */
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Calculates a realistic base viewers count based on product popularity (soldCount)
 * and deal ID hash. Each product receives a unique, stable baseline (e.g. 8 - 48).
 */
export function getBaseViewersCount(dealId: string, soldCount: number = 0): number {
  const h = hashStr(dealId || 'deal');
  const variance = (h % 11) - 5; // -5 to +5 variance

  if (soldCount >= 5000) {
    return Math.max(25, 38 + variance + Math.min(15, Math.floor(soldCount / 2000)));
  }
  if (soldCount >= 1000) {
    return Math.max(16, 26 + variance);
  }
  if (soldCount >= 200) {
    return Math.max(10, 18 + variance);
  }
  return Math.max(6, 11 + variance);
}

/** Get real stored view count for a deal from localStorage */
export function getRealViewsCount(dealId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const views = JSON.parse(raw);
    return typeof views[dealId] === 'number' ? views[dealId] : 0;
  } catch {
    return 0;
  }
}

/** Record a new view for a deal and increment in localStorage */
export function recordDealView(dealId: string): number {
  if (typeof window === 'undefined' || !dealId) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const views: Record<string, number> = raw ? JSON.parse(raw) : {};
    const updated = (views[dealId] || 0) + 1;
    views[dealId] = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    // Notify other components if listening
    window.dispatchEvent(new CustomEvent('shopdee:deal_viewed', { detail: { dealId, count: updated } }));
    return updated;
  } catch {
    return 0;
  }
}

/**
 * Effective viewer count:
 * Combines baseline with real user clicks.
 * If real views exceed the base count, real views take over completely!
 */
export function getEffectiveViewersCount(dealId: string, soldCount: number = 0): number {
  const base = getBaseViewersCount(dealId, soldCount);
  const real = getRealViewsCount(dealId);
  // If real engagement exceeds the base, show real numbers!
  if (real > base) {
    return real;
  }
  // Otherwise, real clicks actively bump up the counter
  return base + real;
}

/**
 * React hook to manage and increment view count on deal detail open
 */
export function useDealViewers(dealId: string, soldCount: number = 0, shouldRecordOnMount: boolean = false) {
  const [viewers, setViewers] = useState<number>(() => getBaseViewersCount(dealId, soldCount));

  useEffect(() => {
    if (!dealId) return;

    if (shouldRecordOnMount) {
      recordDealView(dealId);
    }

    const current = getEffectiveViewersCount(dealId, soldCount);
    setViewers(current);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ dealId: string; count: number }>;
      if (customEvent.detail && customEvent.detail.dealId === dealId) {
        setViewers(getEffectiveViewersCount(dealId, soldCount));
      }
    };

    window.addEventListener('shopdee:deal_viewed', handleUpdate);
    return () => {
      window.removeEventListener('shopdee:deal_viewed', handleUpdate);
    };
  }, [dealId, soldCount, shouldRecordOnMount]);

  return viewers;
}
