# ShopDee (shopdee-web) repository notes

> This workspace moved from `/Users/chillnear/Documents/Openhands/truedeal-web` to `/Users/chillnear/Documents/shopdee-web` on 2026-09-14.

## Delegated AGY workflow

- When the user asks AGY to continue work, delegate through a local child conversation using the shared workspace so it can see and modify the current uncommitted state.
- Treat AGY as the owner of the delegated task: do not ask the user to repeatedly check whether it is finished. Wait for the child completion update, then inspect its changes and run the relevant tests automatically.
- If AGY is still working, continue monitoring rather than reporting the task as complete. Report to the user proactively when AGY finishes or is blocked, including changed files, test results, and any required user action.
- Apply this delegated-workflow behavior in future conversations for this repository, while never claiming live integration is verified unless it was actually tested.

## OpenHands Intelligent Model Routing & Cognitive Offloading

- **Proactive MCP Offloading**: Do not struggle locally with complex architecture, multi-file refactoring, or obscure bugs. Offload cognitive thinking to specialized MCP engines:
  - **Repository Architecture & Complex Planning**: Delegate to `mimi-antigravity` (`antigravity_prompt` with Claude Opus 4.6 Thinking or Gemini 3.8 Flash High) or `mimi-coach` (`claude-opus-4-8`).
  - **Deep Logic & Algorithmic Debugging**: Consult `gpt-coach` (`chatgpt` with `gpt-6-astra` or `gpt-thinking`).
  - **Web Research & Fresh Documentation**: Use `ai-pass` (`aipass_search` or `sonar-reasoning-pro`) or `gpt-coach` (`chatgpt_browse`).
  - **Zero-Trace Image Generation**: Use `gpt-coach` (`chatgpt_image` with `gpt-image-2`).
- **Mechanical Local Execution**: Use OpenHands local tools (`read_file`, `write_file`, `run_command`) to inspect the workspace and apply recommendations cleanly. Always run `npm test` to verify changes.
- **Thai Token Optimization (TTO v2)**:
  - Technical terms, code paths, terminal commands, function names, and error codes must NEVER be translated into Thai. Keep them exact (e.g. `npm test`, `background.js`, `manifest.json`, `replace_file_content`).
  - Eliminate conversational filler and apologies. Use high-density, professional Thai with clear bullet points and bold keywords.

## Strict Product Link Integrity & Zero Fake Deals (ShopDee TH)

- **NEVER use search or catalog URLs as product deals or store offers**:
  - URLs matching `/search`, `/catalog`, `/tag`, `/keyword` (e.g. `https://www.lazada.co.th/catalog/?q=...`, `https://www.tiktok.com/search?q=...`, `https://shopee.co.th/search?keyword=...`) are search results pages containing thousands of arbitrary items. They are NEVER direct product pages.
  - Putting search URLs into `StoreOffer.url` or `PlatformPriceComparison.url` and labeling them as "ไป Lazada", "ไป TikTok", "ซื้อร้านแท้", "LazMall Flagship", or "ร้านถูกสุด" violates user trust and is strictly forbidden: *"ลิ้งที่ไปหามันไม่ใช่ลิ้งสินค้าจริงออะ มันเป็นแค่เสริท แก้ไขทั้งหมดและจำไว้ด้วยว่ามันผิดแบบนี้"*.
- **Store Offers (`StoreOffer`) MUST strictly be 100% verified direct product URLs**:
  - Only include store offers that have an authentic direct item URL (`isDirectProduct: true`).
  - If a deal only has a verified link on Shopee, show ONLY that Shopee verified offer in `stores`. NEVER fabricate fake Lazada or TikTok store offers with invented discounts, ratings, or prices.
- **Honest Cross-Platform Search Assistant**:
  - When users want to search for an item on platforms without direct product links, provide a separate, dedicated "ค้นหาเปรียบเทียบเพิ่มเติมบนแอปอื่น" assistant box.
  - It must feature honest search labels (e.g. `ค้นหาชื่อนี้บน Lazada 🔍`, `ค้นหาชื่อนี้บน TikTok Shop 🔍`) and an explicit disclaimer that it opens a search query on the app, NEVER masquerading as a verified buy action.

## ShopDee (shopdee-web) build & data policy

