/**
 * Tier 1: Free AI Provider (OpenRouter Free DeepSeek / Gemini Free)
 * ใช้งานโมเดลฟรีก่อนเสมอ พร้อม AbortController ตัดการเชื่อมต่อหากช้าเกิน 2,200ms
 */

import { AIProvider, SearchIntent } from '../types';

interface FreeProviderConfig {
  model?: string;
  timeoutMs?: number;
  apiKey?: string;
}

export function createFreeIntentProvider(config?: FreeProviderConfig): AIProvider<string, SearchIntent> {
  const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || '';
  const model = config?.model || 'deepseek/deepseek-chat:free';
  const timeoutMs = config?.timeoutMs || 2200;

  return {
    name: `free-${model}`,
    tier: 'free',
    timeoutMs,
    async execute(rawQuery: string, signal: AbortSignal): Promise<SearchIntent> {
      if (!apiKey) {
        throw new Error('missing-free-api-key');
      }

      const promptSystem = `คุณคือ AI คัดแยก Intent สำหรับการค้นหาสินค้าใน ShopDee (Shopee/Lazada/TikTok ประเทศไทย)
วิเคราะห์ข้อความค้นหาของผู้ใช้ แล้วตอบกลับเป็น JSON เท่านั้นในรูปแบบ:
{
  "cleanKeywords": ["คำค้นหาหลักตัดคำฟุ่มเฟือยออก"],
  "category": "appliances" | "it_gadgets" | "home_living" | "pets" | "mom_baby" | "beauty" | null,
  "maxPrice": number | null,
  "minPrice": number | null,
  "keyRequirements": ["คุณสมบัติที่ต้องการ เช่น เสียงเงียบ, ไร้สาย"],
  "preferredPlatform": "shopee" | "lazada" | "tiktok" | "all",
  "sortHint": "best_value" | "price_asc" | "popular",
  "summaryThai": "สรุปสั้นๆ 1 ประโยค เช่น กำลังหาพัดลมตั้งโต๊ะเงียบ งบ 500 บาท"
}`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://shopdee.app',
          'X-Title': 'ShopDee Smart Search',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: promptSystem },
            { role: 'user', content: rawQuery },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        throw new Error(`free-provider-http-${res.status}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('empty-free-response');
      }

      const parsed = JSON.parse(content);
      return {
        rawQuery,
        cleanKeywords: Array.isArray(parsed.cleanKeywords) && parsed.cleanKeywords.length > 0 
          ? parsed.cleanKeywords 
          : [rawQuery.trim()],
        category: parsed.category || undefined,
        maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : undefined,
        minPrice: typeof parsed.minPrice === 'number' ? parsed.minPrice : undefined,
        keyRequirements: Array.isArray(parsed.keyRequirements) ? parsed.keyRequirements : [],
        preferredPlatform: parsed.preferredPlatform || 'all',
        sortHint: parsed.sortHint || 'best_value',
        summaryThai: parsed.summaryThai || `ค้นหา "${rawQuery}"`,
      };
    },
  };
}
