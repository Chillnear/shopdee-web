/**
 * Mimi Coach LiteLLM Provider for ShopDee
 * เชื่อมต่อ Gateway ภายในองค์กรผ่าน LiteLLM API (https://scgc-ailylab-eco.scg.com)
 * โมเดลหลัก: gemini-3.1-flash-lite-preview (เร็วและประหยัดที่สุด)
 * โมเดลสำรอง: gpt-5.6-luna
 */

import { AIProvider, SearchIntent } from '../types';

interface MimiProviderOptions {
  model?: string;
  timeoutMs?: number;
  tier?: 'free' | 'paid';
}

export function createMimiIntentProvider(options?: MimiProviderOptions): AIProvider<string, SearchIntent> {
  const model = options?.model || process.env.MIMI_PRIMARY_MODEL || 'gemini-3.1-flash-lite-preview';
  const timeoutMs = options?.timeoutMs || 2500;
  const baseUrl = process.env.MIMI_BASE_URL || 'https://scgc-ailylab-eco.scg.com';
  const token = process.env.MIMI_TOKEN || '';

  return {
    name: `mimi-${model}`,
    tier: options?.tier || 'free',
    timeoutMs,
    async execute(rawQuery: string, signal: AbortSignal): Promise<SearchIntent> {
      if (!token) {
        throw new Error('missing-mimi-token');
      }

      const promptSystem = `You are a Thai e-commerce search intent parser for ShopDee.
Analyze the user's shopping request and return ONLY JSON matching:
{
  "cleanKeywords": ["main search keywords without conversational filler"],
  "category": "เครื่องใช้ไฟฟ้า" | "ไอที & แกดเจ็ต" | "ของใช้ในบ้าน" | "สัตว์เลี้ยง" | "แม่และเด็ก" | "สกินแคร์ & บิวตี้" | null,
  "maxPrice": number | null,
  "minPrice": number | null,
  "keyRequirements": ["waterproof", "quiet", etc in Thai],
  "preferredPlatform": "shopee" | "lazada" | "tiktok" | "all",
  "sortHint": "best_value" | "price_asc" | "popular",
  "summaryThai": "concise 1-sentence Thai intent summary"
}`;

      const res = await fetch(`${baseUrl}/api/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: promptSystem },
            { role: 'user', content: rawQuery },
          ],
          temperature: 0.1,
          max_tokens: 250,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`mimi-http-${res.status}: ${errorText.slice(0, 100)}`);
      }

      const json = await res.json();
      let content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('empty-mimi-response');
      }

      // ทำความสะอาดหาก LLM ตอบกลับมาพร้อม markdown code fence ```json ... ```
      content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

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
