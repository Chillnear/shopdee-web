'use client';

import React, { useState } from 'react';
import { Sparkles, Link as LinkIcon, Clipboard, ArrowRight, Loader2, RotateCcw, Search, ExternalLink } from 'lucide-react';

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
        const trimmed = text?.trim();
        if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('shopee') || trimmed.includes('lazada') || trimmed.includes('tiktok'))) {
          setPastedUrl(trimmed);
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
    const trimmed = pastedUrl.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    if (lower.includes('/search') || lower.includes('/catalog') || lower.includes('/tag/') || lower.includes('keyword=') || lower.includes('?q=')) {
      setPasteError('กรุณาวางลิงก์หน้าสินค้าโดยตรง (ไม่ใช่ลิงก์หน้าค้นหา) เพื่อให้ระบบวิเคราะห์ราคาและร้านค้าจริงได้ถูกต้อง');
      return;
    }

    onIngest({ url: trimmed });
  };

  const queryEnc = encodeURIComponent(searchQuery.trim());

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
        วางลิงก์หน้าสินค้าจริงจาก Shopee, Lazada หรือ TikTok Shop เพื่อให้ระบบดึงข้อมูลจากหน้าสินค้าและแสดงเฉพาะ direct URL ที่ตรวจสอบรูปแบบแล้ว
      </p>

      {/* Direct Link Ingestion Box */}
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
            placeholder="วางลิงก์หน้าสินค้า Shopee / Lazada / TikTok..."
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
                <span>ดึงข้อมูลสินค้า</span>
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

      {/* Honest Search Assistant (เปิดค้นหาในแอปจริง ไม่สร้างดีลปลอม) */}
      {searchQuery && (
        <div className="pt-5 border-t border-neutral-150 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 mb-1">
            <Search className="w-3.5 h-3.5 text-neutral-500" />
            <span>ค้นหาคำว่า "{searchQuery}" บนแพลตฟอร์มโดยตรง:</span>
          </div>
          <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
            เลือกเปิดค้นหาในแอป เมื่อเจอสินค้าที่ถูกใจ สามารถคัดลอกลิงก์หน้าสินค้านั้นมาวางในช่องด้านบนได้เลย
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={`https://shopee.co.th/search?keyword=${queryEnc}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/60 hover:bg-orange-100/70 text-neutral-800 text-xs font-bold flex items-center justify-between transition"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-shopee"></span>
                <span>Shopee</span>
              </div>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>

            <a
              href={`https://www.lazada.co.th/catalog/?q=${queryEnc}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-neutral-800 text-xs font-bold flex items-center justify-between transition"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lazada"></span>
                <span>Lazada</span>
              </div>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>

            <a
              href={`https://www.tiktok.com/search?q=${queryEnc}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-xs font-bold flex items-center justify-between transition"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-900"></span>
                <span>TikTok Shop</span>
              </div>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>
          </div>
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
