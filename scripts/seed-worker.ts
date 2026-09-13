/**
 * ShopDee Local Gentle Seeder (Human-like Background Worker)
 * จำลองพฤติกรรมมนุษย์ ค่อยๆ ดึงข้อมูลสินค้าขายดี & คอมมิชชันสูงเข้าสู่แคตตาล็อก ShopDee
 * รันบนเครื่อง Mac เมื่อเปิดทิ้งไว้ โดยไม่ถูกตรวจจับหรือแบน IP
 *
 * วิธีใช้งาน:
 * npx ts-node scripts/seed-worker.ts
 */

import fs from 'fs';
import path from 'path';

// รายการเป้าหมายสินค้าขายดีและคอมมิชชันสูง (Top High-Yield Seeds)
const TARGET_SEEDS = [
  // 1. หมวดเครื่องใช้ไฟฟ้า & ยอดขายสูง
  { query: 'Hatari พัดลมตั้งโต๊ะ 16 นิ้ว รุ่น HT-T16M5', category: 'พัดลม & เครื่องใช้ไฟฟ้า' },
  { query: 'Hatari พัดลมปรับระดับ 18 นิ้ว รุ่น HT-S18M2', category: 'พัดลม & เครื่องใช้ไฟฟ้า' },
  { query: 'Philips หม้อทอดไร้น้ำมัน รุ่น HD9200 4.1 ลิตร', category: 'พัดลม & เครื่องใช้ไฟฟ้า' },
  { query: 'Xiaomi Smart Air Purifier 4 Compact เครื่องฟอกอากาศ', category: 'พัดลม & เครื่องใช้ไฟฟ้า' },
  { query: 'Simplus หม้อทอดไร้น้ำมัน 4.5 ลิตร ลมร้อนรอบทิศ', category: 'พัดลม & เครื่องใช้ไฟฟ้า' },

  // 2. หมวดไอที & แกดเจ็ต
  { query: 'Sony WH-1000XM5 หูฟังไร้สายตัดเสียงรบกวน ANC', category: 'ไอที & แกดเจ็ต' },
  { query: 'Baseus Bowie H1 Pro หูฟังไร้สายครอบหู', category: 'ไอที & แกดเจ็ต' },
  { query: 'Apple iPad Air M2 11 นิ้ว 128GB Wi-Fi', category: 'ไอที & แกดเจ็ต' },
  { query: 'Eloop E29 แบตเตอรี่สำรอง 30000mAh ชาร์จเร็ว Quick Charge', category: 'ไอที & แกดเจ็ต' },
  { query: 'TP-Link Tapo C210 กล้องวงจรปิด Wi-Fi หมุนได้ 360 องศา', category: 'ไอที & แกดเจ็ต' },

  // 3. หมวดสกินแคร์ & คอมมิชชันสูง (10-20%)
  { query: 'CeraVe Foaming Cleanser 473ml เจลล้างหน้าผิวธรรมดาถึงผิวมัน', category: 'สกินแคร์ & บิวตี้' },
  { query: 'La Roche-Posay Anthelios UVMune 400 ครีมกันแดดคุมมัน', category: 'สกินแคร์ & บิวตี้' },
  { query: 'MizuMi UV Water Serum SPF50+ PA++++ ครีมกันแดดสูตรน้ำ', category: 'สกินแคร์ & บิวตี้' },
  { query: 'Eucerin Spotless Brightening Booster Serum เซรั่มลดรอยดำ', category: 'สกินแคร์ & บิวตี้' },

  // 4. หมวดของใช้ในบ้าน & สัตว์เลี้ยง (ยอดซื้อซ้ำต่อเนื่อง)
  { query: 'Kaniva อาหารแมว เกรดพรีเมียม สูตรเนื้อไก่ ทูน่า และข้าว 10kg', category: 'สัตว์เลี้ยง' },
  { query: 'Cature ทรายแมวเต้าหู้ สูตรธรรมชาติ ดับกลิ่นดีเยี่ยม', category: 'สัตว์เลี้ยง' },
  { query: 'Breeze Excel Gold น้ำยาซักผ้า สูตรเข้มข้น ชนิดเติม 750ml', category: 'ของใช้ในบ้าน' },
  { query: 'Hi-Q 1 Plus นมผง พรีไบโอโพรเทก สูตร 3 รสจืด 3000g', category: 'แม่และเด็ก' },
];

