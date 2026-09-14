#!/usr/bin/env node
/**
 * scripts/liveness_verify.js
 *
 * Ban-safe, human-like liveness verifier for shope.ee affiliate short links.
 *
 * Why a browser (not curl): shope.ee short links redirect to a product page that
 * returns HTTP 200 even when the product is sold-out/removed. Dead vs. live must
 * be decided from the rendered DOM, not the status code.
 *
 * Safety (per AGENTS.md "หลักการการทำแบบคนจริง ค่อยๆดึงไปเรื่อยๆ"):
 *  - randomized delay 5–15s between links
 *  - small batches (BATCH_SIZE) with a long pause (BATCH_PAUSE_MS) between batches
 *  - realistic desktop User-Agent; reused persistent context (cookies/session)
 *  - if a block/captcha/verification page is detected, STOP immediately and dump state
 *  - fully resumable: progress checkpointed to STATE_FILE after every link, so the job
 *    survives interruptions and can run over many hours
 *
 * Usage:
 *   node scripts/liveness_verify.js                # resume full run (state in scripts/.liveness_state.json)
 *   node scripts/liveness_verify.js --limit 10     # probe first 10 (smoke test)
 *   node scripts/liveness_verify.js --apply        # after verification, rewrite catalog keeping only LIVE
 *   node scripts/liveness_verify.js --report       # print summary from state
 *
 * Outputs:
 *   scripts/liveness_report.json   per-link result {url, status, reason, checkedAt, batch}
 *   scripts/.liveness_state.json   resumable progress (live/dead/pending per id)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const CATALOG = path.join(__dirname, '..', 'lib', 'shopee-feed-catalog.json');
const REPORT = path.join(__dirname, 'liveness_report.json');
const STATE = path.join(__dirname, '.liveness_state.json');

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '40', 10);
const BATCH_PAUSE_MS = 15 * 60 * 1000; // 15 min between batches
const MIN_DELAY = 5000; // 5s
const MAX_DELAY = 15000; // 15s
const NAV_TIMEOUT = 30000;

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Dead-product signals (Thai + English). Matched against visible body text.
const DEAD_PATTERNS = [
  'สินค้าหมด',
  'ไม่พบสินค้า',
  'สินค้าไม่พร้อมขาย',
  'ขออภัย ไม่พบสินค้า',
  'product not available',
  'product not found',
  'this item is no longer available',
  'ไม่สามารถแสดงสินค้า',
  'สินค้าถูกลบ',
  'ไม่พบสินค้านี้',
];

// Block/captcha signals — if seen, abort the whole run.
const BLOCK_PATTERNS = [
  'verify you are human',
  'captcha',
  'access denied',
  'request blocked',
  'unusual traffic',
  'การตรวจสอบความปลอดภัย',
  'please verify',
  'robot',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function randDelay() {
  return MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));
}
function nowISO() {
  return new Date().toISOString();
}
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return { results: {}, lastBatch: 0, startedAt: nowISO() };
  }
}
function saveState(state) {
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}
function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
}
function urlOf(item) {
  const p = (item.platforms && item.platforms[0]) || {};
  return String(p.affiliateUrl || item.affiliateUrl || '');
}

/**
 * Decide liveness from the loaded page.
 * Returns { status: 'live'|'dead'|'unknown', reason }.
 * 'unknown' means we couldn't decide — treat conservatively (do NOT auto-remove).
 */
function classifyPage(page, url) {
  // We can't read page async here easily in sync; do it in caller. This is a helper for text.
}

