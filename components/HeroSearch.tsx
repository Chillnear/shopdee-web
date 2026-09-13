'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, Flame, Sliders } from 'lucide-react';
import { SearchIntent } from '@/lib/ai/types';

interface HeroSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  aiIntent?: SearchIntent | null;
  onClearIntent?: () => void;
}

const NATURAL_SUGGESTIONS = [
  { label: '🍃 พัดลมเสียงเงียบ งบ 500', query: 'พัดลมตั้งโต๊ะ ทำงานเงียบ งบไม่เกิน 500' },
  { label: '🎧 หูฟังตัดเสียง งบ 1,000', query: 'หูฟังบลูทูธไร้สาย งบ 1000' },
  { label: '🐱 อาหารแมวพรีเมียม', query: 'อาหารแมวเกรดพรีเมียม' },
  { label: '⚡ สายชาร์จแท้ Shopee', query: 'สายชาร์จไอโฟนแท้ shopee' },
];

export function HeroSearch({ searchQuery, onSearchChange, aiIntent, onClearIntent }: HeroSearchProps) {
  const [localInput, setLocalInput] = useState(searchQuery);

  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localInput);
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
          รวมโค้ดลดและค่าส่ง คำนวณราคาสุทธิที่ถูกและคุ้มค่าที่สุดในที่เดียว
        </p>

        {/* Floating Pill Search Bar (Modern Minimalist) */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto mb-3">
          <div className="relative flex items-center bg-white rounded-full border border-neutral-300/80 shadow-card hover:shadow-card-hover focus-within:border-shopee focus-within:ring-3 focus-within:ring-shopee/15 transition-all duration-200 pl-4 pr-1.5 py-1.5">
            <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-2.5" />
            
            <input
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="พิมพ์ชื่อสินค้า หรือบอกสเปก เช่น พัดลมเงียบๆ งบ 500..."
              className="w-full py-2 text-sm sm:text-base text-neutral-800 placeholder:text-neutral-400 focus:outline-none bg-transparent font-medium"
            />

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
              className="bg-neutral-900 hover:bg-shopee text-white font-bold px-5 py-2.5 rounded-full text-xs sm:text-sm transition-colors duration-200 shrink-0 shadow-xs"
            >
              ค้นหา
            </button>
          </div>
        </form>

        {/* Natural Language Suggestion Chips */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-neutral-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>ลองค้นหา:</span>
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
        </div>

        {/* AI Intent Active Banner (When natural search is triggered) */}
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
