'use client';

import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  Sparkles,
  Smartphone,
  Layers
} from 'lucide-react';
import { ProductDeal } from '@/lib/types';
import { formatTHB } from '@/lib/engine';

interface ShareDealModalProps {
  deal: ProductDeal | null;
  onClose: () => void;
}

export function ShareDealModal({ deal, onClose }: ShareDealModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [cardFormat, setCardFormat] = useState<'landscape' | 'square'>('landscape');
  const [captionPlatform, setCaptionPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | 'line'>('facebook');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!deal) return null;

  // Base URL resolution
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://shopdee.th';
  const affiliateRedirectUrl = `${origin}/api/redirect?dealId=${deal.id}&platform=${deal.platform}&url=${encodeURIComponent(deal.affiliateUrl)}`;
  const ogImageUrl = `${origin}/api/og/deal?dealId=${deal.id}${cardFormat === 'square' ? '&format=square' : ''}`;
  const saveAmount = Math.max(0, deal.marketAvgPrice - deal.estimatedFinalPrice);
  const discountPercent = Math.round(((deal.marketAvgPrice - deal.estimatedFinalPrice) / deal.marketAvgPrice) * 100);

  // Platform specific viral caption templates
  const captionTemplates: Record<'facebook' | 'instagram' | 'tiktok' | 'line', { title: string; caption: string; tip: string }> = {
    facebook: {
      title: 'Facebook Page / กลุ่มป้ายยา',
      tip: 'เหมาะสำหรับโพสต์เพจหรือแชร์ลงกลุ่มป้ายยา ชี้เป้าโค้ดซ้อน 4 ต่อ เพิ่มอัตราคลิกสูงสุด',
      caption: `🔥 ชี้เป้าโปรลับ! ${deal.title}
📉 เหลือเพียง ${formatTHB(deal.estimatedFinalPrice)} (จากราคาปกติ ${formatTHB(deal.marketAvgPrice)}) ประหยัดทันที ${formatTHB(saveAmount)}!

⚡ ทริคเก็บโค้ดซ้อน 4 ต่อ (ตรวจแล้วใช้ได้จริง):
1. คูปองส่วนลดร้านค้า: ${deal.storeName}
2. โค้ดลดแอป ${deal.platform.toUpperCase()}
3. โค้ดส่งฟรี 0 บาท
4. โบนัส/เหรียญสะสม

👉 สั่งซื้อด่วนก่อนโค้ดหมด:
${affiliateRedirectUrl}

#ShopDee #ช้อปดี #ชี้เป้าโปรถูก #ดีลเด็ด #ของดีบอกต่อ #${deal.platform === 'shopee' ? 'ShopeeTH' : deal.platform === 'lazada' ? 'LazadaTH' : 'TikTokShopTH'}`
    },
    instagram: {
      title: 'Instagram & Threads',
      tip: 'สไตล์ Aesthetic อารมณ์เพื่อนป้ายยาเพื่อน สั้นกระชับ ชี้เป้าลิงก์ใน Bio หรือ Story',
      caption: `แกรรร ลดโหดมากกก! 😭✨
${deal.title}
เหลือแค่ ${formatTHB(deal.estimatedFinalPrice)} เท่านั้น (ปกติ ${formatTHB(deal.marketAvgPrice)})

⚡ เช็คราคา 3 แอปแล้ว ร้านนี้ถูกและคุ้มสุด
พิกัดจิ้มลิงก์หน้า Bio หรือแคปรูปนี้ไปเสิร์ชได้เลยน้า 👆✨

🔗 ลิงก์ตรง: ${affiliateRedirectUrl}

#ของมันต้องมี #ป้ายยาของใช้ในบ้าน #ของดีบอกต่อ #รีวิวของแท้ #threads #igdeals`
    },
    tiktok: {
      title: 'TikTok / Reels (สคริปต์ 15 วิ + ตะกร้า)',
      tip: 'มีทั้งบทพูดเปิดคลิปฮุค 3 วินาที (3s Hook) + แคปชันปักหมุดตะกร้าเหลือง',
      caption: `🎙️ [สคริปต์พูดคลิปสั้น 15 วินาที]
(0-3s) "ใครกำลังจะซื้อ ${deal.title} หยุดดูก่อน! อย่าเพิ่งจ่ายราคาเต็ม"
(3-10s) "เพราะวันนี้ใน ShopDee เช็คมาให้แล้ว เหลือแค่ ${formatTHB(deal.estimatedFinalPrice)} จากปกติ ${formatTHB(deal.marketAvgPrice)} ลดซ้อน 4 ต่อ คุ้มมากกก"
(10-15s) "รีบกดตรงตะกร้าสีเหลืองซ้ายมือ หรือจิ้มลิงก์หน้าโปรไฟล์ด่วนเลย ก่อนโค้ดจะหมด!"

📌 [แคปชันใต้คลิป TikTok]:
ดีลเด็ดประจำวัน ลดเหลือ ${formatTHB(deal.estimatedFinalPrice)} (-${discountPercent}%) พิกัดในคลิปหรือหน้าไบโอ 👇
${affiliateRedirectUrl}

#tiktokป้ายยา #ของดีบอกต่อ #พิกัดของใช้ #ช้อปกันวันเงินออก #นายหน้าtiktok`
    },
    line: {
      title: 'LINE OA / แชทเพื่อน',
      tip: 'ฟอร์แมตสะอาดตา เหมาะสำหรับบรอดแคสต์ LINE Official Account หรือส่งให้คนสนิท',
      caption: `🟢 ดีลเด็ดลดแรง ประจำวันนี้!
📦 ${deal.title}
💰 พิเศษ ${formatTHB(deal.estimatedFinalPrice)} (ปกติ ${formatTHB(deal.marketAvgPrice)})
🔥 ประหยัดไป ${formatTHB(saveAmount)} (-${discountPercent}%)

🛒 สั่งซื้อพร้อมรับสิทธิ์โค้ดลดที่นี่:
${affiliateRedirectUrl}`
    }
  };

  const activeCaption = captionTemplates[captionPlatform].caption;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateRedirectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(activeCaption);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleShareLine = () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(affiliateRedirectUrl)}&text=${encodeURIComponent(activeCaption)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliateRedirectUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(activeCaption)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadImage = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch(ogImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ShopDee-${deal.id}-${cardFormat}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(ogImageUrl, '_blank');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-150 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>แชร์ดีล / แคปชัน Creator ไวรัล</span>
                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">
                  FB • IG • TikTok
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-sm">
                {deal.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* Format Selector Tabs */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>ขนาดรูปการ์ดดีล:</span>
            </span>

            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                onClick={() => setCardFormat('landscape')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                  cardFormat === 'landscape'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                1200x630 (FB / Twitter / LINE)
              </button>
              <button
                onClick={() => setCardFormat('square')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                  cardFormat === 'square'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                1:1 (IG / TikTok)
              </button>
            </div>
          </div>

          {/* Card Preview Box */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 shadow-inner group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImageUrl}
              alt="Social Deal Card Preview"
              className="w-full h-auto object-contain transition group-hover:scale-[1.01]"
              loading="lazy"
            />
            <div className="absolute bottom-3 right-3">
              <button
                onClick={handleDownloadImage}
                disabled={isGenerating}
                className="px-3.5 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg active:scale-95 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'กำลังสร้างรูป...' : 'บันทึกรูปนี้'}</span>
              </button>
            </div>
          </div>

          {/* Social Direct Share Buttons */}
          <div>
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2.5">
              แชร์ไปยังโซเชียลมีเดียทันที:
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {/* LINE */}
              <button
                onClick={handleShareLine}
                className="py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>แชร์เข้า LINE</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleShareFacebook}
                className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#0c63d4] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <span>โพสต์ Facebook</span>
              </button>

              {/* Twitter / X */}
              <button
                onClick={handleShareTwitter}
                className="py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <span>ทวีตบน X</span>
              </button>
            </div>
          </div>

          {/* Viral Caption Creator Studio */}
          <div className="space-y-3 pt-4 border-t border-neutral-150 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>ชุดแคปชันไวรัลสำหรับครีเอเตอร์ (สลับตามช่องทาง):</span>
              </span>
            </div>

            {/* Platform Caption Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl">
              <button
                onClick={() => setCaptionPlatform('facebook')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold transition text-center ${
                  captionPlatform === 'facebook'
                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                📘 Facebook
              </button>

              <button
                onClick={() => setCaptionPlatform('instagram')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold transition text-center ${
                  captionPlatform === 'instagram'
                    ? 'bg-white dark:bg-neutral-700 text-pink-600 dark:text-pink-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                📸 IG / Threads
              </button>

              <button
                onClick={() => setCaptionPlatform('tiktok')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold transition text-center ${
                  captionPlatform === 'tiktok'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                🎵 TikTok
              </button>

              <button
                onClick={() => setCaptionPlatform('line')}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold transition text-center ${
                  captionPlatform === 'line'
                    ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                💬 LINE
              </button>
            </div>

            {/* Hint for selected platform */}
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
              💡 {captionTemplates[captionPlatform].tip}
            </p>

            {/* Caption Text Box */}
            <div className="relative">
              <textarea
                readOnly
                rows={captionPlatform === 'tiktok' ? 6 : 5}
                value={activeCaption}
                className="w-full p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 font-sans resize-none select-all focus:outline-hidden"
              />
              <button
                onClick={handleCopyCaption}
                className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition active:scale-95"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกแคปชัน</span>
                  </>
                )}
              </button>
            </div>

            {/* Deep Link */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                  Smart Deep Link (ส่งไปแอป Shopee / Lazada โดยตรง):
                </span>
                <button
                  onClick={handleCopyLink}
                  className="text-[11px] text-orange-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-1"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-mono text-neutral-600 dark:text-neutral-300 select-all truncate">
                {affiliateRedirectUrl}
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-150 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between rounded-b-3xl">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>สร้างยอดขาย Affiliate อัตโนมัติ 0 บาท</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
