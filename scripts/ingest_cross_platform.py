#!/usr/bin/env python3
"""Build ShopDee's verified catalog from official source exports only.

The input is a JSON array of product records or records with an ``offers`` array.
Every offer must contain real source metadata. This worker never searches
marketplaces, guesses a price, invents a store, or fills a missing image.

Example input record:
{
  "canonicalKey": "brand:model:variant",
  "title": "Real product title",
  "category": "electronics",
  "offers": [
    {
      "platform": "lazada",
      "price": 999,
      "originalPrice": 1290,
      "storeName": "Actual store name",
      "imageUrl": "https://cdn.example/product.jpg",
      "affiliateUrl": "https://www.lazada.co.th/products/item-i1-s2.html"
    }
  ]
}

Only use this with data exported through an official feed/API or a manually
verified direct-product source. It does not bypass marketplace controls.
"""

import argparse
import json
import os
import re
import tempfile
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_PATH = Path('lib/verified-catalog.json')
PLATFORMS = ('shopee', 'lazada', 'tiktok')
SEARCH_PREFIXES = ('/search', '/catalog', '/tag', '/keyword')


def is_direct_product_url(value: object, platform: str) -> bool:
    if not isinstance(value, str) or not value.strip() or platform not in PLATFORMS:
        return False
    try:
        parsed = urllib.parse.urlparse(value.strip())
        host = (parsed.hostname or '').lower()
        path = parsed.path.lower()
        if parsed.scheme not in ('http', 'https') or path.startswith(SEARCH_PREFIXES):
            return False

        if platform == 'shopee':
            parts = [part for part in path.split('/') if part]
            numeric_product = len(parts) >= 3 and parts[-3] == 'product' and all(part.isdigit() for part in parts[-2:])
            slug_product = '-i.' in path and '.' in path.split('-i.', 1)[1]
            try:
                decoded_query = urllib.parse.unquote(parsed.query).lower()
            except Exception:
                decoded_query = parsed.query.lower()
            short_product = host == 'shope.ee' and path == '/an_redir' and 'origin_link=' in decoded_query and '/product/' in decoded_query
            return host in ('shopee.co.th', 'shope.ee') and (numeric_product or slug_product or short_product)

        if platform == 'lazada':
            direct = host == 'lazada.co.th' or host.endswith('.lazada.co.th')
            return (direct and path.startswith('/products/') and '-i' in path and '-s' in path) or (host == 's.lazada.co.th' and path.startswith('/s.'))

        return (
            (host == 'vt.tiktok.com' and len(path) > 1) or
            (host == 'shop.tiktok.com' and ('/pdp/' in path or '/product/' in path)) or
            (host == 'tiktok.com' and '/view/product/' in path) or
            (host == 'tiktokshop.com' and '/product/' in path)
        )
    except Exception:
        return False


def load_json(path: Path):
    with path.open('r', encoding='utf-8') as handle:
        value = json.load(handle)
    if isinstance(value, dict):
        value = value.get('products') or value.get('items') or value.get('data') or []
    if not isinstance(value, list):
        raise ValueError('source JSON must be an array or contain products/items/data')
    return value


def number(value: object, default: float = 0) -> float:
    try:
        result = float(value)
        return result if result > 0 else default
    except (TypeError, ValueError):
        return default


def normalize_offer(raw: dict, parent: dict) -> dict | None:
    platform = str(raw.get('platform') or parent.get('platform') or '').lower()
    url = raw.get('affiliateUrl') or raw.get('url') or raw.get('productUrl')
    title = str(raw.get('title') or parent.get('title') or '').strip()
    image = str(raw.get('imageUrl') or parent.get('imageUrl') or '').strip()
    store = str(raw.get('storeName') or parent.get('storeName') or '').strip()
    price = number(raw.get('price') or raw.get('currentPrice'))
    if (
        platform not in PLATFORMS or
        not is_direct_product_url(url, platform) or
        not title or not image or image.startswith('/') or 'unsplash.com' in image or
        not store or price <= 0
    ):
        return None

    original = number(raw.get('originalPrice') or raw.get('listPrice'), price)
    if original < price:
        original = price
    return {
        'platform': platform,
        'title': title,
        'imageUrl': image,
        'storeName': store,
        'storeType': raw.get('storeType') if raw.get('storeType') in ('mall', 'preferred', 'verified', 'regular') else 'regular',
        'price': price,
        'originalPrice': original,
        'url': str(url).strip(),
        'rating': number(raw.get('storeRating') or raw.get('rating')),
        'soldCount': int(number(raw.get('soldCount') or raw.get('reviewCount'))),
        'estimatedAfterVoucher': number(raw.get('estimatedAfterVoucher'), price),
    }


