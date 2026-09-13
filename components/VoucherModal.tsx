'use client';

import React, { useState } from 'react';
import { X, Tag, Copy, Check, Sparkles, ExternalLink } from 'lucide-react';
import { ProductDeal } from '@/lib/types';
import { formatTHB, getSmartAffiliateUrl, getPlatformMeta } from '@/lib/engine';

interface VoucherModalProps {
  deal: ProductDeal | null;
  onClose: () => void;
}

export function VoucherModal({ deal, onClose }: VoucherModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!deal) return null;

  const platformMeta = getPlatformMeta(deal.platform);

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
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shadow-xs ${
              deal.platform === 'shopee'
                ? 'bg-shopee'
                : deal.platform === 'lazada'
                ? 'bg-lazada'
                : 'bg-black'
            }`}>
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900">คูปองสำหรับ {platformMeta.name}</h3>
              <p className="text-xs text-neutral-500">คัดลอกไปวางในหน้าชำระเงินของ {platformMeta.name}</p>
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
          <div className="text-xs font-bold text-neutral-500 flex items-center justify-between">
            <span>โค้ดที่สามารถใช้ได้กับสินค้านี้:</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${platformMeta.badgeColor}`}>
              ใช้บน {platformMeta.name}
            </span>
          </div>

          {deal.availableVouchers.map((v) => (
            <div 
              key={v.id}
              className={`p-3.5 rounded-xl border border-dashed flex items-center justify-between gap-3 ${
                deal.platform === 'shopee'
                  ? 'border-orange-300 bg-orange-50/40'
                  : deal.platform === 'lazada'
                  ? 'border-blue-300 bg-blue-50/40'
                  : 'border-neutral-300 bg-neutral-50/60'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`font-mono font-black text-sm bg-white px-2 py-0.5 rounded border shadow-xs ${
                    deal.platform === 'shopee'
                      ? 'text-shopee border-orange-200'
                      : deal.platform === 'lazada'
                      ? 'text-lazada border-blue-200'
                      : 'text-neutral-900 border-neutral-300'
                  }`}>
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
                    : deal.platform === 'shopee'
                    ? 'bg-shopee hover:bg-shopee-hover text-white shadow-xs'
                    : deal.platform === 'lazada'
                    ? 'bg-lazada hover:bg-lazada-accent text-white shadow-xs'
                    : 'bg-black hover:bg-neutral-800 text-white shadow-xs'
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

          {/* Stacking Formula & Usage Tip */}
          <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 space-y-2">
            <div className="font-bold flex items-center gap-1 text-neutral-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>วิธีใช้โค้ดส่วนลดใน {platformMeta.name}:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-600 pl-0.5 leading-relaxed">
              <li>กดปุ่ม <strong>"คัดลอกโค้ด"</strong> ที่ต้องการด้านบน</li>
              <li>กดปุ่มด้านล่าง <strong>"ไปสั่งซื้อบน {platformMeta.name}"</strong></li>
              <li>ในหน้าสรุปคำสั่งซื้อ / ชำระเงิน นำโค้ดไปวางในช่อง <strong>"โค้ดส่วนลด"</strong> ก่อนกดสั่งซื้อ</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            ราคาหลังโค้ด: <strong className={`font-black ${
              deal.platform === 'shopee'
                ? 'text-shopee'
                : deal.platform === 'lazada'
                ? 'text-lazada'
                : 'text-neutral-900'
            }`}>{formatTHB(deal.estimatedFinalPrice)}</strong>
          </span>

          <a
            href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition ${
              deal.platform === 'shopee'
                ? 'bg-shopee hover:bg-shopee-hover shadow-shopee/20'
                : deal.platform === 'lazada'
                ? 'bg-lazada hover:bg-lazada-accent shadow-lazada/20'
                : 'bg-black hover:bg-neutral-800 shadow-neutral-900/20'
            }`}
          >
            <span>ไปสั่งซื้อบน {platformMeta.name}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
