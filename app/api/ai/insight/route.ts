import { NextRequest, NextResponse } from 'next/server';
import { analyzeDealInsight } from '@/lib/ai/services';
import { ProductDeal } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deal: ProductDeal = body?.deal;

    if (!deal || !deal.id) {
      return NextResponse.json({ error: 'Valid deal object is required' }, { status: 400 });
    }

    const result = await analyzeDealInsight(deal);

    return NextResponse.json(result, {
      headers: {
        'x-ai-tier': result.meta.tier,
        'x-ai-provider': result.meta.provider,
        'x-ai-latency': `${result.meta.latencyMs}ms`,
      },
    });
  } catch (error: any) {
    // Deal insight is intentionally unavailable until every input is source-backed.
    // Treat it as "not implemented yet" rather than a server crash.
    return NextResponse.json(
      { error: error?.message || 'Deal insight is not available' },
      { status: 501 }
    );
  }
}
