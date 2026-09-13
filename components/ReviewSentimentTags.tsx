'use client';

import React from 'react';
import { ReviewHighlight } from '@/lib/types';
import { Sparkles, ThumbsUp, AlertCircle, ShieldCheck } from 'lucide-react';

interface ReviewSentimentTagsProps {
  highlights?: ReviewHighlight[];
  thaiAuthenticityScore: number;
  onViewAllReviews?: () => void;
  reviewCount?: number;
}

export function ReviewSentimentTags({
  highlights,
  thaiAuthenticityScore,
  onViewAllReviews,
  reviewCount = 0,
}: ReviewSentimentTagsProps) {
  // Default highlights fallback if not specified
  const items: ReviewHighlight[] = highlights && highlights.length > 0 ? highlights : [
    { tag: 'ของแท้ตรงปก 100%', type: 'pro', percentage: 98 },
    { tag: 'แพ็คบับเบิ้ลหนาแน่น', type: 'pro', percentage: 95 },
    { tag: 'จัดส่งไวภายใน 24 ชม.', type: 'pro', percentage: 92 },
    { tag: 'กล่องอาจมีรอยยับเล็กน้อยจากการขนส่ง', type: 'con', percentage: 8 },
  ];

  return (
    <div className="bg-emerald-50/50 rounded-2xl p-3 sm:p-3.5 border border-emerald-200/80 shadow-2xs">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-200/60">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🤖</span>
          <span className="text-xs font-black text-emerald-950">
            AI สรุปจุดเด่นจากรีวิวคนไทยแท้
          </span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded">
            {thaiAuthenticityScore}% คนไทย
          </span>
        </div>

        {onViewAllReviews && (
          <button
            onClick={onViewAllReviews}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-0.5"
          >
            <span>อ่านรีวิวเต็ม ({reviewCount})</span>
          </button>
        )}
      </div>

      {/* Tag Chips Cloud */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => {
          const isPro = item.type === 'pro';
          return (
            <span
              key={index}
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border transition ${
                isPro
                  ? 'bg-white text-emerald-900 border-emerald-200 shadow-2xs'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {isPro ? (
                <ThumbsUp className="w-2.5 h-2.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
              )}
              <span>{item.tag}</span>
              <span className={`text-[10px] font-semibold ${isPro ? 'text-emerald-600' : 'text-amber-700'}`}>
                ({item.percentage}%)
              </span>
            </span>
          );
        })}
      </div>

    </div>
  );
}
