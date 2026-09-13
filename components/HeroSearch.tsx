'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Sparkles, 
  Link as LinkIcon, 
  Clipboard, 
  Loader2,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
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
  // Tab Mode: 'link' (วางลิงก์สินค้าเพื่อเทียบ) vs 'search' (พิมพ์ค้นหาชื่อสินค้า)
  const [activeTab, setActiveTab] = useState<'link' | 'search'>('link');
  const [localInput, setLocalInput] = useState(searchQuery);

  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  // ตรวจสอบว่าข้อความที่พิมพ์เป็นลิงก์หรือไม่
  const isUrl = /^(https?:\/\/)?([\w.-]+\.)?(shopee\.co\.th|shp\.ee|lazada\.co\.th|laz\.co\.th|tiktok\.com|shop\.tiktok\.com)\b/i.test(localInput.trim()) ||
                /^https?:\/\/.+/i.test(localInput.trim());

  // สลับแท็บอัตโนมัติหากผู้ใช้วาง URL ในแท็บค้นหา
  useEffect(() => {
    if (isUrl && activeTab !== 'link') {
      setActiveTab('link');
    }
  }, [isUrl, activeTab]);

  const detectedPlatform = localInput.toLowerCase().includes('lazada') || localInput.toLowerCase().includes('laz.')
    ? 'Lazada'
    : localInput.toLowerCase().includes('tiktok')
    ? 'TikTok Shop'
    : 'Shopee';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = localInput.trim();
    if (!trimmed) return;

    if (isUrl && onIngestUrl) {
      onIngestUrl(trimmed);
    } else {
      onSearchChange(trimmed);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        const trimmed = text?.trim();
        if (trimmed) {
          setLocalInput(trimmed);
          const isPastedUrl = /^(https?:\/\/)?([\w.-]+\.)?(shopee\.co\.th|shp\.ee|lazada\.co\.th|laz\.co\.th|tiktok\.com|shop\.tiktok\.com)\b/i.test(trimmed) || /^https?:\/\/.+/i.test(trimmed);
          if (isPastedUrl && onIngestUrl) {
            setActiveTab('link');
            onIngestUrl(trimmed);
          } else {
            onSearchChange(trimmed);
          }
        }
      }
    } catch {
      // fallback
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
    <div className="relative pt-6 pb-6 px-4 sm:px-6 bg-gradient-to-b from-orange-50/50 via-white to-transparent">
      <div className="max-w-3xl mx-auto text-center">
        
        {/* Minimalist Brand Title */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight mb-2">
          เทียบราคาจ่ายจริง <span className="text-shopee font-black">Shopee • Lazada • TikTok</span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto mb-5 font-normal">
          รวมโค้ดลดและค่าส่ง คำนวณราคาสุทธิที่ถูกและคุ้มค่าที่สุดในที่เดียว
        </p>

        {/* 1. Prominent Dual Mode Tabs: วางลิงก์ vs ค้นหาชื่อสินค้า */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-neutral-200/70 backdrop-blur-xs mb-3 shadow-inner max-w-md w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white text-shopee shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>วางลิงก์สินค้า (แอปใดก็ได้)</span>
            <span className="bg-shopee/10 text-shopee text-[10px] font-black px-1.5 py-0.2 rounded-full hidden sm:inline">
              แนะนำ
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>ค้นหาด้วยชื่อสินค้า</span>
          </button>
        </div>

        {/* 2. Main Search / Link Ingestion Form */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-3">
          <div className={`relative flex items-center bg-white rounded-full border shadow-md hover:shadow-lg transition-all duration-200 pl-4 pr-1.5 py-1.5 ${
            activeTab === 'link' || isUrl
              ? 'border-shopee/90 ring-3 ring-shopee/15'
              : 'border-neutral-300 focus-within:border-shopee focus-within:ring-3 focus-within:ring-shopee/15'
          }`}>
            {activeTab === 'link' || isUrl ? (
              <LinkIcon className="w-5 h-5 text-shopee shrink-0 mr-2.5 animate-pulse" />
            ) : (
              <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-2.5" />
            )}
            
            <input
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder={
                activeTab === 'link'
                  ? "วางลิงก์สินค้า 1 ลิงก์จาก Shopee, Lazada หรือ TikTok เพื่อเทียบ 3 แอปทันที..."
                  : "พิมพ์ชื่อสินค้า เช่น พัดลมตั้งโต๊ะ, หูฟังไร้สาย, อาหารแมว..."
              }
              className="w-full py-2 text-xs sm:text-base text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-transparent font-medium"
              disabled={isIngesting}
            />

            {/* Quick Paste Button (Always visible on empty) */}
            {!localInput && (
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="inline-flex items-center gap-1 py-1.5 px-2.5 mr-1.5 text-[11px] sm:text-xs text-shopee hover:text-white bg-orange-50 hover:bg-shopee rounded-full font-bold border border-orange-200 transition-all shrink-0 cursor-pointer shadow-2xs"
                title="วางจากคลิปบอร์ด"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>วางลิงก์ทันที</span>
              </button>
            )}

            {localInput && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 mr-1 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isIngesting}
              className={`text-white font-bold px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all duration-200 shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'link' || isUrl
                  ? 'bg-shopee hover:bg-shopee-hover active:scale-95'
                  : 'bg-neutral-900 hover:bg-shopee active:scale-95'
              }`}
            >
              {isIngesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังดึง...</span>
                </>
              ) : activeTab === 'link' || isUrl ? (
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

        {/* 3. Helper Context Bar based on Active Tab */}
        {activeTab === 'link' ? (
          /* Link Mode Help & Quick Samples */
          <div className="space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-center gap-3 text-[11px] text-neutral-500 flex-wrap font-medium">
              <span className="flex items-center gap-1 text-neutral-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>รองรับทุกลิงก์:</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-100/70 text-shopee font-bold">Shopee (shope.ee)</span>
              <span className="px-2 py-0.5 rounded bg-blue-100/70 text-lazada font-bold">Lazada (s.lazada.co.th)</span>
              <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-900 font-bold">TikTok Shop</span>
            </div>

            <p className="text-[11px] text-neutral-500 font-medium">
              วางลิงก์สินค้า 1 ลิงก์จากแอปใดก็ได้ แล้วระบบจะไปหาคู่เทียบและคำนวณราคาให้คุณอัตโนมัติ
            </p>
          </div>
        ) : (
          /* Search Mode Natural Suggestions */
          <div className="flex items-center justify-center gap-1.5 flex-wrap animate-fade-in">
            <span className="text-[11px] text-neutral-400 font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>ลองค้นหา:</span>
            </span>
            {NATURAL_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => handleSelectSuggestion(s.query)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-100/80 hover:bg-orange-50 hover:text-shopee hover:border-orange-200 text-neutral-600 border border-neutral-200/60 font-medium transition-all cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* 4. Live Detected URL Banner (When user pastes or types a link) */}
        {isUrl && !isIngesting && (
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/90 border border-orange-200 text-shopee text-xs font-bold animate-fade-in shadow-xs">
            <LinkIcon className="w-3.5 h-3.5" />
            <span>ตรวจพบลิงก์สินค้า {detectedPlatform} — กดปุ่ม &quot;เทียบ 3 แอป&quot; เพื่อดึงราคาสดทันที ⚡</span>
          </div>
        )}

        {/* 5. Ingesting Loading Progress Banner */}
        {isIngesting && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold animate-pulse shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>AI กำลังถอดรหัสลิงก์และคำนวณราคาจ่ายจริง 3 แอป (Shopee • Lazada • TikTok)...</span>
          </div>
        )}

        {/* 6. AI Intent Active Banner */}
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
