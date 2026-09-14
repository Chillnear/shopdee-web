import { NextRequest, NextResponse } from 'next/server';
import { loadFullCatalog } from '@/lib/catalog-loader';
import { DEFAULT_FILTER_STATE, filterAndRankDeals } from '@/lib/engine';
import type { FilterState, Platform } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORMS: Platform[] = ['shopee', 'lazada', 'tiktok'];
const SORTS: FilterState['sortBy'][] = ['popular', 'best_discount', 'cheapest', 'expensive', 'highest_trust'];
const MAX_PAGE_SIZE = 32;

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true';
}

function parsePositiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseInteger(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(maximum, Math.floor(parsed)));
}

function parsePlatforms(value: string | null): Platform[] {
  if (!value) return PLATFORMS;
  const selected = value.split(',').filter((item): item is Platform => PLATFORMS.includes(item as Platform));
  return selected.length > 0 ? selected : PLATFORMS;
}

function parseSort(value: string | null): FilterState['sortBy'] {
  return SORTS.includes(value as FilterState['sortBy']) ? value as FilterState['sortBy'] : 'popular';
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const offset = parseInteger(params.get('offset'), 0, 100_000);
  const limit = parseInteger(params.get('limit'), 16, MAX_PAGE_SIZE) || 16;
  const query = (params.get('q') || '').trim().slice(0, 120);
  const selectedPlatforms = parsePlatforms(params.get('platforms'));
  const maxPrice = parsePositiveNumber(params.get('maxPrice'));

  const filter: FilterState = {
    ...DEFAULT_FILTER_STATE,
    selectedPlatforms,
    onlyMall: parseBoolean(params.get('onlyMall')),
    onlyFreeShipping: parseBoolean(params.get('onlyFreeShipping')),
    onlyDiscounted: parseBoolean(params.get('onlyDiscounted')),
    maxPrice,
    sortBy: parseSort(params.get('sort')),
    selectedCategory: params.get('category') || 'ทั้งหมด',
    limit: offset + limit,
  };

  try {
    const catalog = await loadFullCatalog();
    const { deals, totalMatching } = filterAndRankDeals(catalog, query, filter);
    const page = deals.slice(offset, offset + limit);
    const categories = Array.from(new Set(catalog.map((deal) => deal.category))).sort();

    return NextResponse.json({
      deals: page,
      totalMatching,
      offset,
      limit,
      hasMore: offset + page.length < totalMatching,
      categories,
      source: 'official-catalog',
    });
  } catch (error) {
    console.error('[Catalog API] Error:', error);
    return NextResponse.json(
      { error: 'catalog_unavailable', message: 'ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้' },
      { status: 503 },
    );
  }
}