- Repo: `github.com/Chillnear/shopdee-web` branch `main`; live at `https://shopdee-th.com` (Vercel auto-deploy from main). Local dev: `npx next start -p 3002`. Always run `npx tsc --noEmit` and `npm run build` before pushing.
- **No synthetic/derived scoring fields.** `thaiAuthenticityScore`, `hasOptionBait`, `priceAdvice`, `isAbsoluteCheapest`, `marketAvgPrice`, `availableVouchers`, `reviewHighlights` are either unsourced or constant-default; they must NOT drive ranking or gating. The old `localDealInsightProvider` was removed for this reason. `analyzeDealInsight` returns `501` (not available) until every input is source-backed.
- **Ranking/filter signals must be source-backed.** In `lib/engine.ts`, `highest_trust` sort and `minAuthenticity` filter use `storeType` (mall/preferred), `storeRating`, and verified `priceComparisons` — NOT `thaiAuthenticityScore`. The voucher filter (`hasVoucherOnly`) is disabled in `FilterDrawer` until a voucher source exists, because the Shopee feed exposes no voucher structure.
- **Shopee feed catalog** (`lib/shopee-feed-catalog.json`) is a single-platform feed: all items are `platform: shopee`, each with a real `shope.ee` affiliate tracking short link. Filtering by Lazada/TikTok returning 0 is therefore correct and honest — never fabricate cross-platform offers.
- **Catalog refresh workflow (ban-safe)**: re-download the official Shopee affiliate datafeed (`https://affiliate.shopee.co.th/api/v1/datafeed/download?id=...`, ~3.8GB, single endpoint = ban-safe, NOT page scraping) to `/tmp/shopee_feed_raw_new`, then run `python3 scripts/extract_shopee_grade_a.py`. A fresh feed automatically drops discontinued products (liveness handled without per-link HTTP probing, which would risk a ban). `extract_shopee_grade_a.py` filters Grade A (non-cross-border, mall/preferred, sold>=100, item_rating>=4.75, price>=39), dedupes by `shopid-itemid`, diversifies (max N per shop), and writes `lib/shopee-feed-catalog.json`. Column indices are pinned to the feed header (see script). MUST NOT fabricate vouchers or conflate `item_sold` with `reviewCount` — expose real `soldCount` only.
- `loadFeedCatalog` → `adaptFeedItem` (picks the shopee offer from `raw.platforms[]`). `getVerifiedCatalog`/`getPartnerCatalog` → `normalizeVerifiedItem`/`normalizePartnerItem`. `mock-data.ts` and `seeded-catalog.json` were deleted; `lib/verified-catalog.json` is the static fallback. Supabase published products merge via `loadPublishedCatalog`.
- **Orphaned synthetic-data components were deleted**: `PriceTrendGraph`, `VoucherModal`, `ReviewModal`, `ReviewSentimentTags` (no importers remain). Do not reintroduce them without a real source for their fields.
- OrcaRouter (`z-ai/glm-5.3-flash-free`, base `https://api.orcarouter.ai/v1`) is configured as the default LLM profile for this workspace.

## Vercel deploy gotcha (ShopDee — CRITICAL)

- **Vercel Hobby plan only allows cron jobs that run at most ONCE PER DAY.** A `vercel.json` cron with `schedule: "*/5 * * * *"` (or any sub-daily frequency) causes Vercel to silently REFUSE to create deployments for every push — there is no build error in the logs; commits simply never appear in the Deployments list, and the GitHub commit status shows "Vercel -> failure" with a generic `vercel.link` redirect. The live site stays frozen on the last good deployment. This masquerades as "links are dead / data is stale" because the live build never updates. Fix: use a daily schedule like `0 3 * * *`. This was the actual root cause of the stale 815-item live catalog with dead links (2026-09-14).
- After a successful push, verify via `gh api repos/Chillnear/shopdee-web/commits/<sha>/status` — a real success returns a `vercel.com/shopdee/...` deployment URL (not a `vercel.link/...` redirect).
- Shopee's `shope.ee` short links trigger an anti-bot "verify/traffic/error" wall for non-logged-in automated (headless) traffic after a small number of requests. Bulk automated liveness verification of all catalog links is therefore NOT safely feasible without a logged-in session or risking an IP/account ban. Sustainable liveness = periodic re-download of the official Shopee affiliate feed (dead products drop out of a fresh feed). Do NOT claim links are verified live unless actually checked.

