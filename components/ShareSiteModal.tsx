'use client';

import React, { useState } from 'react';
import { X, Share2, Copy, Check, Sparkles, Smartphone } from 'lucide-react';

interface ShareSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSiteModal({ isOpen, onClose }: ShareSiteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://shopdee.th';
  const siteUrl = origin;

  const viralInviteCaption = `🔥 ใครชอบช้อปออนไลน์ต้องลองเว็บนี้! "ShopDee (ช้อปดี)"
เทียบราคา Shopee • Lazada • TikTok Shop ในที่เดียว
✨ คำนวณราคาจ่ายจริงหลังหักโค้ดลดและค่าส่ง
🚫 มีระบบดักราคาหลอก & กรองรีวิวบอทจีน
👉 เข้าใช้ฟรี ไม่ต้องสมัครสมาชิก: ${siteUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(viralInviteCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleShareLine = () => {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(viralInviteCaption)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-150 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="ShopDee App Icon"
              className="w-10 h-10 rounded-2xl shadow-md shadow-orange-500/20 object-cover"
            />
            <div>
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>บอกต่อเพื่อน / แชร์ ShopDee</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  ใช้ฟรี 100%
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                ส่งต่อให้เพื่อนช้อปฉลาด ไม่โดนหลอกราคา
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
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Brand OG Visual Banner */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-md">
            <img
              src="/og-cover.png"
              alt="ShopDee Social Preview"
              className="w-full h-auto object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>ระบบเทียบราคา 3 แอปเรียลไทม์</span>
            </div>
          </div>

          {/* Social Direct Share Buttons */}
          <div>
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2.5">
              แชร์เข้าแอปโซเชียลทันที:
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleShareLine}
                className="py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <span>แชร์เข้า LINE แชท/กลุ่ม</span>
              </button>

              <button
                onClick={handleShareFacebook}
                className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#0c63d4] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
              >
                <span>โพสต์ Facebook</span>
              </button>
            </div>
          </div>

          {/* Caption Box */}
          <div className="space-y-2 pt-2 border-t border-neutral-150 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                ข้อความชวนเพื่อน (คัดลอกไปโพสต์ได้เลย):
              </span>
              <button
                onClick={handleCopyCaption}
                className="text-xs text-orange-600 dark:text-orange-400 font-extrabold hover:underline flex items-center gap-1"
              >
                {copiedCaption ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">คัดลอกข้อความแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกข้อความ</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={viralInviteCaption}
              className="w-full p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 font-sans resize-none select-all focus:outline-hidden"
            />
          </div>

          {/* Quick URL Copy */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                ลิงก์เว็บไซต์ ShopDee:
              </span>
              <button
                onClick={handleCopyLink}
                className="text-xs text-orange-600 dark:text-orange-400 font-extrabold hover:underline flex items-center gap-1"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-700 dark:text-neutral-300 select-all truncate">
              {siteUrl}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-150 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/80 flex items-center justify-between rounded-b-3xl">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>ติดตั้งเป็น PWA บนหน้าจอมือถือได้ทันที</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
}
