import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json([]);
  }

  try {
    // ดึงชื่อสินค้าที่มีคำค้นหาอยู่ข้างใน และเรียงตามยอดขาย (ยอดนิยม)
    const endpoint = `products?select=title&title=ilike.*${encodeURIComponent(query)}*&order=sold_count.desc&limit=8`;
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });

    if (!res.ok) throw new Error('Supabase error');

    const data = await res.json();
    
    // ทำความสะอาดชื่อสินค้าให้สั้นลงเพื่อเป็นคำแนะนำ (Suggestion)
    const suggestions = Array.from(new Set(data.map((item: any) => {
      const title = item.title;
      // ตัดชื่อให้เหลือแค่ส่วนสำคัญ (เช่น 40 ตัวอักษร)
      return title.length > 40 ? title.substring(0, 40).trim() + '...' : title;
    })));

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Suggestion API Error:', error);
    return NextResponse.json([]);
  }
}