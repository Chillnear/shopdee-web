'use client';

import React, { useState } from 'react';
import { Sparkles, Link as LinkIcon, Clipboard, ArrowRight, Loader2, RotateCcw } from 'lucide-react';

interface EmptySearchCardProps {
  searchQuery: string;
  onClearFilters: () => void;
  onIngest: (payload: { url?: string; query?: string }) => Promise<void>;
  isIngesting: boolean;
}

export function EmptySearchCard({
  searchQuery,
  onClearFilters,
  onIngest,
  isIngesting,
}: EmptySearchCardProps) {
  const [pastedUrl, setPastedUrl] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.includes('shopee') || text.includes('lazada') || text.includes('tiktok'))) {
          setPastedUrl(text.trim());
          setPasteError(null);
        } else {
          setPasteError('ไม่พบลบล็อกหรือลิงก์สินค้าในคลิปบอร์ด');
        }
      }
    } catch {
      setPasteError('กรุณากดวางลิงก์ในช่องด้วยตนเอง');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim()) return;
    onIngest({ url: pastedUrl.trim() });
  };

  const handleGenerateFromQuery = () => {
    if (!searchQuery.trim()) return;
    onIngest({ query: searchQuery.trim() });
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-6 sm:p-8 text-center max-w-xl mx-auto my-8 animate-fade-in">
      
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 text-shopee flex items-center justify-center mx-auto mb-4 shadow-xs">
        <Sparkles className="w-7 h-7" />
      </div>

      <h3 className="font-black text-lg sm:text-xl text-neutral-900 mb-2">
        {searchQuery ? `ยังไม่มี "${searchQuery}" ในแคตตาล็อกระบบ` : 'ไม่พบสินค้าตามเงื่อนไขที่เลือก'}
      </h3>
      
      <p className="text-xs sm:text-sm text-neutral-500 mb-6 leading-relaxed max-w-md mx-auto">
        แต่ไม่ต้องกังวล! คุณสามารถวางลิงก์จาก Shopee, Lazada หรือ TikTok Shop เพื่อให้ระบบดึงข้อมูลและคำนวณราคาจ่ายจริง 3 แอปให้คุณได้ทันที
      </p>

      {/* Option 1: Direct Link Ingestion Box */}
      <form onSubmit={handleUrlSubmit} className="space-y-3 mb-6">
        <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-300 focus-within:border-shopee focus-within:bg-white focus-within:ring-2 focus-within:ring-shopee/20 transition-all p-1.5 pl-3">
          <LinkIcon className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
          
          <input
            type="url"
            value={pastedUrl}
            onChange={(e) => {
              setPastedUrl(e.target.value);
              setPasteError(null);
            }}
            placeholder="วางลิงก์ Shopee / Lazada / TikTok ตรงนี้..."
            className="w-full py-1.5 text-xs sm:text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-transparent font-medium"
            disabled={isIngesting}
          />

          <button
            type="button"
            onClick={handlePasteClipboard}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 rounded-xl transition text-[11px] font-bold flex items-center gap-1 shrink-0 mr-1"
            title="วางจากคลิปบอร์ด"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">วาง</span>
          </button>

          <button
            type="submit"
            disabled={!pastedUrl.trim() || isIngesting}
            className="bg-shopee hover:bg-shopee-hover disabled:bg-neutral-300 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            {isIngesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังดึง...</span>
              </>
            ) : (
              <>
                <span>เทียบราคา</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {pasteError && (
          <p className="text-[11px] text-rose-500 text-left pl-2">
            {pasteError}
          </p>
        )}
      </form>

      {/* Option 2: 1-Click AI On-Demand Comparison (if user typed a query) */}
      {searchQuery && (
        <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="text-xs text-neutral-600">
            <span className="font-bold text-neutral-800">ไม่มีลิงก์ในมือ?</span>
            <p className="text-[11px] text-neutral-400">ให้ AI สรุปราคากลางและเทียบ 3 แอปสำหรับคำนี้โดยตรง</p>
          </div>

          <button
            type="button"
            onClick={handleGenerateFromQuery}
            disabled={isIngesting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-shopee text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isIngesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังคำนวณ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>ค้นหาผ่าน AI ทันที</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Reset Filter Button */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-center gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 font-bold inline-flex items-center gap-1.5 py-2 px-4 rounded-xl transition cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>ล้างคำค้นหาและดูสินค้าทั้งหมด</span>
        </button>
      </div>

    </div>
  );
}
