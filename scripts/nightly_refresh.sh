#!/usr/bin/env bash
# scripts/nightly_refresh.sh
# Re-downloads the official Shopee affiliate feed, re-extracts Grade A products,
# and pushes the refreshed catalog to main so Vercel auto-redeploys.
#
# Ban-safe: uses the official Shopee datafeed download endpoint only (single
# signed-URL GET), never scrapes product pages. Dead/discontinued products drop
# out of a fresh feed automatically (no per-link HTTP probing).
#
# Run nightly via launchd (see scripts/com.shopdee.nightly-refresh.plist).
# Logs to /tmp/shopdee_nightly_refresh.log

set -u
cd /Users/chillnear/Documents/Openhands/truedeal-web || { echo "cd failed"; exit 1; }

LOG=/tmp/shopdee_nightly_refresh.log
FEED_URL="https://affiliate.shopee.co.th/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcHBN5NpCWc_cJAzlYyIJ5ucFaO3p-Cmchoc8YmumCd5T"
RAW="/tmp/shopee_feed_raw_nightly"

{
  echo "===== $(date -Iseconds) nightly refresh start ====="

  # 1. Download official feed (resume-capable; allow up to 30min)
  echo "[1/4] downloading feed..."
  curl -L -C - --max-time 1800 -sS -o "$RAW" "$FEED_URL" 2>&1
  SIZE=$(stat -f%z "$RAW" 2>/dev/null || echo 0)
  echo "    downloaded $SIZE bytes"
  if [ "$SIZE" -lt 100000000 ]; then
    echo "    ERROR: feed too small (<100MB), aborting"
    exit 2
  fi

  # 2. Point the extractor at the nightly feed and run it
  echo "[2/4] extracting Grade A..."
  sed -i '' "s|RAW_FEED_PATH = '/tmp/shopee_feed_raw[^']*'|RAW_FEED_PATH = '$RAW'|" scripts/extract_shopee_grade_a.py
  python3 scripts/extract_shopee_grade_a.py 2>&1 | tail -n 4

  # 3. Build to verify the refreshed catalog compiles before pushing
  echo "[3/4] building..."
  if ! npm run build > /dev/null 2>&1; then
    echo "    ERROR: build failed, not pushing"
    exit 3
  fi

  # 4. Commit + push (only if the catalog actually changed)
  echo "[4/4] committing + pushing..."
  git add lib/shopee-feed-catalog.json
  if git diff --cached --quiet; then
    echo "    no catalog changes, skipping push"
  else
    COUNT=$(python3 -c "import json;print(len(json.load(open('lib/shopee-feed-catalog.json'))))" 2>/dev/null || echo "?")
    git commit -m "chore(catalog): nightly refresh — $COUNT Grade A products ($(date +%Y-%m-%d))" \
      -m "Automated nightly refresh from official Shopee affiliate feed. Refreshes prices, adds new sellable items, and drops discontinued products." \
      -m "Co-authored-by: openhands <openhands@all-hands.dev>" 2>&1 | tail -n 2
    git push origin main 2>&1 | tail -n 2
  fi

  echo "===== $(date -Iseconds) nightly refresh done ====="
} >> "$LOG" 2>&1
