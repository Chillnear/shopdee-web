'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, Flame, Sliders, Link as LinkIcon, Clipboard, Loader2, ArrowRight } from 'lucide-react';
import { SearchIntent } from '@/lib/ai/types';

interface HeroSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  aiIntent?: SearchIntent | null;
  onClearIntent?: () => void;
  onIngestUrl?: (url: string) => void;
  isIngesting?: boolean;
}

const NATURAL_SUGGESTIONS = [
  { label: '🍃 พัดลมเสียงเงียบ งบ 500', query: 'พัดลมตั้งโต๊ะ ทำงานเงียบ งบไม่เกิน 500' },
  { label: '🎧 หูฟังตัดเสียง งบ 1,000', query: 'หูฟังบลูทูธไร้สาย งบ 1000' },
  { label: '🐱 อาหารแมวพรีเมียม', query: 'อาหารแมวเกรดพรีเมียม' },
  { label: '⚡ สายชาร์จแท้ Shopee', query: 'สายชาร์จไอโฟนแท้ shopee' },
];

export function HeroSearch({
  searchQuery,
  onSearchChange,
  aiIntent,
  onClearIntent,
  onIngestUrl,
  isIngesting = false,
}: HeroSearchProps) {
  const [localInput, setLocalInput] = useState(searchQuery);

  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  // ตรวจสอบว่าข้อความที่พิมพ์เป็นลิงก์สินค้าหรือไม่
  const isUrl = /^(https?:\/\/)?([\w.-]+\.)?(shopee\.co\.th|shp\.ee|lazada\.co\.th|laz\.co\.th|tiktok\.com|shop\.tiktok\.com)\b/i.test(localInput.trim()) ||
                /^https?:\/\/.+/i.test(localInput.trim());

  const detectedPlatform = localInput.toLowerCase().includes('lazada') || localInput.toLowerCase().includes('laz.')
    ? 'Lazada'
    : localInput.toLowerCase().includes('tiktok')
    ? 'TikTok Shop'
    : 'Shopee';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim()) return;

    if (isUrl && onIngestUrl) {
      onIngestUrl(localInput.trim());
    } else {
      onSearchChange(localInput.trim());
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setLocalInput(text.trim());
          if ((text.startsWith('http://') || text.startsWith('https://')) && onIngestUrl) {
            onIngestUrl(text.trim());
          } else {
            onSearchChange(text.trim());
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSelectSuggestion = (q: string) => {
    setLocalInput(q);
    onSearchChange(q);
  };

  const handleClear = () => {
    setLocalInput('');
    onSearchChange('');
    if (onClearIntent) onClearIntent();
  };

  return (
    <div className="relative pt-6 pb-5 px-4 sm:px-6 bg-gradient-to-b from-orange-50/40 via-white to-transparent">
      <div className="max-w-3xl mx-auto text-center">
        
        {/* Minimalist Brand Title */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight mb-2">
          เทียบราคาจ่ายจริง <span className="text-shopee font-black">Shopee • Lazada • TikTok</span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto mb-4 font-normal">
          วางลิงก์สินค้า หรือพิมพ์ชื่อสินค้าเพื่อคำนวณราคาสุทธิและเทียบ 3 แอปทันที
        </p>

        {/* Floating Pill Search Bar (Modern Minimalist) */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-3">
          <div className={`relative flex items-center bg-white rounded-full border shadow-card hover:shadow-card-hover transition-all duration-200 pl-4 pr-1.5 py-1.5 ${
            isUrl ? 'border-shopee ring-3 ring-shopee/15' : 'border-neutral-300/80 focus-within:border-shopee focus-within:ring-3 focus-within:ring-shopee/15'
          }`}>
            {isUrl ? (
              <LinkIcon className="w-5 h-5 text-shopee shrink-0 mr-2.5 animate-pulse" />
            ) : (
              <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-2.5" />
            )}
            
            <input
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="วางลิงก์ Shopee/Lazada หรือพิมพ์ชื่อสินค้า เช่น พัดลมเงียบๆ งบ 500..."
              className="w-full py-2 text-sm sm:text-base text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-transparent font-medium"
              disabled={isIngesting}
            />

            {!localInput && (
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="hidden sm:inline-flex items-center gap-1 py-1.5 px-2.5 mr-1.5 text-xs text-neutral-500 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-full font-bold transition shrink-0"
                title="วางลิงก์จากคลิปบอร์ด"
              >
                <Clipboard className="w-3.5 h-3.5 text-neutral-500" />
                <span>วางลิงก์</span>
              </button>
            )}

            {localInput && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 mr-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isIngesting}
              className={`text-white font-bold px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all duration-200 shrink-0 shadow-xs flex items-center gap-1.5 ${
                isUrl
                  ? 'bg-shopee hover:bg-shopee-hover'
                  : 'bg-neutral-900 hover:bg-shopee'
              }`}
            >
              {isIngesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังดึง...</span>
                </>
              ) : isUrl ? (
                <>
                  <span>เทียบ 3 แอป</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <span>ค้นหา</span>
              )}
            </button>
          </div>
        </form>

        {/* Dynamic URL Detected Banner */}
        {isUrl && !isIngesting && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-shopee text-xs font-bold animate-fade-in shadow-xs mb-3">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ตรวจพบลิงก์สินค้า {detectedPlatform} — กดปุ่ม &quot;เทียบ 3 แอป&quot; เพื่อดึงราคาสดทันที ⚡</span>
          </div>
        )}

        {/* Ingesting Loading Progress Banner */}
        {isIngesting && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold animate-pulse shadow-xs mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>AI กำลังถอดรหัสลิงก์และคำนวณราคาจ่ายจริง 3 แอป (Shopee • Lazada • TikTok)...</span>
          </div>
        )}

        {/* Natural Language Suggestion Chips */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-neutral-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>แนะนำ:</span>
          </span>
          {NATURAL_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSelectSuggestion(s.query)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-100/80 hover:bg-orange-50 hover:text-shopee hover:border-orange-200 text-neutral-600 border border-neutral-200/60 font-medium transition-all"
            >
              {s.label}
            </button>
          ))}
          
          <button
            onClick={handlePasteClipboard}
            className="text-[11px] px-2.5 py-1 rounded-full bg-orange-50/80 hover:bg-orange-100 text-shopee border border-orange-200 font-bold transition-all flex items-center gap-1"
          >
            <Clipboard className="w-3 h-3" />
            <span>วางลิงก์สินค้า</span>
          </button>
        </div>

        {/* AI Intent Active Banner */}
        {aiIntent && (aiIntent.maxPrice || aiIntent.keyRequirements.length > 0 || aiIntent.category) && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {aiIntent.summaryThai}
            </span>
            <button
              onClick={handleClear}
              className="ml-1 text-emerald-600 hover:text-emerald-900 hover:underline text-[11px]"
            >
              ล้าง
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
