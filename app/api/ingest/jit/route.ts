import { NextRequest, NextResponse } from 'next/server';

import { saveExternalOffers } from '@/lib/db';

const SEARCH_PATH_FRAGMENTS = ['/search', '/catalog', '/tag/', 'keyword=', '?q='];

/** Defense-in-depth: never persist search/catalog URLs as store offers. */
function isDirectOfferUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  return !SEARCH_PATH_FRAGMENTS.some((frag) => value.includes(frag));
}

export async function POST(req: NextRequest) {
  try {
    // Read the body exactly once (NextRequest body is single-use).
    const body = (await req.json().catch(() => null)) as {
      productId?: string;
      title?: string;
      status?: string;
      offers?: unknown;
    } | null;

    const productId = body?.productId;
    const title = body?.title;

    if (!productId || !title) {
      return NextResponse.json({ error: 'missing_input' }, { status: 400 });
    }

    // Client reporting back verified offers found on the user's own device.
    // Only persist direct product URLs — search/catalog URLs are rejected.
    if (body?.status === 'success') {
      const offers = Array.isArray(body.offers) ? body.offers : [];
      const directOffers = offers.filter(
        (o): o is Record<string, unknown> =>
          !!o && typeof o === 'object' && isDirectOfferUrl((o as Record<string, unknown>).url),
      );
      if (directOffers.length > 0) {
        await saveExternalOffers(productId, directOffers);
      }
      return NextResponse.json({ success: true, saved: directOffers.length });
    }

    // Trigger path: check whether verified Lazada/TikTok offers already exist.
    // Honest behavior: if none exist, report that — NEVER fabricate offers
    // (no random prices, no search URLs as product links per AGENTS.md).
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ success: true, hasOffers: false });
    }

    const headers: Record<string, string> = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    };
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/store_offers?product_id=eq.${encodeURIComponent(productId)}&platform=in.(lazada,tiktok)`,
      { headers, cache: 'no-store' },
    );
    if (!checkRes.ok) {
      return NextResponse.json({ success: true, hasOffers: false });
    }
    const existing = (await checkRes.json().catch(() => [])) as unknown[];
    if (existing.length > 0) {
      return NextResponse.json({ success: true, hasOffers: true, message: 'Already has offers' });
    }

    console.log(`[JIT Ingest] No verified cross-platform offers yet for: ${title}`);
    return NextResponse.json({ success: true, hasOffers: false });
  } catch (err) {
    console.error('[JIT Ingest] failed:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
