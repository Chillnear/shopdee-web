import fs from 'fs';
import path from 'path';


// Manual env parsing to avoid external dependencies
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = (match[2] || '').trim();
        // Remove quotes
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const CATALOG_PATH = path.resolve(process.cwd(), 'lib/shopee-feed-catalog.json');

async function syncCatalog() {
  console.log('🚀 Starting sync from Shopee Feed JSON to Supabase...');

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('❌ Error: Catalog file not found at', CATALOG_PATH);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`📦 Loaded ${rawData.length} products from JSON.`);

  // Map JSON to Supabase Table Schema
  const products = [];
  const storeOffers = [];

  rawData.forEach(item => {
    // 1. Prepare Product record
    products.push({
      id: item.id,
      title: item.title,
      slug: item.id,
      category: item.category || 'others',
      image_url: item.imageUrl,
      base_price: item.platforms[0]?.currentPrice || 0,
      estimated_final_price: item.platforms[0]?.currentPrice || 0,
      market_avg_price: item.platforms[0]?.originalPrice || 0,
      platform: 'shopee',
      store_name: item.storeName || 'Shopee Shop',
      store_type: item.storeType || 'official',
      rating: item.rating || 5,
      sold_count: item.soldCount || 0,
      affiliate_url: item.affiliateUrl || '',
      tags: item.tags || [],
      publication_status: 'approved',
      updated_at: new Date().toISOString()
    });

    // 2. Prepare Store Offers from platforms array
    if (Array.isArray(item.platforms)) {
      item.platforms.forEach((p, idx) => {
        storeOffers.push({
          id: `${item.id}-${p.platform}-${idx}`,
          product_id: item.id,
          platform: p.platform,
          store_name: item.storeName || 'Shopee Shop',
          store_type: item.storeType || 'official',
          price: p.currentPrice || 0,
          rating: item.rating || 5,
          review_count: item.soldCount || 0,
          estimated_after_voucher: p.currentPrice || 0,
          url: p.affiliateUrl || item.affiliateUrl || '',
          updated_at: new Date().toISOString()
        });
      });
    }
  });

  async function upsertToSupabase(table, data) {
    const CHUNK_SIZE = 500;
    console.log(`🔄 Syncing ${data.length} records to ${table} in chunks of ${CHUNK_SIZE}...`);

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(chunk)
        });

        if (response.ok) {
          console.log(`✅ [${table}] Synced chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(data.length / CHUNK_SIZE)}`);
        } else {
          const errorText = await response.text();
          console.error(`❌ [${table}] Failed at ${i}:`, response.status, errorText);
          break;
        }
      } catch (error) {
        console.error(`❌ [${table}] Network error at ${i}:`, error);
        break;
      }
    }
  }

  await upsertToSupabase('products', products);
  await upsertToSupabase('store_offers', storeOffers);
  
  console.log('🏁 Sync process finished.');
}

syncCatalog();