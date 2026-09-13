'use client';

import React, { useState } from 'react';
import { ProductDeal } from '@/lib/types';
import { formatTHB } from '@/lib/engine';
import { addOrUpdateTrackedDeal, isDealTracked } from '@/lib/watchlist';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck,
  TrendingDown,
  BookmarkCheck,
  Heart,
  Sliders
} from 'lucide-react';

interface PriceAlertModalProps {
  deal: ProductDeal | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenWatchlist?: () => void;
}

export function PriceAlertModal({
  deal,
  isOpen,
  onClose,
  onOpenWatchlist,
}: PriceAlertModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<'tier1' | 'tier2' | 'custom'>('tier1');
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);

  if (!isOpen || !deal) return null;

  const currentPrice = deal.estimatedFinalPrice;
  const target1 = Math.round(currentPrice * 0.9); // 10% lower
  const target2 = Math.round(currentPrice * 0.82); // 18% lower

  const getComputedTargetPrice = (): number => {
    if (selectedTarget === 'tier1') return target1;
    if (selectedTarget === 'tier2') return target2;
    const parsed = Number(customPriceInput);
    return parsed > 0 ? parsed : target1;
  };

  const handleSaveToWatchlist = async () => {
    const finalTarget = getComputedTargetPrice();
    addOrUpdateTrackedDeal(deal, finalTarget, selectedTarget);
    setIsSaved(true);

    // Request browser notification if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          setHasNotificationPermission(perm === 'granted');
        } catch {
          // ignore
        }
      } else {
        setHasNotificationPermission(Notification.permission === 'granted');
      }
    }
  };

  const handleResetAndClose = () => {
    setIsSaved(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-150 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                ติดตามราคาลด (Web Price Tracker)
              </h3>
              <p className="text-[11px] text-emerald-100">
                ระบบเฝ้าดูราคาอัตโนมัติบนเว็บ • บันทึกไว้ในเครื่องทันที
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Product Mini Banner */}
          <div className="flex gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <img 
              src={deal.imageUrl} 
              alt={deal.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-neutral-200" 
            />
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-neutral-900 line-clamp-1">
                {deal.title}
              </h4>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[11px] text-neutral-400">ราคาปัจจุบัน:</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatTHB(currentPrice)}
                </span>
                <span className="text-[10px] text-neutral-400 line-through">
                  {formatTHB(deal.marketAvgPrice)}
                </span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1">
                <span>เทียบราคา Shopee • Lazada • TikTok Shop</span>
              </div>
            </div>
          </div>

          {/* If already saved successfully */}
          {isSaved ? (
            <div className="space-y-4 py-2 animate-in fade-in zoom-in-95">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
                  <BookmarkCheck className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-emerald-950">
                  บันทึกการติดตามราคาเรียบร้อยแล้ว!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-xs mx-auto">
                  ระบบบนเว็บจะคอยตรวจราคาให้คุณทุกครั้งที่เปิดเข้ามาดู เมื่อราคาลดลงมาต่ำกว่า{' '}
                  <strong className="font-black text-emerald-900 underline">
                    {formatTHB(getComputedTargetPrice())}
                  </strong>{' '}
                  จะมีแถบแจ้งเตือนไฮไลท์สีเขียวให้ทันที
                </p>

                {hasNotificationPermission && (
                  <span className="inline-block text-[11px] text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md font-bold">
                    🔔 เปิดการแจ้งเตือนผ่านเบราว์เซอร์แล้ว
                  </span>
                )}
              </div>

              <div className="flex gap-2.5">
                {onOpenWatchlist && (
                  <button
                    onClick={() => {
                      handleResetAndClose();
                      onOpenWatchlist();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-extrabold transition shadow-md cursor-pointer"
                  >
                    ดูรายการที่ติดตามทั้งหมด
                  </button>
                )}
                <button
                  onClick={handleResetAndClose}
                  className="py-3 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          ) : (
            /* Target Price Selector */
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-700 block">
                เลือกเป้าหมายราคาที่คุณต้องการให้เตือน:
              </label>

              <div className="space-y-2">
                
                {/* Option 1: -10% */}
                <button
                  type="button"
                  onClick={() => setSelectedTarget('tier1')}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    selectedTarget === 'tier1'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedTarget === 'tier1' ? 'border-emerald-600 bg-emerald-600' : 'border-neutral-300'
                    }`}>
                      {selectedTarget === 'tier1' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                        <span>ลดลงมา 10% (แนะนำ)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold">ยอดนิยม</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        เมื่อราคาแตะที่ <strong className="text-emerald-700 font-extrabold">{formatTHB(target1)}</strong> (ประหยัดเพิ่ม ฿{currentPrice - target1})
                      </div>
                    </div>
                  </div>
                  <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>

                {/* Option 2: -18% Payday */}
                <button
                  type="button"
                  onClick={() => setSelectedTarget('tier2')}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                    selectedTarget === 'tier2'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedTarget === 'tier2' ? 'border-emerald-600 bg-emerald-600' : 'border-neutral-300'
                    }`}>
                      {selectedTarget === 'tier2' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                        <span>ลดลงมา 18% (ช่วง Payday / เลขเบิ้ล)</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        เมื่อราคาแตะที่ <strong className="text-emerald-700 font-extrabold">{formatTHB(target2)}</strong> (ประหยัดเพิ่ม ฿{currentPrice - target2})
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </button>

                {/* Option 3: Custom Price */}
                <button
                  type="button"
                  onClick={() => setSelectedTarget('custom')}
                  className={`w-full p-3 rounded-2xl border text-left transition flex flex-col gap-2 cursor-pointer ${
                    selectedTarget === 'custom'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedTarget === 'custom' ? 'border-emerald-600 bg-emerald-600' : 'border-neutral-300'
                      }`}>
                        {selectedTarget === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="font-bold text-xs text-neutral-900">
                        กำหนดราคาเป้าหมายเอง
                      </div>
                    </div>
                    <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                  </div>

                  {selectedTarget === 'custom' && (
                    <div className="pt-1 pl-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 font-bold">เตือนเมื่อต่ำกว่า:</span>
                        <input
                          type="number"
                          value={customPriceInput}
                          onChange={(e) => setCustomPriceInput(e.target.value)}
                          placeholder={`เช่น ${Math.round(currentPrice * 0.85)}`}
                          className="w-32 py-1 px-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono font-bold text-neutral-900"
                        />
                        <span className="text-xs text-neutral-500">บาท</span>
                      </div>
                    </div>
                  )}
                </button>

              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleSaveToWatchlist}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-98 cursor-pointer"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>บันทึกการติดตามราคาบนเว็บนี้</span>
                </button>

                <p className="text-[11px] text-neutral-400 text-center mt-2.5">
                  ✓ ไม่ต้องล็อกอิน • ข้อมูลถูกเก็บไว้ในเครื่องของคุณ ปลอดภัย 100%
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