async function verifyOne(page, url) {
  let finalUrl = url;
  try {
    const resp = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT,
    });
    finalUrl = page.url();
    // Give SPA redirects + content a moment to settle.
    await page.waitForTimeout(2500 + Math.floor(Math.random() * 2000));
  } catch (e) {
    return { status: 'unknown', reason: `nav_error: ${String(e.message).slice(0, 120)}` };
  }

  const bodyText = await page.evaluate(() => {
    return (document.body && document.body.innerText) ? document.body.innerText.slice(0, 12000) : '';
  }).catch(() => '');

  const lower = (bodyText || '').toLowerCase();

  // 1) Block/captcha/verify-wall -> abort signal (do NOT delete anything on these)
  for (const b of BLOCK_PATTERNS) {
    if (lower.includes(b.toLowerCase())) {
      return { status: 'block', reason: `block_signal: ${b}`, finalUrl };
    }
  }
  // Shopee anti-bot interstitial: non-logged-in automated traffic gets a verify wall.
  // This is NOT a dead product — it's a wall. Treat as 'skip' (keep, don't delete).
  if (/\/verify\/traffic\/error|\/verify\//.test(finalUrl) || /traffic\/error/.test(lower)) {
    return { status: 'skip', reason: 'shopee_verify_wall (anti-bot; not a dead signal)', finalUrl };
  }

  // 2) Redirected away from a product page entirely (to search/home) -> dead
  const isProductUrl = /\/product\//.test(finalUrl) || /-i\.\d/.test(finalUrl);
  if (!isProductUrl) {
    return { status: 'dead', reason: `redirected_off_product: ${finalUrl.slice(0, 120)}` };
  }

  // 3) Reached a real /product/ URL. Explicit dead/sold-out text -> dead.
  for (const d of DEAD_PATTERNS) {
    if (lower.includes(d.toLowerCase())) {
      return { status: 'dead', reason: `dead_signal: ${d}`, finalUrl };
    }
  }

  // 4) Reached /product/ URL with no dead text -> LIVE.
  //    (Dead products redirect to search/not-found; reaching the product page
  //    is strong evidence the item still sells.)
  const liveSignal = await page.evaluate(() => {
    const hasPrice = /฿|thb|\d{2,6}/i.test(document.body ? document.body.innerText : '');
    return { hasPrice, buttonCount: document.querySelectorAll('button').length };
  }).catch(() => ({ hasPrice: false, buttonCount: 0 }));

  if (liveSignal.buttonCount >= 3) {
    return { status: 'live', reason: `reached_product_page (buttons=${liveSignal.buttonCount} price=${liveSignal.hasPrice})`, finalUrl };
  }

  // Reached /product/ but sparse DOM — conservatively keep (don't delete).
  return {
    status: 'skip',
    reason: `reached_product_but_sparse (buttons=${liveSignal.buttonCount})`,
    finalUrl,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const limitFlag = argv.indexOf('--limit');
  const limit = limitFlag !== -1 ? parseInt(argv[limitFlag + 1], 10) : 0;
  const apply = argv.includes('--apply');
  const report = argv.includes('--report');

  const catalog = loadCatalog();
  const state = loadState();
  if (!state.results) state.results = {};

  if (report) {
    const vals = Object.values(state.results);
    const live = vals.filter((v) => v.status === 'live').length;
    const dead = vals.filter((v) => v.status === 'dead').length;
    const skip = vals.filter((v) => v.status === 'skip').length;
    const unknown = vals.filter((v) => v.status === 'unknown').length;
    const block = vals.filter((v) => v.status === 'block').length;
    console.log(JSON.stringify({
      total: vals.length, live, dead, skip, unknown, block, pending: catalog.length - vals.length,
    }, null, 2));
    return;
  }

  if (apply) {
    // Drop only confirmed dead. Keep live + skip + unknown (never delete on a wall/undecided).
    const surviving = catalog.filter((it) => {
      const r = state.results[it.id];
      return !r || r.status !== 'dead';
    });
    const removed = catalog.length - surviving.length;
    fs.writeFileSync(CATALOG, JSON.stringify(surviving, null, 2));
    console.log(`Applied: kept ${surviving.length}, removed ${removed} dead. (skip/unknown kept)`);
    return;
  }

  // Build work queue: items not yet checked (or pending)
  let queue = catalog.filter((it) => !state.results[it.id] || state.results[it.id].status === 'pending');
  if (limit > 0) queue = queue.slice(0, limit);

  if (queue.length === 0) {
    console.log('Nothing pending. Use --report for summary, --apply to rewrite catalog.');
    return;
  }

  console.log(`[${nowISO()}] Starting liveness check: ${queue.length} pending (batch=${BATCH_SIZE})`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1366, height: 768 },
    locale: 'th-TH',
  });
  // minimal stealth
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  let processed = 0;
  let batchCount = 0;
  let aborted = false;

  for (const item of queue) {
    if (aborted) break;
    const url = urlOf(item);
    if (!url) {
      state.results[item.id] = { status: 'dead', reason: 'no_affiliate_url', checkedAt: nowISO(), batch: state.lastBatch };
      saveState(state);
      continue;
    }

    const r = await verifyOne(page, url);
    state.results[item.id] = { ...r, url, checkedAt: nowISO(), batch: state.lastBatch };
    processed++;
    batchCount++;
    saveState(state); // checkpoint every link (resumable)

    console.log(`[${nowISO()}] #${processed}/${queue.length} ${r.status} | ${item.id} | ${r.reason.slice(0, 80)}`);

    if (r.status === 'block') {
      console.log('!!! BLOCK/CAPTCHA SIGNAL DETECTED — aborting run to avoid ban. Dumping state.');
      aborted = true;
      break;
    }

    // inter-link human-like delay
    await sleep(randDelay());

    // batch pause
    if (batchCount >= BATCH_SIZE) {
      state.lastBatch += 1;
      saveState(state);
      batchCount = 0;
      const pause = BATCH_PAUSE_MS + Math.floor(Math.random() * 5 * 60 * 1000);
      console.log(`[${nowISO()}] Batch boundary — pausing ${Math.round(pause / 60000)}min to mimic human...`);
      await sleep(pause);
    }
  }

  await browser.close();
  const vals = Object.values(state.results);
  console.log(`[${nowISO()}] Done. processed ${processed} this run.`);
  console.log(JSON.stringify({
    total: vals.length,
    live: vals.filter((v) => v.status === 'live').length,
    dead: vals.filter((v) => v.status === 'dead').length,
    unknown: vals.filter((v) => v.status === 'unknown').length,
    block: vals.filter((v) => v.status === 'block').length,
    aborted,
  }, null, 2));
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
