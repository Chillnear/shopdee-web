const EVERYDAY_KEYWORDS = [
  'ของใช้ในบ้าน', 'ทำความสะอาด', 'ครัว', 'อาหาร', 'เครื่องใช้ไฟฟ้า', 'สุขภาพ', 'ดูแลผิว',
  'อุปกรณ์สำนักงาน', 'โทรศัพท์', 'สายชาร์จ', 'แบตเตอรี่', 'ผ้าอ้อม', 'สัตว์เลี้ยง',
  'home', 'kitchen', 'cleaning', 'health', 'office', 'charger', 'battery', 'pet',
];

export interface ScoringInput {
  title: string;
  category?: string | null;
  soldCount?: number | null;
  rating?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  hasImage: boolean;
  hasDirectUrl: boolean;
  hasPrice: boolean;
}

export interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
}

export function scoreCandidate(input: ScoringInput): ScoreResult {
  const text = `${input.title} ${input.category || ''}`.toLowerCase();
  const utility = EVERYDAY_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase())) ? 10 : 0;
  const demand = input.soldCount && input.soldCount > 0
    ? Math.min(30, Math.log10(input.soldCount + 1) * 7)
    : 0;
  const rating = input.rating && input.rating > 0 ? Math.min(15, (input.rating / 5) * 15) : 0;
  const commission = input.commissionRate && input.commissionRate > 0
    ? Math.min(25, input.commissionRate * 2)
    : input.commissionAmount && input.commissionAmount > 0
      ? Math.min(15, Math.log10(input.commissionAmount + 1) * 4)
      : 0;
  const completeness = [input.hasImage, input.hasDirectUrl, input.hasPrice].filter(Boolean).length * 5;
  const score = Math.round(Math.min(100, utility + demand + rating + commission + completeness) * 100) / 100;

  return {
    score,
    breakdown: {
      everyday_utility: Math.round(utility * 100) / 100,
      source_demand: Math.round(demand * 100) / 100,
      source_rating: Math.round(rating * 100) / 100,
      source_commission: Math.round(commission * 100) / 100,
      data_completeness: completeness,
    },
  };
}
