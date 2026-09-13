'use client';

import React, { useState } from 'react';
import { PricePoint, PriceAdviceType } from '@/lib/types';
import { formatTHB } from '@/lib/engine';
import { TrendingDown, Sparkles, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface PriceTrendGraphProps {
  history?: PricePoint[];
  currentPrice: number;
  marketAvgPrice: number;
  advice?: PriceAdviceType;
  adviceNote?: string;
  defaultExpanded?: boolean;
}

export function PriceTrendGraph({
  history,
  currentPrice,
  marketAvgPrice,
  advice = 'buy_now',
  adviceNote,
  defaultExpanded = false,
}: PriceTrendGraphProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);

  // Fallback 30-day mock history if not provided
  const data: PricePoint[] = history && history.length > 0 ? history : [
    { date: '30 วันก่อน', price: Math.round(marketAvgPrice * 1.08) },
    { date: '20 วันก่อน', price: marketAvgPrice },
    { date: '14 วันก่อน', price: Math.round(marketAvgPrice * 0.95) },
    { date: '7 วันก่อน', price: Math.round(marketAvgPrice * 0.92) },
    { date: 'เมื่อวาน', price: Math.round(currentPrice * 1.05) },
    { date: 'วันนี้', price: currentPrice },
  ];

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // SVG dimensions
  const width = 320;
  const height = 90;
  const paddingX = 20;
  const paddingY = 16;

  // Generate SVG path points
  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
    // Invert y: highest price at top, lowest price at bottom
    const y = height - paddingY - ((d.price - minPrice) / priceRange) * (height - paddingY * 2);
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Fill area under path
  const areaD = `${pathD} L ${points[points.length - 1].x},${height - 4} L ${points[0].x},${height - 4} Z`;

  // Advice UI Styling
  const getAdviceConfig = (type: PriceAdviceType) => {
    switch (type) {
      case 'buy_now':
        return {
          badge: 'ถูกที่สุดในรอบ 30 วัน ซื้อได้เลย! 🟢',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          textColor: 'text-emerald-700',
          icon: Sparkles,
          defaultNote: 'ราคาตอนนี้ต่ำกว่าค่าเฉลี่ยตลาด 15-25% เป็นจังหวะซื้อที่คุ้มที่สุด ณ เวลานี้',
        };
      case 'wait_for_sale':
        return {
          badge: 'ราคากลางปกติ แนะนำรอแคมเปญ 🟡',
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
          textColor: 'text-amber-800',
          icon: Clock,
          defaultNote: 'อีกไม่กี่วันจะมีแคมเปญ Payday/Double Day คาดการณ์โค้ดลดเพิ่มอีก ฿50-฿150',
        };
      case 'fair_price':
      default:
        return {
          badge: 'ราคามาตรฐานคุ้มค่า 🔵',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
          textColor: 'text-blue-700',
          icon: TrendingDown,
          defaultNote: 'ราคาสมเหตุสมผลสำหรับของแท้ศูนย์ไทย',
        };
    }
  };

  const adviceConfig = getAdviceConfig(advice);
  const AdviceIcon = adviceConfig.icon;

  return (
    <div className="bg-neutral-50 rounded-2xl p-3 sm:p-3.5 border border-neutral-200/90 shadow-2xs">
      
      {/* Top Banner: Advice & Toggle Button */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between gap-2 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${adviceConfig.badgeBg}`}>
            <AdviceIcon className="w-3.5 h-3.5" />
            <span>{adviceConfig.badge}</span>
          </span>
          <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline truncate">
            {adviceNote || adviceConfig.defaultNote}
          </span>
        </div>

        <button 
          className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded hover:bg-neutral-200/70 transition"
        >
          <span>{isExpanded ? 'ซ่อนกราฟ' : 'ดูกราฟประวัติราคา'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Chart View */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-neutral-200/80 animate-in fade-in duration-200">
          
          <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
            <span className="font-bold flex items-center gap-1 text-neutral-700">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>แนวโน้มราคาย้อนหลัง 30 วัน</span>
            </span>
            <span>
              {hoveredPoint ? (
                <strong className="text-emerald-700 font-extrabold">
                  {hoveredPoint.date}: {formatTHB(hoveredPoint.price)}
                </strong>
              ) : (
                <span>แตะที่จุดบนกราฟเพื่อดูราคา</span>
              )}
            </span>
          </div>

          {/* SVG Trend Line Chart */}
          <div className="relative w-full overflow-hidden rounded-xl bg-white p-2 border border-neutral-200">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-24 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Shaded Area */}
              <path d={areaD} fill="url(#priceGradient)" />

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#f1f5f9" strokeDasharray="3 3" />

              {/* Trend Stroke Line */}
              <path 
                d={pathD} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Interactive Points */}
              {points.map((pt, idx) => {
                const isCurrent = idx === points.length - 1;
                const isHovered = hoveredPoint?.date === pt.date;

                return (
                  <g key={pt.date} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt)}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : isCurrent ? 5 : 3.5}
                      fill={isCurrent ? '#059669' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150"
                    />
                    {isCurrent && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="9"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        className="animate-ping opacity-60"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Date Labels below chart */}
            <div className="flex justify-between text-[9px] text-neutral-400 font-medium px-2 pt-1">
              <span>30 วันก่อน</span>
              <span>14 วันก่อน</span>
              <span className="text-emerald-700 font-bold">วันนี้ (ถูกสุด)</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-1.5 rounded-lg bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block">ต่ำสุด 30 วัน</span>
              <span className="font-black text-emerald-700">{formatTHB(minPrice)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block">ราคากลาง</span>
              <span className="font-bold text-neutral-700">{formatTHB(marketAvgPrice)}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block">ประหยัดได้</span>
              <span className="font-black text-rose-600">
                ~{formatTHB(marketAvgPrice - currentPrice)}
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
