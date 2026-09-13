import { NextRequest, NextResponse } from 'next/server';
import { MOCK_DEALS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');

  // Verify cron secret if configured
  if (CRON_SECRET) {
    const isTokenValid =
      authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
    if (!isTokenValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date().toISOString();
  const checkedDeals: Array<{
    id: string;
    title: string;
    currentPrice: number;
    lowestIn30Days: number;
    isLowestNow: boolean;
    dropPercent: number;
  }> = [];

  for (const deal of MOCK_DEALS) {
    const prices = (deal.priceHistory || []).map((p) => p.price);
    const minHistoricalPrice = prices.length > 0 ? Math.min(...prices) : deal.estimatedFinalPrice;
    const isLowestNow = deal.estimatedFinalPrice <= minHistoricalPrice;
    const dropPercent = Math.round(
      ((deal.marketAvgPrice - deal.estimatedFinalPrice) / deal.marketAvgPrice) * 100
    );

    checkedDeals.push({
      id: deal.id,
      title: deal.title,
      currentPrice: deal.estimatedFinalPrice,
      lowestIn30Days: minHistoricalPrice,
      isLowestNow,
      dropPercent,
    });
  }

  // Filter deals that are at their 30-day lowest record
  const flashDeals = checkedDeals.filter((d) => d.isLowestNow && d.dropPercent >= 20);

  return NextResponse.json({
    success: true,
    syncedAt: now,
    totalDealsChecked: checkedDeals.length,
    flashDealsFound: flashDeals.length,
    flashDeals,
    message: `Price sync completed successfully. Found ${flashDeals.length} all-time low deals.`,
  });
}
