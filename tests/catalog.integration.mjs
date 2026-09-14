import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = path.join(projectRoot, 'node_modules/next/dist/bin/next');
const port = 3102;
const baseUrl = `http://127.0.0.1:${port}`;
let server;
let browser;

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/catalog?limit=1`);
      if (response.ok) return;
    } catch {
      // The Next server may need a few seconds to start.
    }
    await delay(500);
  }
  throw new Error('Next production server did not become ready');
}

before(async () => {
  server = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    cwd: projectRoot,
    stdio: 'ignore',
  });
  await waitForServer();
});

after(async () => {
  if (browser) await browser.close();
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(5_000),
  ]);
  if (server.exitCode === null) server.kill('SIGKILL');
});

test('catalog API returns bounded pages and pagination metadata', async () => {
  const response = await fetch(`${baseUrl}/api/catalog?offset=0&limit=4`);
  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.source, 'official-catalog');
  assert.equal(payload.offset, 0);
  assert.equal(payload.limit, 4);
  assert.equal(payload.deals.length, 4);
  assert.equal(typeof payload.totalMatching, 'number');
  assert.equal(payload.hasMore, true);
  assert.ok(payload.totalMatching > payload.deals.length);
  assert.ok(payload.deals.every((deal) => deal.id && deal.title && deal.affiliateUrl));
});

test('catalog API applies search and category filters server-side', async () => {
  const [searchResponse, categoryResponse] = await Promise.all([
    fetch(`${baseUrl}/api/catalog?limit=2&q=Dr.PONG`),
    fetch(`${baseUrl}/api/catalog?limit=2&category=health`),
  ]);
  assert.equal(searchResponse.status, 200);
  assert.equal(categoryResponse.status, 200);

  const searchPayload = await searchResponse.json();
  const categoryPayload = await categoryResponse.json();
  assert.ok(searchPayload.totalMatching > 0);
  assert.ok(searchPayload.deals.every((deal) =>
    [deal.title, deal.category, deal.storeName, ...deal.tags]
      .some((value) => value.toLowerCase().includes('dr.pong')),
  ));
  assert.ok(categoryPayload.totalMatching > 0);
  assert.ok(categoryPayload.deals.every((deal) => deal.category === 'health'));
});

test('catalog API clamps oversized page requests', async () => {
  const response = await fetch(`${baseUrl}/api/catalog?offset=0&limit=999`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.limit, 32);
  assert.equal(payload.deals.length, 32);
});

test('redirect API rejects search URLs and preserves verified direct URLs', async () => {
  const searchUrl = new URL(`${baseUrl}/api/redirect`);
  searchUrl.searchParams.set('dealId', 'test-deal');
  searchUrl.searchParams.set('platform', 'shopee');
  searchUrl.searchParams.set('url', 'https://shopee.co.th/search?keyword=phone');
  const rejected = await fetch(searchUrl);
  assert.equal(rejected.status, 400);

  const directTarget = 'https://shopee.co.th/product/123/456';
  const directUrl = new URL(`${baseUrl}/api/redirect`);
  directUrl.searchParams.set('dealId', 'test-deal');
  directUrl.searchParams.set('platform', 'shopee');
  directUrl.searchParams.set('url', directTarget);
  const redirected = await fetch(directUrl, { redirect: 'manual' });
  assert.equal(redirected.status, 302);
  assert.equal(redirected.headers.get('location'), directTarget);
});

test('homepage loads the first page and requests the next page on load-more', async () => {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const catalogRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/catalog')) catalogRequests.push(request.url());
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(500);
  assert.match(await page.title(), /ShopDee/);
  assert.ok((await page.locator('img').count()) >= 17);
  assert.ok(catalogRequests.some((url) => url.includes('offset=0&limit=16')));

  const loadMore = page.getByRole('button', { name: /ดูสินค้าเพิ่มเติม/ });
  assert.equal(await loadMore.count(), 1);
  await loadMore.click();
  await page.waitForTimeout(750);
  assert.ok(catalogRequests.some((url) => url.includes('offset=16&limit=16')));
  assert.ok((await page.locator('img').count()) >= 33);
});

test('homepage sends search query to catalog API without error state', async () => {
  const page = await browser.newPage();
  const catalogRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/catalog')) catalogRequests.push(request.url());
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByRole('button', { name: 'ค้นหาด้วยชื่อสินค้า' }).click();
  await page.locator('input').first().fill('Dr.PONG');
  await page.locator('input').first().press('Enter');
  await page.waitForTimeout(1_000);

  assert.ok(catalogRequests.some((url) => url.includes('q=Dr.PONG')));
  assert.doesNotMatch(await page.locator('body').innerText(), /โหลดรายการสินค้าไม่สำเร็จ/);
  await page.close();
});
