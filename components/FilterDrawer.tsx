'use client';

import React from 'react';
import { X, Check, RotateCcw, ShieldCheck, Sparkles, Truck, Ticket } from 'lucide-react';
import { FilterState, Platform } from '@/lib/types';
import { DEFAULT_FILTER_STATE } from '@/lib/engine';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
}

export function FilterDrawer({
  isOpen,
  onClose,
  filter,
  onFilterChange,
}: FilterDrawerProps) {
  if (!isOpen) return null;

  const handleReset = () => {
    onFilterChange({
      ...DEFAULT_FILTER_STATE,
      limit: filter.limit, // keep limit
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div 
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-shopee flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">ตัวกรองละเอียด</h3>
              <p className="text-xs text-neutral-500">ปรับแต่งการค้นหาให้ตรงใจคุณที่สุด</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          
          {/* Section: Platform Selection */}
          <div>
            <label className="font-bold text-neutral-900 block mb-2">
              เลือกแพลตฟอร์มที่ต้องการ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['shopee', 'lazada', 'tiktok'] as Platform[]).map((p) => {
                const isSelected = filter.selectedPlatforms.includes(p);
                const labels = {
                  shopee: '🟠 Shopee',
                  lazada: '🔵 Lazada',
                  tiktok: '⚫ TikTok',
                };
                return (
                  <button
                    key={p}
                    onClick={() => {
                      let updated: Platform[];
                      if (isSelected) {
                        if (filter.selectedPlatforms.length === 1) return; // prevent zero
                        updated = filter.selectedPlatforms.filter(x => x !== p);
                      } else {
                        updated = [...filter.selectedPlatforms, p];
                      }
                      onFilterChange({ ...filter, selectedPlatforms: updated });
                    }}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{labels[p]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Trust & Authenticity Threshold */}
          <div>
            <label className="font-bold text-neutral-900 block mb-1">
              ดัชนีรีวิวคนไทยแท้ (Thai Authenticity)
            </label>
            <p className="text-xs text-neutral-500 mb-3">คัดกรองรีวิวบอทจีน และภาษาแปลอัตโนมัติ</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'ไม่จำกัด', val: 0 },
                { label: '90%+ ขึ้นไป', val: 90 },
                { label: '95%+ แท้ชัวร์', val: 95 },
              ].map((tier) => (
                <button
                  key={tier.val}
                  onClick={() => onFilterChange({ ...filter, minAuthenticity: tier.val })}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                    filter.minAuthenticity === tier.val
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Shop & Shipping Badges */}
          <div>
            <label className="font-bold text-neutral-900 block mb-2">
              ประเภทผู้ขายและบริการ
            </label>
            <div className="space-y-2.5">
              
              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-neutral-800 text-xs block">เฉพาะร้านทางการ (Mall / Flagship)</span>
                    <span className="text-[11px] text-neutral-500">รับประกันของแท้ 100% มีประกันศูนย์</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={filter.onlyMall}
                  onChange={(e) => onFilterChange({ ...filter, onlyMall: e.target.checked })}
                  className="w-4 h-4 text-shopee rounded border-neutral-300 focus:ring-shopee"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-neutral-800 text-xs block">มีบริการส่งฟรี (Free Shipping)</span>
                    <span className="text-[11px] text-neutral-500">ไม่ต้องกังวลเรื่องค่าส่งแพงบวกเพิ่ม</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={filter.onlyFreeShipping}
                  onChange={(e) => onFilterChange({ ...filter, onlyFreeShipping: e.target.checked })}
                  className="w-4 h-4 text-shopee rounded border-neutral-300 focus:ring-shopee"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <Ticket className="w-5 h-5 text-purple-600" />
                  <div>
                    <span className="font-bold text-neutral-800 text-xs block">มีคูปอง/โค้ดลดพร้อมใช้</span>
                    <span className="text-[11px] text-neutral-500">มีโค้ดร้านค้าหรือโค้ดแพลตฟอร์มลดทันที</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={filter.hasVoucherOnly}
                  onChange={(e) => onFilterChange({ ...filter, hasVoucherOnly: e.target.checked })}
                  className="w-4 h-4 text-shopee rounded border-neutral-300 focus:ring-shopee"
                />
              </label>

            </div>
          </div>

          {/* Section: Max Budget Filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-neutral-900">งบประมาณสูงสุด</label>
              <span className="text-xs font-bold text-shopee">
                {filter.maxPrice ? `ไม่เกิน ${filter.maxPrice.toLocaleString()} บาท` : 'ไม่จำกัดงบ'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'ทุกราคา', val: null },
                { label: '500.-', val: 500 },
                { label: '1,000.-', val: 1000 },
                { label: '3,000.-', val: 3000 },
              ].map((b) => (
                <button
                  key={String(b.val)}
                  onClick={() => onFilterChange({ ...filter, maxPrice: b.val })}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition ${
                    filter.maxPrice === b.val
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างค่า</span>
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-shopee hover:bg-shopee-hover text-white font-bold text-sm shadow-md shadow-shopee/20 transition flex items-center justify-center gap-2"
          >
            <span>ดูผลลัพธ์ที่เลือก</span>
          </button>
        </div>

      </div>
    </div>
  );
}
