'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, ExternalLink, ArrowRight, Bell } from 'lucide-react';
import { getStoredWatchlist, TrackedDeal } from '@/lib/watchlist';
import { formatTHB } from '@/lib/engine';

interface PriceDropAlert {
  deal: TrackedDeal;
  currentPrice: number;
  savings: number;
}

interface PriceDropToastProps {
  onOpenWatchlist: () => void;
}

export function PriceDropToast({ onOpenWatchlist }: PriceDropToastProps) {
  const [alert, setAlert] = useState<PriceDropAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ตรวจสอบดีลใน Watchlist เมื่อผู้ใช้เข้าชมหน้าเว็บ
    const watchlist = getStoredWatchlist();
    if (watchlist.length === 0) return;

    for (const item of watchlist) {
      const currentPrice = Number(item.currentPrice);
      if (!Number.isFinite(currentPrice) || currentPrice > item.targetPrice) continue;

      const savings = item.targetPrice - currentPrice;
      setAlert({
        deal: item,
        currentPrice,
        savings,
      });

      // ยิง Web Notification หากผู้ใช้อนุญาตไว้
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🎉 ShopDee: ดีลที่ติดตามถึงราคาเป้าหมายแล้ว!', {
            body: `${item.title} ลดเหลือ ${formatTHB(currentPrice)} (ถูกกว่าเป้าหมาย ฿${savings})`,
            icon: item.imageUrl,
          });
        } catch {
          // ignore
        }
      }
      break; // แสดง 1 แจ้งเตือนแรกเพื่อไม่ให้รบกวนสายตา
    }
  }, []);

  if (!alert || dismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-2xl border border-neutral-800 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700">
          <img
            src={alert.deal.imageUrl}
            alt={alert.deal.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ถึงราคาเป้าหมายแล้ว!</span>
          </div>

          <h4 className="text-xs font-semibold text-neutral-100 truncate mb-1">
            {alert.deal.title}
          </h4>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm font-black text-white">
              {formatTHB(alert.currentPrice)}
            </span>
            <span className="text-[10px] text-neutral-400">
              (เป้าหมาย ฿{alert.deal.targetPrice.toLocaleString()})
            </span>
            {alert.savings > 0 && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded">
                ถูกกว่าเป้า ฿{alert.savings}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              setDismissed(true);
              onOpenWatchlist();
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-shopee hover:text-orange-400 transition"
          >
            <span>เปิดดูรายการใน Watchlist</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition shrink-0"
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
