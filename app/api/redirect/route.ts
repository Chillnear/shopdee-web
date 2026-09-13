import { NextRequest, NextResponse } from 'next/server';
import { isUsablePlatformUrl } from '@/lib/catalog-loader';
import { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url')?.trim() || '';
  const platformParam = searchParams.get('platform')?.toLowerCase() || '';
  const dealId = searchParams.get('dealId')?.trim() || '';
  const platform = platformParam as Platform;

  if (!dealId || !isUsablePlatformUrl(targetUrl, platform)) {
    return NextResponse.json({ error: 'Invalid direct product URL' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  // Platform metadata
  let platformName = 'Shopee';
  let appScheme = '';

  switch (platform) {
    case 'lazada':
      platformName = 'Lazada';
      appScheme = `lazada://open?url=${encodeURIComponent(targetUrl)}`;
      break;
    case 'tiktok':
      platformName = 'TikTok Shop';
      appScheme = `snssdk1180://open?url=${encodeURIComponent(targetUrl)}`;
      break;
    case 'shopee':
    default:
      platformName = 'Shopee';
      appScheme = `shopeeth://open?url=${encodeURIComponent(targetUrl)}`;
      break;
  }

  // If user is on desktop, redirect directly to web affiliate link
  if (!isMobile) {
    return NextResponse.redirect(targetUrl, 302);
  }

  // On mobile: Return an ultra-fast smart bridge page that triggers native app launch
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>กำลังเปิดแอป ${platformName} • ShopDee</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background: #fafafa;
      color: #171717;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .logo {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      font-weight: 900;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      margin: 0 auto 16px;
      box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);
    }
    h1 {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 8px;
      color: #171717;
    }
    p {
      font-size: 13px;
      color: #737373;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #ea580c;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .btn {
      display: inline-block;
      width: 100%;
      background: #171717;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn:active { opacity: 0.8; }
    .badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SD</div>
    <div class="spinner"></div>
    <h1>กำลังเปิดแอป ${platformName}...</h1>
    <p>ระบบกำลังพาคุณไปยังหน้าสินค้าโดยตรงบน ${platformName}</p>
    <a href="${targetUrl}" class="btn" id="fallbackBtn">หากไม่เปิดอัตโนมัติ กดที่นี่</a>
  </div>

  <script>
    (function() {
      var appUrl = ${JSON.stringify(appScheme)};
      var webUrl = ${JSON.stringify(targetUrl)};
      
      // 1. Try launching the native app via Custom Scheme
      window.location.href = appUrl;

      // 2. Fallback to web link if app isn't opened within 1.4s
      setTimeout(function() {
        window.location.href = webUrl;
      }, 1400);
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
