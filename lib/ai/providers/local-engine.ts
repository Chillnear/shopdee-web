/**
 * Tier 3: Local Heuristic Engine (100% Offline & Guaranteed Fallback)
 * ประมวลผลใน TypeScript บริสุทธิ์ในระดับ 1-5ms โดยไม่ต้องพึ่งเครือข่ายภายนอก
 */

import { AIProvider, SearchIntent } from '../types';

// พจนานุกรมหมวดหมู่และความต้องการในภาษาไทย
const CATEGORY_MAP: Record<string, string[]> = {
  'เครื่องใช้ไฟฟ้า': ['พัดลม', 'หม้อทอด', 'เครื่องฟอก', 'แอร์', 'เครื่องดูดฝุ่น', 'ไมโครเวฟ', 'ไดร์เป่าผม', 'กาต้มน้ำ'],
  'ไอที & แกดเจ็ต': ['หูฟัง', 'บลูทูธ', 'มือถือ', 'ไอโฟน', 'ซัมซุง', 'ipad', 'คีย์บอร์ด', 'เมาส์', 'สายชาร์จ', 'พาวเวอร์แบงค์'],
  'ของใช้ในบ้าน': ['ที่นอน', 'หมอน', 'ผ้าม่าน', 'ชั้นวางของ', 'กล่องเก็บของ', 'โต๊ะทำงาน', 'เก้าอี้เพื่อสุขภาพ', 'ซักผ้า'],
  'สัตว์เลี้ยง': ['อาหารแมว', 'ทรายแมว', 'อาหารหมา', 'คอนโดแมว', 'กรงหมา', 'วิตามินสัตว์เลี้ยง'],
  'แม่และเด็ก': ['แพมเพิส', 'ผ้าอ้อม', 'ขวดนม', 'คาร์ซีท', 'รถเข็นเด็ก', 'เครื่องปั๊มนม', 'นมผง'],
  'สกินแคร์ & บิวตี้': ['เซรั่ม', 'ครีมกันแดด', 'มอยส์เจอร์ไรเซอร์', 'ลิปสติก', 'รองพื้น', 'โฟมล้างหน้า'],
};

const ATTRIBUTE_RULES: { regex: RegExp; label: string }[] = [
  { regex: /เสียงเงียบ|เงียบ|quiet/i, label: 'เสียงเงียบ' },
  { regex: /ไร้สาย|wireless|bluetooth|บลูทูธ/i, label: 'ไร้สาย' },
  { regex: /กันน้ำ|waterproof/i, label: 'กันน้ำ' },
  { regex: /ของแท้|ประกันศูนย์|mall/i, label: 'ประกันศูนย์แท้' },
  { regex: /ส่งฟรี|ฟรีค่าส่ง/i, label: 'ส่งฟรี' },
  { regex: /พกพา|ขนาดเล็ก|portable/i, label: 'พกพาสะดวก' },
];

export const localSearchProvider: AIProvider<string, SearchIntent> = {
  name: 'local-heuristic-v1',
  tier: 'local',
  timeoutMs: 50,
  async execute(rawQuery: string): Promise<SearchIntent> {
    const q = rawQuery.trim().toLowerCase();

    // 1. ตรวจจับเพดานงบประมาณ (Budget)
    let maxPrice: number | undefined;
    let minPrice: number | undefined;

    const maxBudgetMatch = q.match(/(?:ไม่เกิน|ต่ำกว่า|งบ|under|max)\s*[:=]?\s*(\d[\d,]*)/i);
    if (maxBudgetMatch) {
      maxPrice = Number(maxBudgetMatch[1].replace(/,/g, ''));
    }

    const minBudgetMatch = q.match(/(?:มากกว่า|เกิน|ขั้นต่ำ|over|min)\s*[:=]?\s*(\d[\d,]*)/i);
    if (minBudgetMatch) {
      minPrice = Number(minBudgetMatch[1].replace(/,/g, ''));
    }

    // 2. ตรวจจับหมวดหมู่ (Category)
    let detectedCategory: string | undefined;
    let maxMatches = 0;
    for (const [catId, kws] of Object.entries(CATEGORY_MAP)) {
      const matchCount = kws.filter(kw => q.includes(kw)).length;
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        detectedCategory = catId;
      }
    }

    // 3. ตรวจจับคุณสมบัติเฉพาะ (Key Requirements)
    const keyRequirements: string[] = [];
    for (const rule of ATTRIBUTE_RULES) {
      if (rule.regex.test(q)) {
        keyRequirements.push(rule.label);
      }
    }

    // 4. แพลตฟอร์มที่ระบุเจาะจง
    let preferredPlatform: SearchIntent['preferredPlatform'] = 'all';
    if (q.includes('shopee') || q.includes('ช้อปปี้')) preferredPlatform = 'shopee';
    else if (q.includes('lazada') || q.includes('ลาซาด้า')) preferredPlatform = 'lazada';
    else if (q.includes('tiktok') || q.includes('ติ๊กต๊อก')) preferredPlatform = 'tiktok';

    // 5. แนวทางการเรียงลำดับ (Sort hint)
    let sortHint: SearchIntent['sortHint'] = 'best_value';
    if (/ถูกที่สุด|ถูกสุด|lowest|cheap/i.test(q)) sortHint = 'price_asc';
    else if (/ยอดนิยม|ขายดี|hit|popular/i.test(q)) sortHint = 'popular';

    // 6. ตัดคำค้นหาและไวยากรณ์ที่ไม่จำเป็น
    let cleaned = q;
    // ลบแพทเทิร์นงบประมาณและตัวเลข
    cleaned = cleaned.replace(/(?:งบ|ไม่เกิน|ต่ำกว่า|under|max|ราคา)\s*[:=]?\s*\d[\d,]*/gi, ' ');
    cleaned = cleaned.replace(/(?:มากกว่า|เกิน|ขั้นต่ำ|over|min)\s*[:=]?\s*\d[\d,]*/gi, ' ');

    const phraseStopwords = ['อยากได้', 'กำลังหา', 'แนะนำ', 'หน่อย', 'ครับ', 'ค่ะ', 'บาท', 'ตัวไหนดี'];
    for (const phrase of phraseStopwords) {
      cleaned = cleaned.replaceAll(phrase, ' ');
    }

    const cleanKeywords = cleaned
      .split(/[\s,]+/)
      .map(k => k.trim())
      .filter(k => k.length > 1);

    // 7. สร้างคำสรุปภาษาไทยแบบมนุษย์
    const parts: string[] = [];
    if (cleanKeywords.length > 0) parts.push(`ค้นหา "${cleanKeywords.join(' ')}"`);
    if (maxPrice) parts.push(`งบไม่เกิน ฿${maxPrice.toLocaleString()}`);
    if (keyRequirements.length > 0) parts.push(`เน้น ${keyRequirements.join(', ')}`);
    const summaryThai = parts.length > 0 ? parts.join(' • ') : `ค้นหา: ${rawQuery}`;

    return {
      rawQuery,
      cleanKeywords: cleanKeywords.length > 0 ? cleanKeywords : [rawQuery.trim()],
      category: detectedCategory,
      maxPrice,
      minPrice,
      keyRequirements,
      preferredPlatform,
      sortHint,
      summaryThai,
    };
  },
};
