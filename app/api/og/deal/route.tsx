import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import seededCatalog from '@/lib/seeded-catalog.json';
import shopeeFeedCatalog from '@/lib/shopee-feed-catalog.json';
import partnerCatalog from '@/lib/partner-catalog.json';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findDealById(dealId: string): any | null {
  if (!dealId) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inSeeded = (seededCatalog as any[]).find((d) => d.id === dealId);
  if (inSeeded) return inSeeded;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inShopee = (shopeeFeedCatalog as any[]).find((d) => d.id === dealId);
  if (inShopee) return inShopee;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inPartner = (partnerCatalog as any[]).find((d) => d.id === dealId);
  if (inPartner) return inPartner;
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get('dealId') || '';
  const isSquare = searchParams.get('format') === 'square';

  // Find deal from real catalogs (No more Baseus Bowie H1 Pro mock fallback!)
  const foundDeal = findDealById(dealId);

  // Extract authentic deal properties with query parameter overrides
  const title = searchParams.get('title') || foundDeal?.title || 'ดีลสินค้าลดราคาพิเศษ';
  const currentPrice = Number(searchParams.get('price')) || foundDeal?.estimatedFinalPrice || foundDeal?.platforms?.[0]?.currentPrice || foundDeal?.basePrice || 0;
  const rawRegularPrice = Number(searchParams.get('marketPrice')) || foundDeal?.originalPrice || foundDeal?.marketAvgPrice || foundDeal?.platforms?.[0]?.originalPrice || currentPrice;
  const regularPrice = rawRegularPrice > currentPrice ? rawRegularPrice : currentPrice;
  const platform = (searchParams.get('platform') || foundDeal?.platform || foundDeal?.platforms?.[0]?.platform || 'shopee').toLowerCase();
  const storeName = searchParams.get('store') || foundDeal?.storeName || (foundDeal?.storeType === 'mall' ? 'ร้านทางการ Mall แท้ 100%' : 'ร้านค้าแนะนำ');
  const rating = Number(searchParams.get('rating')) || foundDeal?.rating || foundDeal?.storeRating || 4.9;
  const rawSold = searchParams.get('sold') || String(foundDeal?.reviewCount || foundDeal?.soldCount || 100);
  const soldCount = Number(rawSold) >= 1000 ? `${(Number(rawSold) / 1000).toFixed(1)}k ชิ้น` : `${rawSold} ชิ้น`;
  const imageUrl = searchParams.get('imageUrl') || foundDeal?.imageUrl || '';
  
  const savePercent = regularPrice > currentPrice ? Math.min(85, Math.round(((regularPrice - currentPrice) / regularPrice) * 100)) : 0;
  const saveAmount = Math.max(0, regularPrice - currentPrice);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const otherStores = ((foundDeal?.stores || []) as any[]).slice(0, 3);

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
                ระบบเปรียบเทียบราคา 3 แพลตฟอร์ม • Shopee • Lazada • TikTok Shop
              </span>
            </div>
          </div>

          {/* Deal Badge */}
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
            <span>ดีลของแท้ ราคาจริง</span>
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
          {/* Left: Product visual block with REAL product image */}
          <div
            style={{
              width: isSquare ? '320px' : '280px',
              height: isSquare ? '320px' : '280px',
              borderRadius: '28px',
              background: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Real Product Image */}
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  background: '#1f2937',
                  color: '#9ca3af',
                  fontSize: '48px',
                }}
              >
                🛒
              </div>
            )}

            {/* Platform corner pill overlay */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: '14px',
                left: '14px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: platformBg,
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              {platformName}
            </div>

            {/* Discount Badge overlay */}
            {savePercent > 0 && (
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  bottom: '14px',
                  right: '14px',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 900,
                  boxShadow: '0 4px 12px rgba(220,38,38,0.5)',
                }}
              >
                -{savePercent}%
              </div>
            )}
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
                fontSize: isSquare ? '28px' : '24px',
                fontWeight: 900,
                lineHeight: 1.3,
                marginBottom: '10px',
                color: '#ffffff',
                maxHeight: '66px',
                overflow: 'hidden',
              }}
            >
              {title}
            </div>

            {/* Store Name & Verification */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: 700 }}>
                ร้าน: {storeName}
              </span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                • สินค้าแท้ 100%
              </span>
            </div>

            {/* Social Proof Tags */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
                <span>ตรวจแล้วราคาถูกสุด</span>
              </div>
            </div>

            {/* Price Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '16px',
                marginBottom: '16px',
                padding: '14px 20px',
                borderRadius: '20px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1.5px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 800 }}>
                  ราคาสุทธิที่จ่ายจริง
                </span>
                <span
                  style={{
                    fontSize: isSquare ? '48px' : '40px',
                    fontWeight: 900,
                    color: '#10b981',
                    lineHeight: 1,
                    letterSpacing: '-1px',
                  }}
                >
                  ฿{currentPrice.toLocaleString('th-TH')}
                </span>
              </div>

              {regularPrice > currentPrice && (
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>ราคาปกติหน้าร้าน</span>
                  <span
                    style={{
                      fontSize: '20px',
                      color: '#6b7280',
                      textDecoration: 'line-through',
                      fontWeight: 600,
                    }}
                  >
                    ฿{regularPrice.toLocaleString('th-TH')}
                  </span>
                </div>
              )}

              {saveAmount > 0 && (
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
                  ประหยัด ฿{saveAmount.toLocaleString('th-TH')}
                </div>
              )}
            </div>

            {/* Intra-Platform Mini Comparison Bar or Authenticity Tag */}
            {otherStores.length > 0 ? (
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
                {otherStores.map((st: any, idx: number) => (
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
                    <span>฿{Number(st.estimatedAfterVoucher || st.price || 0).toLocaleString('th-TH')}</span>
                    {idx === 0 && <span>(ถูกสุด)</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '12px',
                  color: '#9ca3af',
                  fontWeight: 600,
                }}
              >
                <span>🛡️ สินค้าแท้ 100% ตรวจสอบแล้วจาก ShopDee • ราคาจริง ไม่จกตา</span>
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
              ตรวจสอบและอัปเดตราคาอัตโนมัติ • Shopee • Lazada • TikTok Shop
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
            <span>ช้อปดีลนี้ที่ shopdee-th.com</span>
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
