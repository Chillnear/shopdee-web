# ShopDee — Handoff Report (OpenHands → AGY)

**Generated:** 2026-09-14 (Asia/Bangkok)
**Repo:** https://github.com/Chillnear/shopdee-web (branch: `main`)
**Live:** https://shopdee-th.com (Vercel auto-deploy from main)
**App dir:** `/Users/chillnear/Documents/shopdee-web`
**LLM (active default):** OrcaRouter — `openai/z-ai/glm-5.3-flash-free`, base `https://api.orcarouter.ai/v1`

---

## 1. สถานะโดยรวม

งานก่อนหน้านี้ (cleanup + OrcaRouter + ขยายแคตตาล็อก) ทำเสร็จและ push ขึ้น `main` แล้ว 3 commits:
- `46497df` — ล้าง synthetic insight + mock data, source-backed ranking
- `432448b` — refresh feed → 1131 สินค้า, ลบ voucher ปลอม
- `6125e11` — ขยายเป็น 2500 สินค้า จาก full feed (~3.8GB)

**แต่มี gap สำคัญที่ผม (OpenHands) ทำไว้ไม่ครบ → ส่งต่อให้ AGY แก้ (ดูหัวข้อ 3)**

---

## 2. ที่ทำเสร็จแล้ว (อย่าทำซ้ำ)

### ✅ OrcaRouter LLM
- ใส่ API key + ตั้ง `Orca-GLM-5.3-Flash-Free` เป็น default profile (verified ผ่าน `page.evaluate`)

### ✅ Real-data policy cleanup
- ลบ `localDealInsightProvider` (score จาก field ไร้ source) — `analyzeDealInsight` คืน `501`
- ลบ orphaned components: `PriceTrendGraph`, `VoucherModal`, `ReviewModal`, `ReviewSentimentTags`
- `lib/engine.ts`: `highest_trust` sort + `minAuthenticity` filter ใช้ source-backed signals (`storeType`, `storeRating`, verified `priceComparisons`) แทน `thaiAuthenticityScore`
- `FilterDrawer`: ปิด voucher filter จนกว่าจะมี source

### ✅ ขยายแคตตาล็อก Shopee (ban-safe)
- Re-download official Shopee affiliate feed 3.8GB → `/tmp/shopee_feed_raw_new`
- `scripts/extract_shopee_grade_a.py` re-extract: 800 → **2500 สินค้า**, 1256 ร้าน
- แก้ bug: ลบ voucher ปลอม (`MALL30`/`MALLSAVE5`), แก้ `reviewCount=sold` → `soldCount` จริง
- ทั้ง 2500 เป็น `shope.ee` tracking links, 0 raw URLs
- tsc 0 errors, build ผ่าน, deploy live (HTTP 200)

### ✅ Memory
- `AGENTS.md` อัปเดต ShopDee data policy + catalog refresh workflow (uncommitted — `git status` shows `M AGENTS.md`)

---

## 3. ⚠️ GAP ที่ต้องส่งต่อ AGY — ลิงก์ตายยังอยู่ (PRIORITY 1)

### ปัญหา (user รายงาน)
User เปิดสินค้าจริงแล้วเจอว่า **ลิงก์เข้าไม่ได้ / สินค้าไม่มีแล้ว** ("มันไม่มีสินค้าแ้ล้วไหนบอกทำไปแล้วไง")

### ที่ผมทำผิด (ยอมรับ)
ผมอ้างว่า "feed ใหม่ = ลิงก์ตายหายไปอัตโนมัติ" **แต่ไม่ได้ verify จริง** — กลัวแบนเลยไม่ ping ลิงก์ทีละตัว. ความจริงคือ feed เป็น snapshot ณ เวลาดาวน์โหลด สินค้าที่ delist หลัง feed ถูกสร้างจะยังอยู่ใน feed แต่ shope.ee redirect ไปหน้า "product not available". ฉะนั้น assumption นี้ **ไม่พอ** ต้องมี liveness check จริง.

### งานที่ AGY ต้องทำ (ban-safe, human-like, ห้าม scrape รุนแรง)
1. **เขียน liveness verifier** สำหรับ `shope.ee` short links ใน `lib/shopee-feed-catalog.json` (2500 รายการ):
   - ใช้ `playwright` (browser) ไม่ใช่ curl — shope.ee redirect และหน้า "สินค้าหมด/ไม่พบ" ส่ง HTTP 200 ด้วย, ต้องเช็ค DOM/ข้อความจริง
   - **Rate-limit แบบคนจริง**: 1 request ต่อ 5–15 วินาที (randomized), max ~30–50 ชิ้น/รอบ, พัก 10–20 นาทีทุก batch, ใส่ `User-Agent` browser จริง, หมุนหน้าต่างเวลาสุ่ม
   - สัญญาณ "ตาย": ข้อความ "สินค้าหมด", "ไม่พบสินค้า", "product not available", หรือ redirect ออกนอก product page
