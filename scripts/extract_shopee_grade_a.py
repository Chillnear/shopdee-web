#!/usr/bin/env python3
"""
extract_shopee_grade_a.py
Extracts 500-1,000 Grade A authentic products from Shopee official affiliate feed.
Criteria:
- Shopee Mall & Official Store / Preferred seller
- Non-Cross border (100% Thailand local inventory, no Chinese dropship)
- Rating >= 4.75 / 5.0
- Sales >= 100 sold
- Price >= 39 THB
- Genuine affiliate shortlinks
- Strict anti-scam price filtering
- Clean Thai titles
"""

import csv
import json
import os
import re
import sys

RAW_FEED_PATH = '/tmp/shopee_feed_raw_new'
OUTPUT_CATALOG_PATH = 'lib/shopee-feed-catalog.json'

CATEGORY_MAP = {
    'Beauty & Personal Care': 'beauty',
    'Health & Wellness': 'health',
    'Home & Living': 'home',
    'Home Appliances': 'appliances',
    'Electronics': 'electronics',
    'Computers & Accessories': 'electronics',
    'Mobile & Gadgets': 'electronics',
    'Food & Beverages': 'food',
    'Mom & Baby': 'baby',
    'Baby & Toys': 'baby',
    'Fashion Accessories': 'fashion',
    'Women Clothes': 'fashion',
    'Men Clothes': 'fashion',
    'Sports & Outdoors': 'sports',
    'Pet Care': 'pets',
    'Stationery & Books': 'stationery',
    'Automotive': 'auto',
}

KNOWN_DROPSHIP_STORES = {
    'oukeya', 'jmcy', 'singaye', 'anjosirma', 'senbenbao', 'osgeer',
    'sipeau', 'yashang', 'shengsi', 'kylie', 'moxiu'
}

def clean_title(title: str) -> str:
    if not title:
        return ''
    t = title.strip()
    # Remove leading junk
    t = re.sub(r'^[【\[\(][^】\]\)]*[】\]\)]\s*', '', t)
    # Remove trailing cut-off syllables and single consonants
    t = re.sub(r'[\s(（\[【]+(เหมาะสำ|ทนต่อการสึกห|มีคุณภา|ไม่ต้อ|สกัดก|พ|ส|ที|จา|ท|ค|ช|ก|ข|ด|บ|น|ม|ย|ร|ล|ว|อ)$', '', t)
    # Strip trailing punctuation
    t = re.sub(r'[\s\-_/\\(（\[【]+$', '', t)
    # Collapse multiple spaces
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def sanitize_prices(sale_price: float, orig_price: float):
    if orig_price <= 0 or orig_price < sale_price:
        orig_price = sale_price
    # If discount > 85% or > 3.5x
    if orig_price > sale_price * 3.5 or (sale_price > 0 and (orig_price - sale_price) / orig_price > 0.85):
        orig_price = sale_price
    discount = round(((orig_price - sale_price) / orig_price) * 100) if orig_price > sale_price else 0
    return sale_price, orig_price, discount

def main():
    if not os.path.exists(RAW_FEED_PATH):
        print(f"Error: {RAW_FEED_PATH} not found!")
        sys.exit(1)

    print(f"Opening {RAW_FEED_PATH}...")
    candidates = []
    seen_ids = set()

    with open(RAW_FEED_PATH, 'r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        for row in reader:
            if len(row) < 47:
                continue
                
            cb = row[1].strip().lower() == 'non-cross border'
            if not cb:
                continue
                
            is_official = row[15].strip().lower() == 'official shop'
            is_pref = 'preferred' in row[5].strip().lower()
            
            # Must be Mall or Preferred
            if not (is_official or is_pref):
                continue

            shop_name = row[42].strip()
            seller_name = row[38].strip()
            
            # Check dropship blacklists
            if any(bad in shop_name.lower() or bad in seller_name.lower() for bad in KNOWN_DROPSHIP_STORES):
                continue
                
            try:
                sold = int(row[4].strip() or '0')
                rating = float(row[37].strip() or '0')
                sale_price = float(row[10].strip() or '0')
                orig_price = float(row[39].strip() or str(sale_price))
            except:
                continue
                
            # Grade A Filter
            if sold < 100 or rating < 4.75 or sale_price < 39:
                continue

            shopid = row[7].strip()
            itemid = row[31].strip()
            unique_id = f"shopee-feed-{shopid}-{itemid}"
            if unique_id in seen_ids:
                continue
            seen_ids.add(unique_id)

            title = clean_title(row[6].strip())
            if len(title) < 8:
                continue

            img = row[41].strip()
            if not img or 'cf.shopee.co.th' not in img:
                continue

            short_link = row[46].strip()
            prod_link = row[45].strip()
            affiliate_url = short_link if short_link else prod_link
            if not affiliate_url:
                continue

            brand = row[43].strip() or 'NoBrand'
            cat1 = row[2].strip()
            category = CATEGORY_MAP.get(cat1, 'home')

            sale_price, orig_price, discount = sanitize_prices(sale_price, orig_price)

            # Store type determination
            store_type = 'mall' if is_official else 'preferred'

            # Composite ranking score:
            mall_mult = 1.5 if store_type == 'mall' else 1.0
            score = (sold * 0.7 + rating * 250 + (50 if sale_price >= 150 else 0)) * mall_mult

            candidates.append({
                'id': unique_id,
                'title': title,
                'category': category,
                'imageUrl': img,
                'rating': round(rating, 2),
                'soldCount': sold,
                'brand': brand,
                'source': 'shopee-feed',
                'platforms': [
                    {
                        'platform': 'shopee',
                        'currentPrice': sale_price,
                        'originalPrice': orig_price,
                        'discountPercent': discount,
                        'isLowest': True,
                        'affiliateUrl': affiliate_url,
                    }
                ],
                'tags': [category, brand] if brand != 'NoBrand' else [category],
                'aiInsight': f"ขายแล้ว {sold:,} ชิ้น ⭐{rating:.2f} | {'ร้านทางการ Shopee Mall' if store_type == 'mall' else 'ร้านค้าแนะนำ'}",
                'affiliateUrl': affiliate_url,
                'priceRange': {
                    'min': sale_price,
                    'max': orig_price
                },
                '_metadata': {
                    'sold': sold,
                    'discount': discount,
                    'score': score
                },
                'storeType': store_type,
                'storeName': shop_name,
                'sellerName': seller_name,
                'isOfficialShop': is_official,
                'isPreferredShop': is_pref
            })

    print(f"Total valid candidates extracted: {len(candidates)}")

    # Sort by quality score descending
    candidates.sort(key=lambda x: x['_metadata']['score'], reverse=True)

    # Diversity filter: Limit to max 6 items per shop so the catalog is well-distributed
    diversified = []
    shop_count = {}
    for item in candidates:
        s_name = item['storeName']
        count = shop_count.get(s_name, 0)
        if count < 6:
            diversified.append(item)
            shop_count[s_name] = count + 1
        if len(diversified) >= 1500:
            break

    print(f"Total diversified Grade A items: {len(diversified)}")

    with open(OUTPUT_CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(diversified, f, ensure_ascii=False, indent=2)

    print(f"Successfully wrote {len(diversified)} Grade A products to {OUTPUT_CATALOG_PATH}!")

if __name__ == '__main__':
    main()
