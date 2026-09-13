'use client';

import React, { useState } from 'react';
import { X, Tag, Copy, Check, Sparkles, ExternalLink } from 'lucide-react';
import { ProductDeal } from '@/lib/types';
import { formatTHB, getSmartAffiliateUrl } from '@/lib/engine';

interface VoucherModalProps {
  deal: ProductDeal | null;
  onClose: () => void;
}

export function VoucherModal({ deal, onClose }: VoucherModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!deal) return null;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-orange-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">คูปอง & โค้ดส่วนลด</h3>
              <p className="text-xs text-neutral-500">คัดลอกไปวางในตะกร้าก่อนชำระเงิน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher List */}
        <div className="p-5 overflow-y-auto space-y-3">
          <div className="text-xs font-bold text-neutral-500">
            โค้ดที่สามารถใช้ได้กับสินค้านี้
          </div>

          {deal.availableVouchers.map((v) => (
            <div 
              key={v.id}
              className="p-3.5 rounded-xl border border-dashed border-orange-300 bg-orange-50/40 flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono font-black text-sm text-shopee bg-white px-2 py-0.5 rounded border border-orange-200 shadow-xs">
                    {v.code}
                  </span>
                  <span className="text-[10px] bg-neutral-200 text-neutral-700 font-bold px-1.5 py-0.5 rounded">
                    {v.tag}
                  </span>
                </div>
                <div className="font-bold text-xs text-neutral-800">{v.discountText}</div>
                <div className="text-[11px] text-neutral-500">
                  เมื่อช้อปขั้นต่ำ {formatTHB(v.minSpend)}
                </div>
              </div>

              <button
                onClick={() => handleCopy(v.code, v.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                  copiedId === v.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-shopee hover:bg-shopee-hover text-white shadow-xs'
                }`}
              >
                {copiedId === v.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกโค้ด</span>
                  </>
                )}
              </button>
            </div>
          ))}

          {/* Stacking Formula Tip */}
          <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 space-y-1">
            <div className="font-bold flex items-center gap-1 text-neutral-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>เคล็ดลับซ้อนโค้ด 3 ต่อ:</span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              1. ใส่ <strong>โค้ดร้านค้า</strong> ลดก่อน<br />
              2. ใส่ <strong>โค้ดแพลตฟอร์ม</strong> (Shopee/Lazada/TikTok)<br />
              3. ใช้ <strong>โค้ดส่งฟรี</strong> หรือเหรียญลดเพิ่มตอนกดชำระเงิน
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            ราคาหลังโค้ด: <strong className="text-shopee font-black">{formatTHB(deal.estimatedFinalPrice)}</strong>
          </span>

          <a
            href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-shopee hover:bg-shopee-hover text-white font-bold text-xs shadow-md shadow-shopee/20 flex items-center gap-1.5 transition"
          >
            <span>ไปใช้โค้ดในแอป</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
