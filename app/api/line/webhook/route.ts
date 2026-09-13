import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { MOCK_DEALS } from '@/lib/mock-data';
import { filterAndRankDeals, DEFAULT_FILTER_STATE, formatTHB, getSmartAffiliateUrl } from '@/lib/engine';
import { createPriceAlert } from '@/lib/db';
import { ProductDeal } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * Verify LINE webhook signature using HMAC-SHA256
 */
function verifySignature(body: string, signature: string | null): boolean {
  if (!LINE_CHANNEL_SECRET) return true; // Bypass in local dev/simulation
  if (!signature) return false;
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

/**
 * Build a LINE Flex Message Bubble for a single deal
 */
function buildDealFlexBubble(deal: ProductDeal, rank: number, baseUrl: string) {
  const deepLink = `${baseUrl}${getSmartAffiliateUrl(deal.affiliateUrl, deal.platform, deal.id)}`;
  const savePct = Math.round(((deal.marketAvgPrice - deal.estimatedFinalPrice) / deal.marketAvgPrice) * 100);

  // Other stores comparison rows
  const storeRows = (deal.stores || []).slice(0, 3).map((st, idx) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `${st.platform === 'shopee' ? 'Shopee' : st.platform === 'lazada' ? 'Lazada' : 'TikTok'}: ${st.storeName}`,
        size: 'xs',
        color: idx === 0 ? '#10b981' : '#6b7280',
        weight: idx === 0 ? 'bold' : 'regular',
        flex: 3,
      },
      {
        type: 'text',
        text: formatTHB(st.estimatedAfterVoucher),
        size: 'xs',
        align: 'end',
        color: idx === 0 ? '#10b981' : '#111827',
        weight: idx === 0 ? 'bold' : 'regular',
        flex: 2,
      },
    ],
  }));

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'horizontal',
      backgroundColor: '#ea580c',
      paddingAll: '12px',
      contents: [
        {
          type: 'text',
          text: `👑 อันดับ #${rank} ${
            (deal.priceComparisons?.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length || 1) >= 3
              ? 'ถูกสุดใน 3 แอป'
              : 'ดีลคุ้มค่าอันดับ 1'
          }`,
          color: '#ffffff',
          weight: 'bold',
          size: 'xs',
          flex: 1,
        },
        {
          type: 'text',
          text: `ประหยัด -${savePct}%`,
          color: '#fef08a',
          weight: 'bold',
          size: 'xs',
          align: 'end',
        },
      ],
    },
    hero: {
      type: 'image',
      url: deal.imageUrl,
      size: 'full',
      aspectRatio: '1:1',
      aspectMode: 'cover',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: deal.title,
          weight: 'bold',
          size: 'sm',
          wrap: true,
          maxLines: 2,
        },
        // Price banner
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#ecfdf5',
          cornerRadius: 'md',
          paddingAll: '10px',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: 'ราคาเน็ตหลังหักโค้ด:',
                  size: 'xxs',
                  color: '#059669',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: formatTHB(deal.estimatedFinalPrice),
                  size: 'lg',
                  color: '#059669',
                  weight: 'bold',
                  align: 'end',
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: 'ราคาปกติหน้าร้าน:',
                  size: 'xxs',
                  color: '#9ca3af',
                },
                {
                  type: 'text',
                  text: formatTHB(deal.marketAvgPrice),
                  size: 'xs',
                  color: '#9ca3af',
                  decoration: 'line-through',
                  align: 'end',
                },
              ],
            },
          ],
        },
        // Comparison table
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            {
              type: 'text',
              text: (deal.priceComparisons?.filter(pc => pc.hasDirectProduct !== false && pc.price > 0).length || 1) >= 3
                ? '🔍 เทียบราคา 3 แอปเรียลไทม์:'
                : '🔍 ตรวจสอบราคาบนร้านค้า:',
              size: 'xxs',
              color: '#9ca3af',
              weight: 'bold',
            },
            ...storeRows,
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#ea580c',
          height: 'sm',
          action: {
            type: 'uri',
            label: `ไปซื้อบน ${deal.platform === 'shopee' ? 'Shopee' : deal.platform === 'lazada' ? 'Lazada' : 'TikTok'} ↗`,
            uri: deepLink,
          },
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '🔔 แจ้งเตือนเมื่อราคาลดอีก',
            data: `action=alert&dealId=${deal.id}`,
            displayText: `ตั้งเตือนราคาลดสำหรับ: ${deal.title.slice(0, 20)}...`,
          },
        },
      ],
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-line-signature');

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const events = payload.events || [];

    const origin = request.nextUrl.origin || 'https://shopdee.th';

    for (const event of events) {
      const replyToken = event.replyToken;
      const userId = event.source?.userId || 'unknown';

      // 1. Text Search Message Event
      if (event.type === 'message' && event.message?.type === 'text') {
        const userText = event.message.text.trim();

        // Search deals with query
        const { deals } = filterAndRankDeals(MOCK_DEALS, userText, DEFAULT_FILTER_STATE);
        const topDeals = deals.slice(0, 4);

        let replyPayload: any;

        if (topDeals.length > 0) {
          // Generate LINE Carousel Flex Message
          const bubbles = topDeals.map((deal, idx) => buildDealFlexBubble(deal, idx + 1, origin));
          replyPayload = {
            replyToken,
            messages: [
              {
                type: 'text',
                text: `🔍 พบดีลราคาถูกสุด ${topDeals.length} รายการสำหรับ "${userText}":`,
              },
              {
                type: 'flex',
                altText: `รวมดีลถูกสุดสำหรับ ${userText} จาก ShopDee`,
                contents: {
                  type: 'carousel',
                  contents: bubbles,
                },
              },
            ],
          };
        } else {
          // No direct match -> suggest trending deals
          const trending = MOCK_DEALS.slice(0, 3);
          const bubbles = trending.map((deal, idx) => buildDealFlexBubble(deal, idx + 1, origin));
          replyPayload = {
            replyToken,
            messages: [
              {
                type: 'text',
                text: `ไม่พบดีลที่ตรงกับคำว่า "${userText}" ตรงๆ แต่ ShopDee รวมดีลเด็ดลดแรงประจำวันมาให้ลองดูครับ 👇`,
              },
              {
                type: 'flex',
                altText: 'ดีลเด็ดประจำวัน ShopDee',
                contents: {
                  type: 'carousel',
                  contents: bubbles,
                },
              },
            ],
          };
        }

        // Send Reply to LINE API
        if (LINE_CHANNEL_ACCESS_TOKEN) {
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(replyPayload),
          });
        } else {
          console.log('[LINE Webhook Simulation] Reply payload:', JSON.stringify(replyPayload, null, 2));
          return NextResponse.json({
            status: 'simulated',
            matchedCount: topDeals.length,
            sampleDeal: topDeals[0]?.title,
          });
        }
      }

      // 2. Postback Event (e.g. Set Price Alert from button)
      if (event.type === 'postback' && event.postback?.data) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get('action');
        const dealId = params.get('dealId');

        if (action === 'alert' && dealId) {
          const deal = MOCK_DEALS.find((d) => d.id === dealId);
          const targetPrice = deal ? Math.round(deal.estimatedFinalPrice * 0.9) : 500;

          await createPriceAlert(dealId, userId, targetPrice);

          const replyPayload = {
            replyToken,
            messages: [
              {
                type: 'text',
                text: `✅ ตั้งเตือนราคาลดสำหรับ "${deal?.title || 'สินค้า'}" เรียบร้อยแล้ว!\n\n🔔 เมื่อราคาปรับลดลงมาต่ำกว่า ${formatTHB(targetPrice)} หรือมีโค้ดลดลับรอบดึก 00:00 น. บอท ShopDee จะส่งข้อความแจ้งเตือนคุณทันทีครับ!`,
              },
            ],
          };

          if (LINE_CHANNEL_ACCESS_TOKEN) {
            await fetch('https://api.line.me/v2/bot/message/reply', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify(replyPayload),
            });
          } else {
            console.log('[LINE Webhook Postback Simulation] Alert created for user:', userId);
            return NextResponse.json({
              status: 'simulated_alert_created',
              dealId,
              userId,
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Error handling LINE webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
