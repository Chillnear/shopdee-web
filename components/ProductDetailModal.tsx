'use client';

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  AlertTriangle, 
  Copy, 
  Check, 
  Tag, 
  Award, 
  Star,
  CheckCircle2,
  Bell,
  Flame,
  Share2
} from 'lucide-react';
import { ProductDeal, Platform } from '@/lib/types';
import { formatTHB, formatSoldCount, getPlatformMeta, getSmartAffiliateUrl } from '@/lib/engine';
import { StoreComparisonTable } from '@/components/StoreComparisonTable';
import { PriceTrendGraph } from '@/components/PriceTrendGraph';
import { ReviewSentimentTags } from '@/components/ReviewSentimentTags';
import { VoucherStackFormula } from '@/components/VoucherStackFormula';
import { localDealInsightProvider } from '@/lib/ai/providers/local-engine';
import { DealInsight } from '@/lib/ai/types';

interface ProductDetailModalProps {
  deal: ProductDeal | null;
  rank: number;
  onClose: () => void;
  onOpenPriceAlert?: (deal: ProductDeal) => void;
  onOpenShare?: (deal: ProductDeal) => void;
  selectedPlatform?: Platform | 'all';
}

export function ProductDetailModal({ 
  deal, 
  rank, 
  onClose, 
  onOpenPriceAlert,
  onOpenShare,
  selectedPlatform = 'all' 
}: ProductDetailModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [insight, setInsight] = useState<DealInsight | null>(null);

  React.useEffect(() => {
    if (deal) {
      localDealInsightProvider.execute(deal, new AbortController().signal).then(setInsight);
    }
  }, [deal]);

  if (!deal) return null;

  const platformMeta = getPlatformMeta(deal.platform);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-white font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Award className="w-3.5 h-3.5" />
              <span>อันดับ #{rank}</span>
            </span>
            <span className="text-xs font-bold text-neutral-600">เจาะลึกราคาและความปลอดภัย</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Main Product Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
              <img
                src={deal.imageUrl}
                alt={deal.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${platformMeta.badgeColor}`}>
                  {platformMeta.name}
                </span>
                {deal.storeType === 'mall' && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-red-600" />
                    <span>Mall แท้ 100%</span>
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm sm:text-base text-neutral-900 leading-snug line-clamp-2 mb-1.5">
                {deal.title}
              </h3>

              <div className="text-xs text-neutral-500 font-medium">
                ร้าน: <strong className="text-neutral-700">{deal.storeName}</strong> • ขายแล้ว {formatSoldCount(deal.soldCount)}
              </div>
            </div>
          </div>

          {/* AI Deal Value Insight Card */}
          {insight && (
            <div className="rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-neutral-50 via-white to-orange-50/20 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                    insight.verdict === 'excellent' ? 'bg-emerald-600' :
                    insight.verdict === 'good' ? 'bg-blue-600' :
                    insight.verdict === 'caution' ? 'bg-amber-600' : 'bg-neutral-700'
                  }`}>
                    {insight.score}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-900">{insight.verdictLabel}</span>
                      <span className="text-[10px] text-neutral-400 font-medium">({insight.score}/100)</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-medium">{insight.headline}</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                  AI วิเคราะห์
                </span>
              </div>

              {/* Highlights & Timing */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                {insight.keyHighlights.map((hl, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-neutral-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{hl}</span>
                  </div>
                ))}
                {insight.cautionPoints.map((cp, i) => (
                  <div key={`c-${i}`} className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{cp}</span>
                  </div>
                ))}
                <div className="text-[11px] text-neutral-600 font-medium bg-neutral-100/70 px-2.5 py-1.5 rounded-xl border border-neutral-200/60 mt-2">
                  <span>💡 {insight.priceAssessment.timingAdviceText}</span>
                </div>
              </div>
            </div>
          )}

          {/* Option Bait Warning */}
          {deal.hasOptionBait && deal.baitWarningNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">ดักจับราคาตัวเลือกหลอก (Option Bait):</span>
                <span className="text-amber-800 leading-normal">{deal.baitWarningNote}</span>
              </div>
            </div>
          )}

          {/* Trip.com Social Proof & Price Alert Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
              <span className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>{deal.activeViewersCount || 19} คนกำลังดูดีลนี้</span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenPriceAlert && (
                <button
                  onClick={() => onOpenPriceAlert(deal)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ตั้งเตือนราคาลด</span>
                </button>
              )}

              {onOpenShare && (
                <button
                  onClick={() => onOpenShare(deal)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-300 px-3 py-1.5 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>แชร์ดีล / บันทึกรูปการ์ด</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Review Sentiment Tags */}
          <ReviewSentimentTags
            highlights={deal.reviewHighlights}
            thaiAuthenticityScore={deal.thaiAuthenticityScore}
            reviewCount={deal.reviews.length}
          />

          {/* Price Trend Graph & Timing Advice */}
          <PriceTrendGraph
            history={deal.priceHistory}
            currentPrice={deal.estimatedFinalPrice}
            marketAvgPrice={deal.marketAvgPrice}
            advice={deal.priceAdvice}
            adviceNote={deal.priceAdviceNote}
            defaultExpanded={true}
          />

          {/* Intra-Platform & Cross-Platform Multi-Store Comparison Table */}
          {deal.stores && deal.stores.length > 0 ? (
            <StoreComparisonTable
              stores={deal.stores}
              dealTitle={deal.title}
              defaultPlatform={selectedPlatform}
              initiallyExpanded={true}
            />
          ) : (
            <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-600">
                <span>เปรียบเทียบราคา 3 แพลตฟอร์ม</span>
                <span className="text-[10px] text-emerald-600 font-semibold">อัปเดตเรียลไทม์</span>
              </div>

              <div className="space-y-1.5">
                {deal.priceComparisons.map((pc) => {
                  const isLowest = pc.platform === deal.platform;
                  const meta = getPlatformMeta(pc.platform);
                  return (
                    <div
                      key={pc.platform}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                        isLowest
                          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/30'
                          : 'bg-white border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isLowest ? 'bg-emerald-500' : 'bg-neutral-300'}`}></span>
                        <div>
                          <span className="font-bold text-xs text-neutral-800 block">{meta.name}</span>
                          <span className="text-[10px] text-neutral-400">{pc.storeName}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-black ${isLowest ? 'text-emerald-700' : 'text-neutral-800'}`}>
                            {formatTHB(pc.price)}
                          </span>
                          {isLowest && (
                            <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                              ถูกสุด ✅
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 block">
                          หลังโค้ด ~{formatTHB(pc.estimatedAfterVoucher)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voucher Stacking Formula (Trip.com Style) */}
          <VoucherStackFormula
            formula={deal.voucherStackFormula}
            basePrice={deal.basePrice}
            finalPrice={deal.estimatedFinalPrice}
          />

          {/* Thai Authenticity Review Proof */}
          <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <span>🇹🇭 รีวิวคนไทยแท้ {deal.thaiAuthenticityScore}%</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                ผ่านการตรวจกรองบอทจีน
              </span>
            </div>

            {deal.reviews.slice(0, 2).map((r) => (
              <div key={r.id} className="bg-white p-2.5 rounded-xl border border-emerald-150 text-xs text-neutral-700">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                  <span className="font-bold text-neutral-800">{r.author}</span>
                  <div className="flex text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 italic">"{r.comment}"</p>
              </div>
            ))}
          </div>

          {/* Available Vouchers with Copy Button */}
          {deal.availableVouchers.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-600 block">คูปองพร้อมใช้:</span>
              <div className="space-y-1.5">
                {deal.availableVouchers.map((v) => (
                  <div key={v.id} className="p-2.5 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-shopee">{v.code}</span>
                        <span className="text-[9px] bg-white px-1.5 py-0.2 rounded border border-orange-200 font-semibold">{v.tag}</span>
                      </div>
                      <span className="text-[11px] text-neutral-700 font-medium">{v.discountText}</span>
                    </div>

                    <button
                      onClick={() => handleCopy(v.code)}
                      className="px-2.5 py-1.5 rounded-lg bg-shopee text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                    >
                      {copiedCode === v.code ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sticky Footer CTA */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-neutral-400 block font-medium">ราคาหลังใช้โค้ด</span>
            <span className="text-xl sm:text-2xl font-black text-shopee tracking-tight">
              {formatTHB(deal.estimatedFinalPrice)}
            </span>
          </div>

          <a
            href={getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={`py-3 px-6 rounded-2xl font-extrabold text-sm text-white flex items-center gap-2 shadow-lg transition active:scale-95 ${
              deal.platform === 'shopee'
                ? 'bg-shopee hover:bg-shopee-hover shadow-shopee/25'
                : deal.platform === 'lazada'
                ? 'bg-lazada hover:bg-lazada-accent shadow-lazada/25'
                : 'bg-black hover:bg-neutral-800 shadow-neutral-900/25'
            }`}
          >
            <span>ไปสั่งซื้อบน {platformMeta.name}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
