# ShopDee — OpenHands Task Handoff
**Generated**: 2026-09-13T18:05 +07:00  
**Repo**: https://github.com/Chillnear/shopdee-web (branch: `main`)  
**Live URL**: https://shopdee-th.com (Vercel auto-deploy from main)  
**Local dev**: `npx next start -p 3002` → http://localhost:3002  
**App dir**: `/Users/chillnear/Documents/shopdee-web`

---

## 🎯 OUTSTANDING TASKS (Priority Order)

### 1. 🖼️ App Icon Redesign — USER'S ORIGINAL REQUEST ⬅️ DO THIS FIRST
User said: **"สีแอปมันไม่ชวนจำเลยอะ มันแบบดำๆ ให้ทำ icon"**

**Current icon**: `/public/icon-192.png` — dark black background, barely visible  
**Goal**: Vibrant Shopee-style icon — bright orange gradient bg (`#EE4D2D` → `#FF7043`), white "S" or "ช้อป" or Thai logo mark

**Steps**:
1. Use `chatgpt_image` (gpt-image-2) to generate: `"Thai e-commerce price comparison app icon. Bright orange-to-red gradient background #EE4D2D to #FF7043. White stylized 'S' letter or shopping bag with 3 colored dots (orange, blue, pink) representing 3 platforms. Clean, modern, app icon style, 1024x1024, no text, vibrant, similar to Shopee icon style"`
2. Save output to `/public/icon-192.png` and `/public/icon-512.png`
3. Also check `/public/favicon.ico` — replace if needed
4. Also update `<Navbar>` logo: `components/Navbar.tsx` line ~24 uses `<img src="/icon-192.png" ...>`
5. Run `npm run build && git push`

---

### 2. 🌈 UI Color Redesign — Make It Look Like Shopee/Lazada
**Scope**: Color palette only, not layout restructure

**Files to edit**:

#### `tailwind.config.ts`
Add to `theme.extend.colors`:
```ts
brand: {
  500: "#F95E1B",
  600: "#EE4D2D",  // Shopee signature
  700: "#D73211",
},
warm: {
  50: "#FFFAF8",
  100: "#FFF3EE",
},
backgroundImage: {
  "hero-gradient": "linear-gradient(160deg, #FF7043 0%, #EE4D2D 40%, #C62828 100%)",
},
boxShadow: {
  "card-hover": "0 8px 30px -4px rgba(238,77,45,0.20), 0 4px 12px -2px rgba(0,0,0,0.08)",
},
```

#### `app/globals.css`
Change body background: `background-color: #FFFAF8` (warm off-white, not cold grey)  
Add utility classes:
```css
.bg-hero-gradient { background: linear-gradient(160deg, #FF7043 0%, #EE4D2D 50%, #C62828 100%); }
.price-tag { color: #EE4D2D; font-weight: 800; }
.card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 30px -4px rgba(238,77,45,0.18)...; }
```

#### `components/Navbar.tsx`
- Change `bg-white/90` → `bg-hero-gradient` for full orange gradient header
- Change all text to white: `text-white`
- Logo subtitle text: white/orange-100

#### `components/ProductGridCard.tsx`
- Price display: add `.price-tag` class → orange color
- Card: add `.card-hover` hover lift effect
- Platform badge: Shopee=`#EE4D2D`, Lazada=`#0F3EAA`, TikTok=gradient pink/black

#### `components/SmartFilterBar.tsx`
- Active filter chip: `bg-brand-600 text-white` instead of grey

#### `app/page.tsx`
- Body background wrapper: `bg-warm-50` or `bg-[#FFFAF8]`

---

### 3. 🛒 Fix Affiliate Links in Shopee Feed Catalog
**File**: `lib/shopee-feed-catalog.json` (200 products)  
**Problem**: `affiliateUrl` uses raw `shopee.co.th/product/...` URLs — NO affiliate tracking!  
**Fix**:
- Re-download the feed: `curl -L "https://affiliate.shopee.co.th/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcHBN5NpCWc_cJAzlYyIJ5ucFaO3p-Cmchoc8YmumCd5T" -o /tmp/shopee_feed_raw`
- Check the `"product_short link"` column (it has a space in the name) — this contains the real affiliate tracking short URL
- Re-run extraction using that column for `affiliateUrl` instead of `product_link`
- Shopee affiliate account: `ChillnearZ`

---

