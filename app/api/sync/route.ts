import { NextRequest, NextResponse } from 'next/server';
import { loadFullCatalog } from '@/lib/catalog-loader';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');

  if (CRON_SECRET) {
    const isTokenValid =
      authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
    if (!isTokenValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const catalog = await loadFullCatalog();
  const checkedDeals: Array<{
    id: string;
    title: string;
    currentPrice: number;
    lowestInHistory: number;
    isLowestNow: boolean;
  }> = [];

  for (const deal of catalog) {
    const prices = (deal.priceHistory || [])
      .map((point) => Number(point.price))
      .filter((price) => Number.isFinite(price) && price > 0);
    if (prices.length < 2) continue;

    const currentPrice = deal.basePrice;
    const lowestInHistory = Math.min(...prices);
    checkedDeals.push({
      id: deal.id,
      title: deal.title,
      currentPrice,
      lowestInHistory,
      isLowestNow: currentPrice <= lowestInHistory,
    });
  }

  const lowestPriceDeals = checkedDeals.filter((deal) => deal.isLowestNow);

  return NextResponse.json({
    success: true,
    syncedAt: new Date().toISOString(),
    totalDealsChecked: checkedDeals.length,
    lowestPriceDealsFound: lowestPriceDeals.length,
    lowestPriceDeals,
    message: checkedDeals.length > 0
      ? `ตรวจสอบประวัติราคาจริงแล้ว ${checkedDeals.length} รายการ`
      : 'ยังไม่มีข้อมูลประวัติราคาจริงเพียงพอสำหรับการเปรียบเทียบ',
  });
}
