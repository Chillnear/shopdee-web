'use client';

import React from 'react';
import { Filter, SlidersHorizontal, Check, ArrowDownUp, ShieldCheck, Truck, Ticket, LayoutGrid, List } from 'lucide-react';
import { FilterState, Platform } from '@/lib/types';

interface SmartFilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  totalMatching: number;
  onOpenDrawer: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function SmartFilterBar({
  filter,
  onFilterChange,
  totalMatching,
  onOpenDrawer,
  viewMode,
  onViewModeChange,
}: SmartFilterBarProps) {

  // Platform selection handler
  const handlePlatformToggle = (platform: Platform | 'all') => {
    if (platform === 'all') {
      onFilterChange({
        ...filter,
        selectedPlatforms: ['shopee', 'lazada', 'tiktok'],
      });
      return;
    }

    const current = filter.selectedPlatforms;
    const isOnlySelected = current.length === 1 && current[0] === platform;

    onFilterChange({
      ...filter,
      selectedPlatforms: isOnlySelected ? ['shopee', 'lazada', 'tiktok'] : [platform],
    });
  };

  const isAllPlatforms = filter.selectedPlatforms.length === 3;

  // Active extra filters count
  const activeCount = [
    filter.onlyMall,
    filter.onlyFreeShipping,
    filter.hasVoucherOnly,
    filter.minAuthenticity > 0,
    filter.maxPrice !== null,
  ].filter(Boolean).length;

  return (
    <div className="bg-white border-b border-neutral-200 sticky top-16 z-30 shadow-sm transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5">
        
        {/* Row 1: Platform Chips & Limit Selectors */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Platform Tabs (Flex-wrap ensures Shopee, Lazada, TikTok are all visible without horizontal overflow) */}
          <div className="flex flex-wrap items-center gap-1.5 py-0.5">
            <span className="text-xs font-bold text-neutral-500 whitespace-nowrap mr-1 flex items-center gap-1">
              <span>แพลตฟอร์ม:</span>
            </span>

            {/* All Platforms */}
            <button
              onClick={() => handlePlatformToggle('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer ${
                isAllPlatforms
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <span>🌐 รวมทุกแอป</span>
            </button>

            {/* Shopee */}
            <button
              onClick={() => handlePlatformToggle('shopee')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border cursor-pointer ${
                filter.selectedPlatforms.includes('shopee') && !isAllPlatforms
                  ? 'bg-shopee text-white border-shopee shadow-md shadow-shopee/20'
                  : isAllPlatforms
                  ? 'bg-white text-neutral-800 border-neutral-200 hover:border-shopee/50 hover:bg-orange-50/50'
                  : 'bg-neutral-50 text-neutral-400 border-neutral-200 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#EE4D2D] inline-block"></span>
              <span>Shopee</span>
              {filter.selectedPlatforms.includes('shopee') && !isAllPlatforms && (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Lazada */}
            <button
              onClick={() => handlePlatformToggle('lazada')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border cursor-pointer ${
                filter.selectedPlatforms.includes('lazada') && !isAllPlatforms
                  ? 'bg-lazada text-white border-lazada shadow-md shadow-lazada/20'
                  : isAllPlatforms
                  ? 'bg-white text-neutral-800 border-neutral-200 hover:border-lazada/50 hover:bg-blue-50/50'
                  : 'bg-neutral-50 text-neutral-400 border-neutral-200 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0F146D] inline-block"></span>
              <span>Lazada</span>
              {filter.selectedPlatforms.includes('lazada') && !isAllPlatforms && (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>

            {/* TikTok */}
            <button
              onClick={() => handlePlatformToggle('tiktok')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border cursor-pointer ${
                filter.selectedPlatforms.includes('tiktok') && !isAllPlatforms
                  ? 'bg-gradient-to-r from-[#FE2C55] via-black to-[#25F4EE] text-white border-black shadow-md'
                  : isAllPlatforms
                  ? 'bg-white text-neutral-800 border-neutral-200 hover:border-black/50 hover:bg-neutral-100'
                  : 'bg-neutral-50 text-neutral-400 border-neutral-200 opacity-60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-black inline-block"></span>
              <span>TikTok Shop</span>
              {filter.selectedPlatforms.includes('tiktok') && !isAllPlatforms && (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Ranking Limit & Sorter Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            
            {/* View Mode Switcher: Grid (ช่อง) vs List (รายการ) */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="มุมมองแบบช่อง (Grid View)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ช่อง</span>
              </button>

              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="มุมมองแบบรายการ (List View)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">รายการ</span>
              </button>
            </div>

            {/* Limit Selector: Top 5, Top 10, Top 20, All */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
              <span className="text-neutral-500 font-bold px-1.5 hidden sm:inline">โชว์:</span>
              {[5, 10, 20, 30].map((num) => (
                <button
                  key={num}
                  onClick={() => onFilterChange({ ...filter, limit: num })}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    filter.limit === num
                      ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Top {num}
                </button>
              ))}
              <button
                onClick={() => onFilterChange({ ...filter, limit: 999 })}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filter.limit === 999
                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ทั้งหมด
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={filter.sortBy}
                onChange={(e) => onFilterChange({ ...filter, sortBy: e.target.value as any })}
                className="text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 py-2 pl-2.5 pr-7 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 cursor-pointer appearance-none"
              >
                <option value="popular">🔥 ยอดนิยม / ขายดี (แนะนำ)</option>
                <option value="best_discount">🏷️ ลดคุ้มสุด (%)</option>
                <option value="cheapest">💰 ราคาต่ำไปสูง</option>
                <option value="expensive">💎 ราคาสูงไปต่ำ</option>
                <option value="highest_trust">🛡️ ร้านทางการ (Mall)</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <ArrowDownUp className="w-3 h-3" />
              </div>
            </div>

            {/* Filter Drawer Toggle */}
            <button
              onClick={onOpenDrawer}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                activeCount > 0
                  ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-warm-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตัวกรอง</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-700 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeCount}
                </span>
              )}
            </button>

          </div>

        </div>

        {/* Row 2: Category Filter Bar */}
        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ทั้งหมด', label: '🔥 ทั้งหมด' },
            { id: 'พัดลม & เครื่องใช้ไฟฟ้า', label: '🔌 พัดลม & เครื่องใช้ไฟฟ้า' },
            { id: 'ไอที & แกดเจ็ต', label: '📱 ไอที & แกดเจ็ต' },
            { id: 'ของใช้ในบ้าน', label: '🏠 ของใช้ในบ้าน' },
            { id: 'สัตว์เลี้ยง', label: '🐱 สัตว์เลี้ยง' },
            { id: 'แม่และเด็ก', label: '👶 แม่และเด็ก' },
            { id: 'สกินแคร์ & บิวตี้', label: '💄 สกินแคร์ & บิวตี้' },
            { id: 'แฟชั่น', label: '👗 แฟชั่น & เครื่องประดับ' },
          ].map((cat) => {
            const isSelected = (filter.selectedCategory || 'ทั้งหมด') === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ ...filter, selectedCategory: cat.id })}
                className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-warm-100'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Row 3: Quick Filter Toggles */}
        <div className="mt-2 pt-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          
          <button
            onClick={() => onFilterChange({ ...filter, onlyMall: !filter.onlyMall })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0 cursor-pointer ${
              filter.onlyMall
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>เฉพาะร้านทางการ (Mall)</span>
          </button>

          <button
            onClick={() => onFilterChange({ ...filter, onlyFreeShipping: !filter.onlyFreeShipping })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0 cursor-pointer ${
              filter.onlyFreeShipping
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>ส่งฟรีเท่านั้น</span>
          </button>

          <button
            onClick={() => onFilterChange({ ...filter, hasVoucherOnly: !filter.hasVoucherOnly })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0 cursor-pointer ${
              filter.hasVoucherOnly
                ? 'bg-purple-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>มีโค้ดลดพร้อมใช้</span>
          </button>

          <div className="ml-auto text-[11px] font-semibold text-neutral-400 shrink-0">
            พบ {totalMatching} รายการ
          </div>

        </div>

      </div>
    </div>
  );
}