### 4. 🔧 Fix `filterAndRankDeals` for Feed Products
**File**: `lib/engine.ts`  
**Problem**: `filterAndRankDeals()` filters by `deal.platform` (single string = `'shopee'`).  
All 200 feed products have `platform: 'shopee'` → user can't filter by Lazada/TikTok tab.  
**Fix**: Change filter logic to also check `deal.priceComparisons.some(c => selectedPlatforms.includes(c.platform))`

---

### 5. 🔄 Refresh Seeded Catalog (Worker Finished — 18/18 Done)
Seed worker completed all 18 products. Current `lib/seeded-catalog.json` has 18 items.  
**However**: The seeded items are in ingest-engine format — verify `lib/catalog-loader.ts → normalizeSeededItem()` handles them correctly:
```bash
cd /Users/chillnear/Documents/shopdee-web
npx next start -p 3002 &
curl http://localhost:3002 | grep -c "ingested-"  # should show > 0 products
```

---

## 🏗️ Architecture

```
app/page.tsx (Client Component)
  useEffect → loadFullCatalog() → lib/catalog-loader.ts
    ├── getSeededCatalog()       → lib/seeded-catalog.json (18 AI products, static import)
    └── loadFeedCatalog()        → lib/shopee-feed-catalog.json (200 Shopee feed, dynamic import)
  customDeals (localStorage)     → user-ingested via URL paste
  allDeals = dedupe([...customDeals, ...catalogDeals])
  
POST /api/ingest → lib/ai/ingest-engine.ts → Mimi AI (gemini-3.1-flash-lite-preview)
```

---

## 🔑 Environment

| Key | Value |
|-----|-------|
| **Vercel project** | shopdee-th.com |
| **GitHub** | github.com/Chillnear/shopdee-web, branch: `main` |
| **`.env.local`** | `MIMI_BASE_URL`, `MIMI_TOKEN`, `MIMI_PRIMARY_MODEL=gemini-3.1-flash-lite-preview` |
| **Mimi Gateway** | `https://scgc-ailylab-eco.scg.com` |
| **Shopee affiliate** | Username: `ChillnearZ` |
| **Shopee feed URL** | `https://affiliate.shopee.co.th/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcHBN5NpCWc_cJAzlYyIJ5ucFaO3p-Cmchoc8YmumCd5T` |

---

## 📁 Key Files

| File | Role |
|------|------|
| `app/page.tsx` | Main page — loads catalog, ingestion handler, renders grid |
| `lib/catalog-loader.ts` | Merges seeded + Shopee feed into `ProductDeal[]` |
| `lib/shopee-feed-catalog.json` | 200 top Shopee products (affiliate links need fixing) |
| `lib/seeded-catalog.json` | 18 AI-synthesized products from seed worker ✅ done |
| `lib/types.ts` | `ProductDeal` interface — strict typing, must match exactly |
| `lib/engine.ts` | `filterAndRankDeals()` — needs platform filter fix |
| `lib/ai/ingest-engine.ts` | URL ingestion + Mimi AI synthesis |
| `scripts/seed-worker.ts` | Background product seeder (18 seeds, COMPLETED) |
| `components/Navbar.tsx` | Top navigation |
| `components/HeroSearch.tsx` | Dual-mode hero search (URL paste + keyword) |
| `components/ProductGridCard.tsx` | Product card in grid view |
| `components/SmartFilterBar.tsx` | Filter chips + sort |
| `tailwind.config.ts` | Design tokens |
| `app/globals.css` | Global CSS |

---

## ✅ Already Done (Do NOT redo)

- [x] Smart URL ingestion (`/api/ingest`) — live on production
- [x] Dual-mode HeroSearch (link + keyword tabs)
- [x] localStorage persistence for user deals  
- [x] Background seed worker — 18/18 products ✅ DONE
- [x] MOCK_DEALS removed from `page.tsx`
- [x] Shopee feed downloaded (1.3M rows) → top 200 filtered → `shopee-feed-catalog.json`
- [x] `lib/catalog-loader.ts` created
- [x] TypeScript: 0 errors
- [x] `npm run build`: ✅ passes
- [x] Git pushed to main → Vercel deploying

## Latest Commits
```
30ca80b feat: remove mock data, load real Shopee affiliate feed catalog (200 products) + seeded catalog
ca020e3 feat: add gentle local background seed worker
5c0ddec feat: prominent dual mode tabs for link ingestion vs search, fixed fan mock images
8e4a6fd feat: smart URL ingestion for Shopee/Lazada/TikTok
```
