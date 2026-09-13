/**
 * Tier 2: Paid/Affordable AI Provider (Gemini 2.0/1.5 Flash Lite or GPT Luna fallback)
 * เรียกใช้เมื่อโมเดลฟรีใน Tier 1 ล่ม, rate limit, หรือ timeout เกินกำหนด
 */

import { AIProvider, SearchIntent } from '../types';

interface PaidProviderConfig {
  apiKey?: string;
  timeoutMs?: number;
}

export function createGeminiIntentProvider(config?: PaidProviderConfig): AIProvider<string, SearchIntent> {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
  const timeoutMs = config?.timeoutMs || 3000;

  return {
    name: 'gemini-flash-lite',
    tier: 'paid',
    timeoutMs,
    async execute(rawQuery: string, signal: AbortSignal): Promise<SearchIntent> {
      if (!apiKey) {
        throw new Error('missing-gemini-api-key');
      }

      // ใช้ REST API ของ Gemini Generative Language (v1beta)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const systemInstruction = `You are a Thai shopping search intent parser for ShopDee.
Parse the user's shopping request into JSON:
{
  "cleanKeywords": ["main keyword"],
  "category": "appliances" | "it_gadgets" | "home_living" | "pets" | "mom_baby" | "beauty" | null,
  "maxPrice": number | null,
  "minPrice": number | null,
  "keyRequirements": ["waterproof", "quiet", etc in Thai],
  "preferredPlatform": "shopee" | "lazada" | "tiktok" | "all",
  "sortHint": "best_value" | "price_asc" | "popular",
  "summaryThai": "concise Thai intent summary"
}`;

      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\nUser query: ${rawQuery}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 300,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`gemini-provider-http-${res.status}`);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('empty-gemini-response');
      }

      const parsed = JSON.parse(text);
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
