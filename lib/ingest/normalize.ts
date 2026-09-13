import { createHash } from 'node:crypto';
import { isUsablePlatformUrl } from '@/lib/catalog-loader';
import type { AffiliateSource, AffiliateCandidate } from './types';
import { scoreCandidate } from './scoring';

const keyOf = (key: string) => key.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');

function pick(raw: Record<string, unknown>, keys: string[]): unknown {
  const entries = Object.entries(raw);
  for (const wanted of keys.map(keyOf)) {
    const found = entries.find(([key, value]) => keyOf(key) === wanted && value !== null && value !== undefined && value !== '');
    if (found) return found[1];
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/,/g, '').replace(/฿|บาท|%/gi, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

export function normalizeAffiliateCandidate(
  raw: Record<string, unknown>,
  source: AffiliateSource,
): AffiliateCandidate | null {
  const externalId = asString(pick(raw, ['external_id', 'externalId', 'product_id', 'productId', 'item_id', 'itemId', 'sku', 'id']));
  const title = asString(pick(raw, ['title', 'name', 'product_name', 'productName']));
  const imageUrl = asString(pick(raw, ['image_url', 'imageUrl', 'image', 'product_image', 'productImage']));
  const affiliateUrl = asString(pick(raw, [
    'affiliate_url', 'affiliateUrl', 'product_short_link', 'product short link',
    'product_link', 'productLink', 'product_url', 'productUrl', 'url',
  ]));
  const price = asNumber(pick(raw, ['price', 'sale_price', 'salePrice', 'current_price', 'currentPrice']));
  const originalPrice = asNumber(pick(raw, ['original_price', 'originalPrice', 'list_price', 'listPrice']));
  const soldCount = asNumber(pick(raw, ['sold_count', 'soldCount', 'sales', 'orders', 'units_sold']));
  const rating = asNumber(pick(raw, ['rating', 'rating_score', 'ratingScore']));
  const commissionRate = asNumber(pick(raw, ['commission_rate', 'commissionRate', 'commission_percent', 'commissionPercent']));
  const commissionAmount = asNumber(pick(raw, ['commission_amount', 'commissionAmount', 'estimated_commission']));
  const category = asString(pick(raw, ['category', 'category_name', 'categoryName']));
  const storeName = asString(pick(raw, ['store_name', 'storeName', 'shop_name', 'shopName']));

  if (!externalId || !title || !imageUrl || !affiliateUrl || !price || price <= 0) return null;
  if (!isUsablePlatformUrl(affiliateUrl, source.platform)) return null;
  if (!/^https:\/\//i.test(imageUrl)) return null;

  const score = scoreCandidate({
    title,
    category,
    soldCount,
    rating,
    commissionRate,
    commissionAmount,
    hasImage: true,
    hasDirectUrl: true,
    hasPrice: true,
  });
  const fingerprint = [source.id, externalId, title, price, originalPrice, imageUrl, affiliateUrl, category, storeName]
    .map(canonicalValue)
    .join('|');

  return {
    source_id: source.id,
    external_id: externalId,
    content_hash: createHash('sha256').update(fingerprint).digest('hex'),
    title,
    image_url: imageUrl,
    affiliate_url: affiliateUrl,
    platform: source.platform,
    category,
    store_name: storeName,
    price,
    original_price: originalPrice,
    sold_count: soldCount,
    rating,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    score: score.score,
    score_breakdown: score.breakdown,
    source_payload: raw,
    review_status: 'pending',
  };
}
