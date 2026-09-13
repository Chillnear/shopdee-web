'use client';

import React from 'react';
import { 
  X, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  TrendingDown, 
  BookmarkCheck, 
  ArrowRight,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { useWatchlist, TrackedDeal } from '@/lib/watchlist';
import { formatTHB, getPlatformMeta, getSmartAffiliateUrl } from '@/lib/engine';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WatchlistDrawer({ isOpen, onClose }: WatchlistDrawerProps) {
  const { watchlist, count, removeTrackedDeal } = useWatchlist();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-neutral-150 flex items-center justify-between bg-neutral-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-neutral-900 flex items-center gap-1.5">
                  <span>ดีลที่ฉันติดตาม</span>
                  <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {count}
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  ระบบบันทึกในเครื่อง • ตรวจราคาอัตโนมัติ
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {watchlist.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-extrabold text-base text-neutral-700">
                  ยังไม่มีดีลที่ติดตาม
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  กดปุ่มกระดิ่ง <span className="text-emerald-600 font-bold">"ตั้งเตือนราคาลด"</span> ที่สินค้าตัวใดก็ได้ เพื่อบันทึกราคาเป้าหมายที่คุณอยากได้
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 py-2 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
                >
                  เริ่มค้นหาดีลเลย
                </button>
              </div>
            ) : (
              watchlist.map((item: TrackedDeal) => {
                const platformMeta = getPlatformMeta(item.platform);
                const isTargetReached = item.currentPrice <= item.targetPrice;
                const priceDiff = item.currentPrice - item.targetPrice;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition space-y-3 ${
                      isTargetReached
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {/* Top Row: Image & Info */}
                    <div className="flex gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-neutral-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${platformMeta.badgeColor}`}>
                            {platformMeta.name}
                          </span>
                          {isTargetReached && (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>ถึงราคาเป้าแล้ว!</span>
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs text-neutral-900 line-clamp-1">
                          {item.title}
                        </h4>

                        {/* Price Details */}
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xs text-neutral-400">ปัจจุบัน:</span>
                          <span className="text-sm font-extrabold text-emerald-700">
                            {formatTHB(item.currentPrice)}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            (เป้า: <strong className="text-neutral-700">{formatTHB(item.targetPrice)}</strong>)
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeTrackedDeal(item.dealId)}
                        className="p-1 text-neutral-300 hover:text-rose-500 self-start transition cursor-pointer"
                        title="ลบออกจากการติดตาม"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Bottom Status & CTA */}
                    <div className="pt-2 border-t border-neutral-150 flex items-center justify-between gap-2">
                      <div className="text-[11px]">
                        {isTargetReached ? (
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                            <span>✓ ถูกกว่าเป้าหมาย</span>
                            <span className="underline">฿{Math.abs(priceDiff)}</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            รอราคาลดอีก ฿{priceDiff}
                          </span>
                        )}
                      </div>

                      <a
                        href={getSmartAffiliateUrl(item.affiliateUrl, item.platform, item.dealId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`py-1.5 px-3 rounded-xl text-xs font-extrabold text-white flex items-center gap-1 transition shadow-xs active:scale-95 ${
                          isTargetReached
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : item.platform === 'shopee'
                            ? 'bg-shopee hover:bg-shopee-hover'
                            : item.platform === 'lazada'
                            ? 'bg-lazada hover:bg-lazada-accent'
                            : 'bg-black hover:bg-neutral-800'
                        }`}
                      >
                        <span>ไปซื้อบน {platformMeta.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {watchlist.length > 0 && (
            <div className="p-4 border-t border-neutral-150 bg-neutral-50 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                รวมทั้งหมด <strong>{count}</strong> รายการ
              </span>
              <button
                onClick={onClose}
                className="py-2 px-4 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
