'use client';

import React, { useState } from 'react';
import { BookmarkCheck, Sparkles, X, Check, ArrowRight, Bell } from 'lucide-react';
import { useWatchlist } from '@/lib/watchlist';

interface LineOptinBannerProps {
  onOpenWatchlist?: () => void;
}

export function LineOptinBanner({ onOpenWatchlist }: LineOptinBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { count } = useWatchlist();

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-50 to-white border-2 border-emerald-500/30 p-4 sm:p-5 shadow-sm my-6">
      
      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-black/5 transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
            <BookmarkCheck className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Web Watchlist
              </span>
              <span className="text-xs font-bold text-neutral-700">บันทึกบนเครื่อง • ไม่ต้องสมัครสมาชิก</span>
            </div>

            <h4 className="font-extrabold text-base text-neutral-900 leading-snug">
              อยากรอราคาลงกว่านี้? กดปุ่ม "ตั้งเตือนราคาลด" ที่ตัวสินค้าได้เลย!
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">
              ระบบบนเว็บจะคอยตรวจราคา Shopee, Lazada และ TikTok ให้ เมื่อราคาดิ่งถึงเป้าจะมีแถบแจ้งเตือนบอกทันที
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 w-full sm:w-auto">
          {onOpenWatchlist ? (
            <button
              onClick={onOpenWatchlist}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>ดูดีลที่ติดตามอยู่ ({count} รายการ)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-xs font-bold text-emerald-700 bg-white border border-emerald-300 px-3 py-2 rounded-xl">
              ✓ ติดตามแล้ว {count} รายการ
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
