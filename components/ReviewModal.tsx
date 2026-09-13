'use client';

import React from 'react';
import { X, ShieldCheck, ThumbsUp, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProductDeal } from '@/lib/types';

interface ReviewModalProps {
  deal: ProductDeal | null;
  onClose: () => void;
}

export function ReviewModal({ deal, onClose }: ReviewModalProps) {
  if (!deal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold mb-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ระบบตรวจสอบรีวิวคนไทยแท้ (Anti-Bot)</span>
            </div>
            <h3 className="font-bold text-base text-neutral-900 line-clamp-1">
              {deal.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authenticity Summary Banner */}
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-600/20">
              {deal.thaiAuthenticityScore}%
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-900 block">ดัชนีความน่าเชื่อถือคนไทยแท้</span>
              <span className="text-[11px] text-emerald-700 leading-snug">
                {deal.authenticitySummary}
              </span>
            </div>
          </div>
        </div>

        {/* Review Samples */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            ตัวอย่างรีวิวจากผู้ใช้คนไทยจริง
          </div>

          {deal.reviews.map((r) => (
            <div key={r.id} className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-7 h-7 rounded-full bg-neutral-200 font-bold text-xs flex items-center justify-center text-neutral-700">
                    {r.author.charAt(0)}
                  </span>
                  <div>
                    <span className="font-bold text-xs text-neutral-800 block">{r.author}</span>
                    <span className="text-[10px] text-neutral-400">{r.date}</span>
                  </div>
                </div>

                <div className="flex items-center text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-neutral-700 leading-relaxed font-normal bg-white p-2.5 rounded-lg border border-neutral-150">
                "{r.comment}"
              </p>

              {r.isAuthenticThai && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ตรวจจับ: {r.authenticityNote}</span>
                </div>
              )}
            </div>
          ))}

          {/* Bot Warning Explanation Box */}
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>ระบบกรองบอทอย่างไร?</strong> ระบบของเราตรวจจับคำพูดภาษาไทยธรรมชาติ (เช่น การลากเสียง สแลง 555+) และคัดกรองรีวิว 5 ดาวปลอมที่แปลมาจากภาษาจีน เช่น "เพื่อนรัก สินค้าที่ดีเลิศ" ออกจากระบบ
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
