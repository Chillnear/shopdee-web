import { ProductDeal } from './types';
import { loadFullCatalog } from './catalog-loader';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Helper to fetch from Supabase REST API without requiring external dependencies
 */
async function supabaseFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers,
      },
      next: { revalidate: 60 }, // Cache for 60s
    });

    if (!res.ok) {
      console.warn(`Supabase query failed for ${endpoint}:`, res.status, res.statusText);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Supabase network error for ${endpoint}:`, err);
    return null;
  }
}

/**
 * Retrieve all product deals
 * Seamlessly falls back to real catalog if Supabase is not connected
 */
export async function getDeals(): Promise<ProductDeal[]> {
  if (isSupabaseConfigured) {
    const data = await supabaseFetch<ProductDeal[]>('products?select=*,store_offers(*)&order=sold_count.desc');
    if (data && data.length > 0) {
      return data;
    }
  }
  return await loadFullCatalog();
}

/**
 * Retrieve single deal by ID from real catalog
 */
export async function getDealById(id: string): Promise<ProductDeal | null> {
  if (isSupabaseConfigured) {
    const data = await supabaseFetch<ProductDeal[]>(`products?id=eq.${id}&select=*,store_offers(*)`);
    if (data && data.length > 0) {
      return data[0];
    }
  }
  const allDeals = await loadFullCatalog();
  return allDeals.find((d) => d.id === id) || null;
}

/**
 * Save a user price drop alert (LINE OA Webhook subscriber)
 */
export async function createPriceAlert(
  productId: string,
  userLineId: string,
  targetPrice: number
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/price_alerts`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          product_id: productId,
          user_line_id: userLineId,
          target_price: targetPrice,
          status: 'active',
        }),
      });

      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: `Supabase returned ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // In zero-config mode, log simulation
  console.log(`[PriceAlert Simulation] Product ${productId} -> User ${userLineId} at ฿${targetPrice}`);
  return { success: true };
}
