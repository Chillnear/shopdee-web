/**
 * AI Multi-Tier Architecture Types & Data Contracts
 * รับประกันว่าทุก Tier (Free LLM, Paid API, Local Heuristic) จะคืนผลลัพธ์ในรูปทรงเดียวกันเสมอ
 */

export type AITier = 'free' | 'paid' | 'local';

export interface AIMetadata {
  tier: AITier;
  provider: string;        // เช่น 'deepseek-chat:free', 'gemini-2.0-flash-lite', 'local-heuristic-v1'
  latencyMs: number;
  confidence: number;      // 0.0 - 1.0
  degraded: boolean;       // true = เกิดการ fallback มาใช้ tier สำรอง
}

export interface AIResult<T> {
  data: T;
  meta: AIMetadata;
}

export interface AIProvider<TInput, TOutput> {
  readonly name: string;
  readonly tier: AITier;
  readonly timeoutMs: number;
  execute(input: TInput, signal: AbortSignal): Promise<TOutput>;
}

// ==========================================
// Domain Types สำหรับ ShopDee Features
// ==========================================

/** 1. AI Smart Intent Search: แปลงภาษาคนเป็นตัวกรองค้นหาสินค้า */
export interface SearchIntent {
  rawQuery: string;
  cleanKeywords: string[];               // คำค้นหาหลัก เช่น ["พัดลม", "hatari"]
  category?: string;                    // รหัสหมวดหมู่ เช่น "appliances", "it_gadgets"
  maxPrice?: number;                    // เพดานงบ เช่น 500
  minPrice?: number;
  keyRequirements: string[];            // สิ่งที่ต้องการ เช่น ["เสียงเงียบ", "ตั้งโต๊ะ", "มีประกัน"]
  preferredPlatform?: 'shopee' | 'lazada' | 'tiktok' | 'all';
  sortHint?: 'best_value' | 'price_asc' | 'popular';
  summaryThai: string;                  // ข้อความสั้นสรุปโจทย์ภาษาไทย เช่น "กำลังหาพัดลมเงียบ งบไม่เกิน 500 บาท"
}

/** 2. AI Deal Value Insight: ประเมินความคุ้มค่าและสรุปจุดเด่น */
export interface DealInsight {
  dealId: string;
  verdict: 'excellent' | 'good' | 'fair' | 'caution';
  verdictLabel: string;                 // "คุ้มค่าที่สุด", "น่าซื้อ", "ราคาปกติ", "ระวังตัวเลือกหลอก"
  score: number;                        // 0 - 100
  headline: string;                     // ข้อความ 1 บรรทัด เช่น "ถูกกว่าค่าเฉลี่ย 18% + ประกันศูนย์ไทย"
  keyHighlights: string[];              // ข้อดี 2-3 ข้อ
  cautionPoints: string[];              // ข้อควรระวัง 1-2 ข้อ
  priceAssessment: {
    isHistoricLow: boolean;
    discountPct: number;
    fairMarketPrice: number;
    timingAdvice: 'buy_now' | 'wait_campaign' | 'neutral';
    timingAdviceText: string;           // เช่น "ซื้อได้ทันที ราคาต่ำสุดใน 30 วัน"
  };
}
