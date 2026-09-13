import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { MOCK_DEALS } from '@/lib/mock-data';

export const runtime = 'edge';

// Load Kanit font for Thai text rendering in Satori
async function getKanitFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/google/fonts/main/ofl/kanit/Kanit-Bold.ttf',
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (err) {
    console.warn('Could not load Kanit font:', err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get('dealId') || 'deal-6';
  const isSquare = searchParams.get('format') === 'square';

  // Find deal from mock catalog
  const deal = MOCK_DEALS.find((d) => d.id === dealId) || MOCK_DEALS[0];

  const title = searchParams.get('title') || deal.title;
  const currentPrice = Number(searchParams.get('price')) || deal.estimatedFinalPrice;
  const regularPrice = Number(searchParams.get('marketPrice')) || deal.marketAvgPrice;
  const platform = searchParams.get('platform') || deal.platform;
  const rating = deal.storeRating || 4.9;
  const soldCount = deal.soldCount ? `${(deal.soldCount / 1000).toFixed(1)}k ชิ้น` : '1.2k ชิ้น';
  const savePercent = Math.round(((regularPrice - currentPrice) / regularPrice) * 100);

  // Platform brand colours
  const platformBg =
    platform === 'shopee'
      ? '#ea580c'
      : platform === 'lazada'
      ? '#0f3eb5'
      : '#000000';
  const platformName =
    platform === 'shopee'
      ? 'Shopee'
      : platform === 'lazada'
      ? 'Lazada'
      : 'TikTok Shop';

  const otherStores = (deal.stores || []).slice(0, 3);

  const width = isSquare ? 1080 : 1200;
  const height = isSquare ? 1080 : 630;

  const fontData = await getKanitFont();
  const fontConfig = fontData
    ? [
        {
          name: 'Kanit',
          data: fontData,
          weight: 700 as const,
          style: 'normal' as const,
        },
      ]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #090d16 100%)',
          color: '#ffffff',
          fontFamily: fontData ? 'Kanit, sans-serif' : 'sans-serif',
          padding: isSquare ? '56px 48px' : '44px 56px',
          position: 'relative',
        }}
      >
        {/* Glow ambient background circles */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234, 88, 12, 0.25) 0%, rgba(234, 88, 12, 0) 70%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '-100px',
            left: '-80px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 70%)',
          }}
        />

        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '24px',
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)',
              }}
            >
              SD
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  ShopDee
                </span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#f97316' }}>
                  ช้อปดี
                </span>
              </div>
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>
                ระบบตรวจจับดีลแท้ เทียบราคา 3 แอปเรียลไทม์
              </span>
            </div>
          </div>

          {/* Deal of the Day Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '9999px',
              background: 'rgba(234, 88, 12, 0.15)',
              border: '1.5px solid rgba(234, 88, 12, 0.4)',
              color: '#fb923c',
              fontSize: '15px',
              fontWeight: 800,
            }}
          >
            <span>ดีลถูกสุดอันดับ #1 วันนี้</span>
          </div>
        </div>

        {/* Center Content Body */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isSquare ? '32px' : '48px',
            width: '100%',
            zIndex: 10,
            margin: '20px 0',
          }}
        >
          {/* Left: Product visual block */}
          <div
            style={{
              width: isSquare ? '320px' : '280px',
              height: isSquare ? '320px' : '280px',
              borderRadius: '28px',
              background: '#1f2937',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Platform corner pill */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: platformBg,
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {platformName}
            </div>

            {/* Discount Badge */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 900,
                boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
              }}
            >
              -{savePercent}%
            </div>

            {/* Center icon / preview representation */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '56px', marginBottom: '8px' }}>📦</div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '14px',
                  color: '#e5e7eb',
                  fontWeight: 700,
                  maxWidth: '220px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {deal.storeName}
              </div>
              <div style={{ display: 'flex', fontSize: '12px', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
                ร้านค้าแท้ตรวจสอบแล้ว
              </div>
            </div>
          </div>

          {/* Right: Info, Price, Comparison */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {/* Title */}
            <div
              style={{
                display: 'flex',
                fontSize: isSquare ? '30px' : '26px',
                fontWeight: 900,
                lineHeight: 1.3,
                marginBottom: '14px',
                color: '#ffffff',
                maxHeight: '74px',
                overflow: 'hidden',
              }}
            >
              {title}
            </div>

            {/* Social Proof Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  color: '#fbbf24',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <span>คะแนน {rating.toFixed(1)} / 5</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  color: '#d1d5db',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <span>ยอดขาย {soldCount}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  color: '#34d399',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                <span>โค้ดลดซ้อน 4 ต่อ</span>
              </div>
            </div>

            {/* Price Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '16px',
                marginBottom: '18px',
                padding: '16px 20px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1.5px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 800 }}>
                  ราคาเน็ตหลังหักโค้ด
                </span>
                <span
                  style={{
                    fontSize: isSquare ? '52px' : '44px',
                    fontWeight: 900,
                    color: '#10b981',
                    lineHeight: 1,
                    letterSpacing: '-1px',
                  }}
                >
                  ฿{currentPrice.toLocaleString('th-TH')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '12px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>ราคาปกติหน้าร้าน</span>
                <span
                  style={{
                    fontSize: '22px',
                    color: '#6b7280',
                    textDecoration: 'line-through',
                    fontWeight: 600,
                  }}
                >
                  ฿{regularPrice.toLocaleString('th-TH')}
                </span>
              </div>

              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  background: '#10b981',
                  color: '#064e3b',
                  fontWeight: 900,
                  fontSize: '14px',
                }}
              >
                ประหยัด ฿{(regularPrice - currentPrice).toLocaleString('th-TH')}
              </div>
            </div>

            {/* Intra-Platform Mini Comparison Bar */}
            {otherStores.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 700, marginRight: '4px' }}>
                  เทียบร้านอื่น:
                </span>
                {otherStores.map((st, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: idx === 0 ? '#34d399' : '#d1d5db',
                      fontWeight: idx === 0 ? 800 : 500,
                      background: idx === 0 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                      padding: idx === 0 ? '3px 8px' : '0',
                      borderRadius: '8px',
                    }}
                  >
                    <span>{st.platform === 'shopee' ? 'Shopee' : st.platform === 'lazada' ? 'Lazada' : 'TikTok'}:</span>
                    <span>฿{st.estimatedAfterVoucher.toLocaleString('th-TH')}</span>
                    {idx === 0 && <span>(ถูกสุด)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '16px',
            width: '100%',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              ตรวจสอบและอัปเดตราคาอัตโนมัติทุก 1 ชม. • Shopee • Lazada • TikTok Shop
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff',
              padding: '10px 24px',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
            }}
          >
            <span>ช้อปดีลนี้ที่ shopdee.th</span>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: fontConfig,
    }
  );
}
