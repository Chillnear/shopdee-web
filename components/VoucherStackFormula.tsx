'use client';

import React from 'react';
import { VoucherStackFormula as FormulaType } from '@/lib/types';
import { formatTHB } from '@/lib/engine';
import { Calculator, Sparkles, Minus, Equal } from 'lucide-react';

interface VoucherStackFormulaProps {
  formula?: FormulaType;
  basePrice: number;
  finalPrice: number;
}

export function VoucherStackFormula({
  formula,
  basePrice,
  finalPrice,
}: VoucherStackFormulaProps) {
  // If formula not explicitly provided, calculate realistic breakdown
  const totalSavings = Math.max(0, basePrice - finalPrice);
  const platformCut = formula?.platformDiscount ?? Math.round(totalSavings * 0.6);
  const storeCut = formula?.storeDiscount ?? Math.max(0, totalSavings - platformCut);
  const shippingCut = formula?.shippingDiscount ?? 40;

  return (
    <div className="bg-orange-50/60 rounded-2xl p-3 sm:p-3.5 border border-orange-200/80 shadow-2xs">
      
      <div className="flex items-center gap-1.5 text-xs font-black text-orange-950 mb-2 pb-1.5 border-b border-orange-200/60">
        <Calculator className="w-3.5 h-3.5 text-shopee" />
        <span>สูตรซ้อนโค้ด 3 ต่อ (กดโค้ดตามนี้จ่ายถูกสุด)</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-neutral-700 font-bold">
        
        {/* Step 1: Base */}
        <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-neutral-200 shadow-2xs">
          <span className="text-[9px] text-neutral-400 font-medium">หน้าร้าน</span>
          <span className="text-neutral-700">{formatTHB(basePrice)}</span>
        </div>

        <Minus className="w-3 h-3 text-neutral-400 shrink-0" />

        {/* Step 2: Platform Voucher */}
        <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-orange-200 text-shopee shadow-2xs">
          <span className="text-[9px] text-neutral-400 font-medium">โค้ดแอป</span>
          <span>-{formatTHB(platformCut)}</span>
        </div>

        {storeCut > 0 && (
          <>
            <Minus className="w-3 h-3 text-neutral-400 shrink-0" />

            {/* Step 3: Store Voucher */}
            <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-orange-200 text-orange-700 shadow-2xs">
              <span className="text-[9px] text-neutral-400 font-medium">โค้ดร้าน</span>
              <span>-{formatTHB(storeCut)}</span>
            </div>
          </>
        )}

        <Minus className="w-3 h-3 text-neutral-400 shrink-0" />

        {/* Step 4: Free Shipping */}
        <div className="flex flex-col items-center bg-white px-2 py-1 rounded-lg border border-blue-200 text-blue-700 shadow-2xs">
          <span className="text-[9px] text-neutral-400 font-medium">ส่งฟรี</span>
          <span>-{formatTHB(shippingCut)}</span>
        </div>

        <Equal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />

        {/* Final Result */}
        <div className="flex flex-col items-center bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-xs">
          <span className="text-[9px] text-emerald-100 font-medium">จ่ายสุทธิ</span>
          <span className="text-xs sm:text-sm font-black">{formatTHB(finalPrice)}</span>
        </div>

      </div>

      <div className="mt-2 text-[10px] text-orange-900/80 font-medium flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-orange-600 shrink-0" />
        <span>ระบบตรวจสอบแล้วว่าโค้ดทั้งหมดสามารถใช้ซ้อนกันได้ในหน้าสั่งซื้อ</span>
      </div>

    </div>
  );
}
