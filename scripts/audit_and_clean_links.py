#!/usr/bin/env python3
"""
audit_and_clean_links.py
Phase 1: Audits and cleans product links across all catalog files.
- Checks HTTP status & redirects
- Classifies:
    * Dead Link (4xx/5xx/timeout)
    * Search Fallback (/search, keyword=, /tag, /catalog)
    * Fake/Invalid URL (missing Shopee shopid/itemid, invalid structure)
    * Empty/Missing Link
- Sets `is_active: false` on problematic items
- Generates `audit_report.csv`
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

SEEDED_PATH = 'lib/seeded-catalog.json'
PARTNER_PATH = 'lib/partner-catalog.json'
SHOPEE_FEED_PATH = 'lib/shopee-feed-catalog.json'
REPORT_CSV_PATH = 'audit_report.csv'

USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

SEARCH_PATTERNS = [
    re.compile(r'/search', re.I),
    re.compile(r'[?&]keyword=', re.I),
    re.compile(r'[?&]q=', re.I),
    re.compile(r'/catalog/?\?', re.I),
    re.compile(r'/tag/', re.I)
]

SHOPEE_ID_PATTERN = re.compile(r'(?:product/\d+/\d+|-i\.\d+\.\d+|\b(?:itemid|item_id)=\d+|\b(?:shopid|shop_id)=\d+|origin_link=https%3A%2F%2Fshopee\.co\.th%2Fproduct%2F\d+%2F\d+)', re.I)

def load_json(path):
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def classify_url_structure(url: str, platform: str) -> tuple:
    if not url or not url.strip():
        return False, "Empty/Missing Link", "URL is missing or empty"
    
    url = url.strip()
    
    # Check for search fallbacks
    for pat in SEARCH_PATTERNS:
        if pat.search(url):
            return False, "Search Fallback", f"URL points to search/tag page: {url}"

    # Platform specific structural checks
    if platform == 'shopee':
        # Must have shop id & item id or affiliate redirect with origin_link
        if not SHOPEE_ID_PATTERN.search(url):
            return False, "Fake/Invalid URL", f"Shopee link missing ItemID/ShopID structure: {url}"
    elif platform == 'lazada':
        if not ('/products/' in url or 's.lazada.co.th' in url or 'lazada.co.th/p/' in url):
            return False, "Fake/Invalid URL", f"Lazada link missing product SKU structure: {url}"
    elif platform == 'tiktok':
        if not ('/view/product/' in url or 'vt.tiktok.com' in url or 'shop.tiktok.com' in url or '/product/' in url):
            return False, "Fake/Invalid URL", f"TikTok Shop link missing product ID structure: {url}"

    return True, "Valid Structure", "Structure conforms to direct product link"

def verify_http_status(url: str, platform: str, timeout: float = 8.0) -> tuple:
    if not url or not url.strip():
        return 0, "", "Empty/Missing Link"

    req = urllib.request.Request(
        url.strip(),
        headers={
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8',
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            final_url = resp.geturl()
            status_code = resp.getcode()
            body = resp.read(350_000).decode('utf-8', errors='ignore')

            if any(pat.search(final_url) for pat in SEARCH_PATTERNS):
                return status_code, final_url, "Search Fallback"
            if status_code in (404, 410):
                return status_code, final_url, "Dead Link"
            if is_soft_404_html(body, platform):
                return status_code, final_url, "Soft 404 / Generic Page"
            if not has_product_marker(body, platform):
                return status_code, final_url, "Ambiguous / No PDP marker"
            return status_code, final_url, "OK"
    except urllib.error.HTTPError as error:
        status_code = error.code
        final_url = getattr(error, 'url', url)
        if status_code in (404, 410):
            return status_code, final_url, "Dead Link"
        return status_code, final_url, f"Ambiguous HTTP {status_code}"
    except Exception as error:
        return 0, url, f"Ambiguous Network Error: {str(error)[:30]}"


def has_product_marker(body: str, platform: str) -> bool:
    text = body.lower()
    if platform == 'shopee':
        return ('og:title' in text or 'product_id' in text) and 'shopee thailand' not in text[:5000]
    if platform == 'lazada':
        return 'og:title' in text and ('product' in text or 'sku' in text)
    return 'og:title' in text and ('product' in text or 'pdp' in text)


def is_soft_404_html(body: str, platform: str) -> bool:
    text = body.lower()
    generic_titles = (
        'shopee thailand', 'lazada | online shopping', 'tiktok shop',
        'สินค้านี้ไม่มี', 'product not found', 'item not found', 'sold out',
        'สินค้าหมด', 'ไม่พร้อมจำหน่าย',
    )
    return any(marker in text[:120_000] for marker in generic_titles) and not has_product_marker(body, platform)

def audit_item(item, source_name):
    item_id = item.get('id', 'unknown')
    title = item.get('title', '')
    platform = item.get('platform', 'shopee')
    if isinstance(item.get('platforms'), list) and len(item['platforms']) > 0:
        platform = item['platforms'][0].get('platform', platform)

    affiliate_url = item.get('affiliateUrl') or ''
    if not affiliate_url and isinstance(item.get('platforms'), list) and len(item['platforms']) > 0:
        affiliate_url = item['platforms'][0].get('affiliateUrl', '')

    is_valid_struct, issue_type, reason = classify_url_structure(affiliate_url, platform)
    http_code = 0
    final_url = affiliate_url
    notes = reason

    if not is_valid_struct:
        is_active = False
        verification_status = 'invalid'
    else:
        http_code, final_url, issue_type = verify_http_status(affiliate_url, platform)
        is_active = issue_type == 'OK'
        verification_status = 'verified' if is_active else ('dead' if issue_type in ('Dead Link', 'Search Fallback', 'Soft 404 / Generic Page') else 'ambiguous')
        notes = issue_type

    item['is_active'] = is_active
    item['verification_status'] = verification_status
    item['last_verified_at'] = datetime.now(timezone.utc).isoformat()

    return {
        'product_id': item_id,
        'title': title,
        'source': source_name,
        'platform': platform,
        'original_url': affiliate_url,
        'final_url': final_url,
        'http_code': http_code,
        'issue_type': issue_type,
        'is_active': is_active,
        'verification_status': verification_status,
        'notes': notes,
    }

def main():
    parser = argparse.ArgumentParser(description='Audit marketplace product links without fabricating data.')
    parser.add_argument('--apply', action='store_true', help='Write is_active and verification fields back to catalog JSON files.')
    args = parser.parse_args()

    print("=== Starting Link & Data Audit ===")
    
    # 1. Load catalogs
    seeded_items = load_json(SEEDED_PATH)
    partner_items = load_json(PARTNER_PATH)
    shopee_items = load_json(SHOPEE_FEED_PATH)
    
    total_items = len(seeded_items) + len(partner_items) + len(shopee_items)
    print(f"Loaded {total_items} items across all catalogs:")
    print(f"  - Seeded: {len(seeded_items)}")
    print(f"  - Partner: {len(partner_items)}")
    print(f"  - Shopee Feed: {len(shopee_items)}")

    report_rows = []
    
    # Audit Seeded items
    for item in seeded_items:
        row = audit_item(item, 'seeded-catalog')
        report_rows.append(row)
        
    # Audit Partner items
    for item in partner_items:
        row = audit_item(item, 'partner-catalog')
        report_rows.append(row)
        
    # Audit Shopee Feed items
    for item in shopee_items:
        row = audit_item(item, 'shopee-feed-catalog')
        report_rows.append(row)
        
    if args.apply:
        save_json(SEEDED_PATH, seeded_items)
        save_json(PARTNER_PATH, partner_items)
        save_json(SHOPEE_FEED_PATH, shopee_items)
        print('Catalog JSON files updated (--apply).')
    else:
        print('Report-only mode: catalog JSON files were not modified. Use --apply to write changes.')

    # Export CSV
    with open(REPORT_CSV_PATH, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'product_id', 'title', 'source', 'platform', 'original_url',
            'final_url', 'http_code', 'issue_type', 'is_active', 'verification_status', 'notes'
        ])
        writer.writeheader()
        writer.writerows(report_rows)
        
    # Calculate statistics
    active_count = sum(1 for r in report_rows if r['is_active'])
    inactive_count = sum(1 for r in report_rows if not r['is_active'])
    issue_counts = {}
    for r in report_rows:
        t = r['issue_type']
        issue_counts[t] = issue_counts.get(t, 0) + 1
        
    print(f"\n=== Audit Finished ===")
    print(f"Total Audited: {len(report_rows)}")
    print(f"Active (Clean): {active_count}")
    print(f"Inactive (Deactivated): {inactive_count}")
    print("Issue Breakdown:")
    for issue, cnt in issue_counts.items():
        print(f"  - {issue}: {cnt}")
    print(f"\nReport written to: {REPORT_CSV_PATH}")

if __name__ == '__main__':
    main()
