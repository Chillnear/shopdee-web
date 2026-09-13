'use client';

import React, { useState } from 'react';
import { ShieldCheck, Sparkles, TrendingDown, ExternalLink, BookmarkCheck, Bell, Share2 } from 'lucide-react';
import { useWatchlist } from '@/lib/watchlist';
import { ShareSiteModal } from './ShareSiteModal';

interface NavbarProps {
  onOpenWatchlist?: () => void;
}

export function Navbar({ onOpenWatchlist }: NavbarProps) {
  const { count } = useWatchlist();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-hero-gradient border-b border-white/20 shadow-lg transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="ShopDee Logo"
              className="w-10 h-10 rounded-xl shadow-md shadow-black/20 object-cover"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                  ShopDee
                </span>
                <span className="bg-white/20 text-white border border-white/30 text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-wider">
                  ช้อปดี
                </span>
              </div>
              <p className="text-[11px] text-orange-100 font-medium hidden sm:block">
                เทียบราคา 3 แพลตฟอร์ม • กรองบอทจีน • ช้อปของแท้ถูกจริง
              </p>
            </div>
          </div>

        {/* Right side actions: Watchlist & Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Watchlist Quick Button */}
          {onOpenWatchlist && (
            <button
              onClick={onOpenWatchlist}
              className={`py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                count > 0
                  ? 'bg-white/95 border-white text-emerald-800 shadow-sm hover:bg-white'
                  : 'bg-white/15 border-white/30 text-white hover:bg-white/25'
              }`}
              title="ดูดีลที่คุณติดตามไว้"
            >
              <BookmarkCheck className={`w-4 h-4 ${count > 0 ? 'text-emerald-600' : 'text-white'}`} />
              <span>ดีลที่ติดตาม</span>
              {count > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center ml-0.5">
                  {count}
                </span>
              )}
            </button>
          )}

          {/* Share Site Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center gap-1.5 bg-white/95 hover:bg-white text-brand-700 border border-white shadow-xs transition active:scale-95 cursor-pointer"
            title="แชร์บอกต่อเพื่อน"
          >
            <Share2 className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">บอกต่อเพื่อน</span>
          </button>

          {/* Platform Live Status */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 text-white border border-white/30">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>เทียบสด:</span>
            <span className="text-orange-100">Shopee</span>
            <span className="text-white/70">•</span>
            <span className="text-blue-100">Lazada</span>
            <span className="text-white/70">•</span>
            <span className="text-white">TikTok</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-white bg-white/15 border border-white/30 px-2.5 py-1.5 rounded-lg shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span className="hidden xs:inline font-semibold">ร้านแท้ 100%</span>
          </div>
        </div>

      </div>
    </header>

    <ShareSiteModal
      isOpen={isShareModalOpen}
      onClose={() => setIsShareModalOpen(false)}
    />
  </>
  );
}