const API_ENDPOINT = process.env.WORKER_API_URL || 'http://localhost:3002/api/ingest';
const OUTPUT_FILE = path.join(process.cwd(), 'lib', 'seeded-catalog.json');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// สุ่มเวลาพักแบบธรรมชาติ (35 - 75 วินาที)
function getRandomHumanDelay() {
  const min = 35000;
  const max = 75000;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function runWorker() {
  console.log('====================================================');
  console.log('🚀 ShopDee Background Seed Worker (Human-like Ingestion)');
  console.log(`📡 Target API: ${API_ENDPOINT}`);
  console.log(`📦 Seed Queue: ${TARGET_SEEDS.length} items`);
  console.log('====================================================\n');

  let existingDeals: any[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingDeals = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch {
      existingDeals = [];
    }
  }

  const existingTitles = new Set(existingDeals.map((d) => d.title.toLowerCase()));

  for (let i = 0; i < TARGET_SEEDS.length; i++) {
    const item = TARGET_SEEDS[i];
    console.log(`\n[${i + 1}/${TARGET_SEEDS.length}] กำลังเตรียมดึง: "${item.query}" (${item.category})...`);

    if (existingTitles.has(item.query.toLowerCase())) {
      console.log(`⏩ สินค้านี้มีในแคตตาล็อกแล้ว ข้ามไปชิ้นถัดไป`);
      continue;
    }

    try {
      const startTime = Date.now();
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({ query: item.query }),
      });

      if (!res.ok) {
        console.error(`❌ ดึงข้อมูลล้มเหลว (HTTP ${res.status}): ${await res.text()}`);
      } else {
        const json = await res.json();
        if (json.success && json.deal) {
          const deal = json.deal;
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ สำเร็จ (${duration}s): ${deal.title}`);
          console.log(`   💰 ราคาจ่ายจริง: ฿${deal.estimatedFinalPrice} (ราคาป้าย ฿${deal.originalPrice}) | ถูกสุดบน: ${deal.platform}`);

          existingDeals.push(deal);
          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingDeals, null, 2), 'utf-8');
          existingTitles.add(deal.title.toLowerCase());
        }
      }
    } catch (err) {
      console.error(`⚠️ เกิดข้อผิดพลาดทางเครือข่าย:`, err);
    }

    // ทุกๆ 8 รายการ ให้พักยาว 3-5 นาที เสมือนคนหยุดพัก
    if ((i + 1) % 8 === 0 && i + 1 < TARGET_SEEDS.length) {
      const longRest = 180000 + Math.floor(Math.random() * 120000); // 3-5 นาที
      console.log(`\n☕ จำลองการพักผ่อนของมนุษย์ (Rest Session): พัก ${(longRest / 1000).toFixed(0)} วินาทีก่อนเริ่มรอบถัดไป...`);
      await sleep(longRest);
    } else if (i + 1 < TARGET_SEEDS.length) {
      const waitMs = getRandomHumanDelay();
      console.log(`⏳ หน่วงเวลาแบบสุ่ม (Human Jitter): พัก ${(waitMs / 1000).toFixed(1)} วินาทีก่อนชิ้นต่อไป...`);
      await sleep(waitMs);
    }
  }

  console.log('\n🎉 สิ้นสุดรอบการทำงาน! แคตตาล็อกปัจจุบันมีสินค้าทั้งหมด:', existingDeals.length, 'ชิ้น');
}

runWorker().catch(console.error);