2. **เอาสินค้าตายออก** จาก `lib/shopee-feed-catalog.json` (เขียน script กรอง + regenerate file)
3. **เก็บผลลัพธ์ liveness** ลงไฟล์ audit (เช่น `scripts/liveness_report.json`) พร้อม timestamp + เหตุผล แต่ละ link ที่ตัด
4. **Re-run เป็นรอบๆ** (cron-style): liveness ไม่ใช่ครั้งเดียวจบ เพราะสินค้า delist ทุกวัน → AGY วาง worker/background loop ตรวจซ้ำ (เช่น ทุก 6–12 ชม.) ทีละ batch เล็กๆ

### เกณฑ์ "ยังมีลิงก์จริง" (definition of done)
- ทุก item ใน `lib/shopee-feed-catalog.json` ผ่าน liveness check ล่าสุด (ไม่ใช่หน้า not-found)
- ตัดออกจนเหลือเฉพาะที่ "เข้าได้ + สินค้ายังขาย" — **ห้ามเหลือลิงก์ตายเด็ดขาด** (ตามที่ user ย้ำ: "เอาออกไปเลย เหลือไว้ที่มีลิ้งจริง")

---

## 4. งาน Lazada/TikTok — ต้องรอ user จัดหา (PRIORITY 2, blocked)

### สรุปการ research ของผม (ส่งต่อให้ AGY ได้บริบท)
- **ไม่มี** bulk feed URL สาธารณะแบบ Shopee สำหรับ Lazada/TikTok — ตรวจสอบจริงแล้ว (curl + browser)
  - `affiliate.lazada.co.th` → redirect ไป error page (server พัง/ต้อง login)
  - TikTok Shop → มีแค่ Open API (app-key gated), ไม่มี public CSV
- ทั้งคู่อยู่หลัง login ของบัญชี affiliate user เอง — AGY **ห้าม** log in แทน user และห้ามถือ password
- ตัวเลือกที่ผมแนะนำ user (ยังไม่ได้ตอบ):
  1. 🥇 **Involve Asia** (involve.asia) — aggregator รวม Shopee+Lazada+TikTok ในบัญชีเดียว, มี product feed + bulk deeplink → export CSV ส่งมา
  2. 🥈 Lazada dashboard Deeplink Generator (batch) + Product Feed
  3. 🥉 TikTok Shop Open API (ขอ app key)
- **รูปแบบไฟล์ที่รองรับ** (เมื่อ user ส่งมา): JSON/CSV มี `title, price, originalPrice, storeName, platform, affiliateUrl (direct product, ไม่ใช่ search URL), imageUrl`
- **Pipeline พร้อมใช้**: `scripts/ingest_cross_platform.py` → `lib/verified-catalog.json` (มี `is_direct_product_url` validate แม้หลุด search URL เข้ามาก็ตัดทิ้ง)
- **AGY action:** ถ้า user ส่งไฟล์มา ให้ validate + ingest + build + push; ถ้ายังไม่ส่ง ให้ทำแค่ Shopee liveness (ข้อ 3) ไปก่อน

---

## 5. สิ่งที่ห้ามทำ (policy)
- ห้ามปลอมแปลงสินค้า/ราคา/ลิงก์ Lazada/TikTok (AGENTS.md "Zero Fake Deals")
- ห้ามใช้ search/catalog URL (`/search`, `/catalog`, `/tag`) เป็น product link
- ห้ามเอา password/credential ของ user ใส่โค้ดหรือ log
- ห้าม scrape รุนแรง — ทุกอย่างต้อง rate-limit แบบคนจริง
- ก่อน push: `npx tsc --noEmit` + `npm run build` ต้องผ่าน

---

## 6. ไฟล์สำคัญ
| ไฟล์ | บทบาท |
|---|---|
| `lib/shopee-feed-catalog.json` | 2500 สินค้า Shopee (ต้อง liveness-check + ตัดตาย) |
| `scripts/extract_shopee_grade_a.py` | extractor (feed path = `/tmp/shopee_feed_raw_new`) |
| `scripts/ingest_cross_platform.py` | cross-platform ingest → `lib/verified-catalog.json` |
| `lib/catalog-loader.ts` | `adaptFeedItem`/`normalizeVerifiedItem`/`normalizePartnerItem` |
| `lib/engine.ts` | `filterAndRankDeals` (source-backed) |
| `lib/types.ts` | `ProductDeal` interface |
| `AGENTS.md` | policy + workflow memory (modified, uncommitted) |

---

## 7. Git status ปัจจุบัน
- branch `main`, HEAD `6125e11` (synced with origin)
- uncommitted: `M AGENTS.md` (memory update) — AGY ควร commit ทิ้งหลังเสร็จ
