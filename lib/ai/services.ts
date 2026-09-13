/**
 * ShopDee AI Services Instance
 * จัดลำดับ AI Engine:
 * 1. Mimi Coach: gemini-3.1-flash-lite-preview (เร็วที่สุด ~1.0s)
 * 2. Mimi Coach: gpt-5.6-luna (วิเคราะห์ละเอียด / สำรอง)
 * 3. Local Heuristic Engine (1-5ms รับประกันไม่ล่ม 100%)
 */

import { AIRouter } from './router';
import { SearchIntent, DealInsight, AIResult } from './types';
import { createMimiIntentProvider } from './providers/mimi-provider';
import { localSearchProvider } from './providers/local-engine';
import { ProductDeal } from '../types';

// 1. Search Intent Router: Mimi Coach LiteLLM -> Local Engine Baseline
export const searchIntentRouter = new AIRouter<string, SearchIntent>({
  providers: [
    createMimiIntentProvider({
      model: process.env.MIMI_PRIMARY_MODEL || 'gemini-3.1-flash-lite-preview',
      tier: 'free',
      timeoutMs: 2500,
    }),
    createMimiIntentProvider({
      model: process.env.MIMI_SECONDARY_MODEL || 'gpt-5.6-luna',
      tier: 'paid',
      timeoutMs: 3500,
    }),
    localSearchProvider, // 100% Guaranteed Offline Baseline
  ],
  validate: (out) => Array.isArray(out.cleanKeywords) && out.cleanKeywords.length > 0,
});

/** ฟังก์ชันสำหรับเรียกค้นหา Intent อัจฉริยะ */
export async function parseSearchIntent(rawQuery: string): Promise<AIResult<SearchIntent>> {
  if (!rawQuery || !rawQuery.trim()) {
    return {
      data: {
        rawQuery: '',
        cleanKeywords: [],
        keyRequirements: [],
        preferredPlatform: 'all',
        sortHint: 'best_value',
        summaryThai: '',
      },
      meta: {
        tier: 'local',
        provider: 'noop',
        latencyMs: 0,
        confidence: 1.0,
        degraded: false,
      },
    };
  }

  return searchIntentRouter.run(rawQuery);
}

/**
 * Deal scoring is intentionally unavailable until every input is source-backed.
 * Returning an invented score would violate the catalog data policy.
 */
export async function analyzeDealInsight(_deal: ProductDeal): Promise<AIResult<DealInsight>> {
  throw new Error('Source-backed deal insight is not available');
}