def build_deal(group_key: str, parent: dict, offers: list[dict]) -> dict:
    offers.sort(key=lambda offer: offer['estimatedAfterVoucher'])
    primary = offers[0]
    comparisons = [
        {
            'platform': offer['platform'],
            'price': offer['price'],
            'estimatedAfterVoucher': offer['estimatedAfterVoucher'],
            'storeName': offer['storeName'],
            'storeType': offer['storeType'],
            'url': offer['url'],
            'inStock': True,
            'hasDirectProduct': True,
        }
        for offer in offers
    ]
    stores = [
        {
            'id': f"{group_key}-{index}",
            'platform': offer['platform'],
            'storeName': offer['storeName'],
            'storeType': offer['storeType'],
            'price': offer['price'],
            'estimatedAfterVoucher': offer['estimatedAfterVoucher'],
            'freeShipping': False,
            'storeRating': offer['rating'],
            'soldCount': offer['soldCount'],
            'isLowestOverall': index == 0,
            'isBestValue': False,
            'isBestStore': offer['storeType'] in ('mall', 'verified'),
            'badgeNote': 'ลิงก์ตรงจาก official source',
            'url': offer['url'],
            'isDirectProduct': True,
        }
        for index, offer in enumerate(offers)
    ]
    prices = [offer['price'] for offer in offers]
    return {
        'id': f"verified-{re.sub(r'[^a-z0-9]+', '-', group_key.lower()).strip('-')}",
        'title': primary['title'],
        'imageUrl': primary['imageUrl'],
        'category': str(parent.get('category') or 'อื่นๆ'),
        'tags': parent.get('tags') if isinstance(parent.get('tags'), list) else [],
        'platform': primary['platform'],
        'storeName': primary['storeName'],
        'storeType': primary['storeType'],
        'storeRating': primary['rating'],
        'soldCount': primary['soldCount'],
        'basePrice': primary['price'],
        'originalPrice': primary['originalPrice'],
        'marketAvgPrice': round(sum(prices) / len(prices), 2),
        'estimatedFinalPrice': primary['estimatedAfterVoucher'],
        'vipFinalPrice': primary['estimatedAfterVoucher'],
        'hasOptionBait': False,
        'thaiAuthenticityScore': 0,
        'authenticitySummary': 'ข้อมูลจาก official source; ยังไม่มีการประเมินความน่าเชื่อถือเพิ่มเติม',
        'reviews': [],
        'freeShipping': False,
        'availableVouchers': [],
        'isAbsoluteCheapest': len(offers) >= 3,
        'priceComparisons': comparisons,
        'stores': stores,
        'priceAdvice': 'fair_price',
        'priceAdviceNote': 'ราคาจาก official source ณ เวลาที่ refresh',
        'affiliateUrl': primary['url'],
        'source': parent.get('source') or 'official-source',
        'verification_status': 'source_validated',
        'last_verified_at': datetime.now(timezone.utc).isoformat(),
        'is_active': True,
    }


def build_catalog(source: Path) -> tuple[list[dict], int]:
    groups: dict[str, tuple[dict, list[dict]]] = {}
    rejected = 0
    for index, parent in enumerate(load_json(source)):
        if not isinstance(parent, dict):
            rejected += 1
            continue
        raw_offers = parent.get('offers') if isinstance(parent.get('offers'), list) else [parent]
        for offer_index, raw_offer in enumerate(raw_offers):
            if not isinstance(raw_offer, dict):
                rejected += 1
                continue
            offer = normalize_offer(raw_offer, parent)
            if offer is None:
                rejected += 1
                continue
            canonical_key = str(parent.get('canonicalKey') or raw_offer.get('canonicalKey') or '').strip()
            group_key = canonical_key or f"{offer['platform']}:{offer['url']}"
            if group_key not in groups:
                groups[group_key] = (parent, [])
            groups[group_key][1].append(offer)

    catalog = [build_deal(key, parent, offers) for key, (parent, offers) in groups.items() if offers]
    return catalog, rejected


def write_catalog(catalog: list[dict], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=output.parent, delete=False) as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
        temp_name = handle.name
    os.replace(temp_name, output)


def run_once(source: Path, output: Path) -> None:
    catalog, rejected = build_catalog(source)
    write_catalog(catalog, output)
    print(f'Wrote {len(catalog)} verified products to {output}; rejected {rejected} incomplete or non-direct offers.')


def main() -> None:
    parser = argparse.ArgumentParser(description='Refresh ShopDee from official product exports without synthetic data.')
    parser.add_argument('--source', required=True, type=Path, help='JSON export produced by an official feed/API adapter')
    parser.add_argument('--output', type=Path, default=OUTPUT_PATH)
    parser.add_argument('--watch', type=int, metavar='SECONDS', help='Repeat when source mtime changes; safe for overnight local runs')
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f'Source file does not exist: {args.source}')
    run_once(args.source, args.output)
    if args.watch:
        previous_mtime = args.source.stat().st_mtime_ns
        while True:
            time.sleep(max(30, args.watch))
            current_mtime = args.source.stat().st_mtime_ns
            if current_mtime != previous_mtime:
                run_once(args.source, args.output)
                previous_mtime = current_mtime


if __name__ == '__main__':
    main()
