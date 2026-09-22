import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา | ShopDee (ช้อปดี)",
  description: "ShopDee คือเว็บเทียบราคาจ่ายจริงจาก Shopee, Lazada และ TikTok Shop พร้อมกรองเฉพาะร้านทางการ",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <a href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">← กลับหน้าแรก</a>
      <h1 className="mt-2 text-2xl font-bold">เกี่ยวกับ ShopDee (ช้อปดี)</h1>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-700">
        <p>
          <strong>ShopDee (ช้อปดี)</strong> คือเว็บช่วยคนไทยเทียบ<strong>ราคาจ่ายจริง</strong>ของสินค้าชิ้นเดียวกัน
          จาก Shopee, Lazada และ TikTok Shop ในที่เดียว พร้อมกรองเฉพาะ<strong>ร้านทางการ (Mall)</strong>
          เพื่อให้ได้ของแท้ในราคาดีที่สุดโดยไม่ต้องเปิดเทียบเองทีละแอป
        </p>
        <p>สิ่งที่เว็บเราทำ:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>แสดงราคา ร้านค้า รูปภาพ และลิงก์ตรงไปยังหน้าสินค้าของแต่ละแพลตฟอร์ม</li>
          <li>แยกป้ายชัดเจนว่าลิงก์ไหนคือหน้าสินค้าจริงที่ผ่านการตรวจสอบรูปแบบแล้ว</li>
          <li>ไม่สร้างดีลปลอม ไม่แต่งราคา ไม่แอบอ้างว่าเป็นร้านค้าทางการ</li>
        </ul>
        <p>
          ข้อมูลสินค้ามาจากฟีดข้อมูลพันธมิตรอย่างเป็นทางการของแพลตฟอร์ม (official affiliate datafeed)
          ราคาและโปรโมชันอาจเปลี่ยนแปลงตามร้านค้า กรุณาตรวจสอบที่หน้าสินค้าก่อนสั่งซื้อทุกครั้ง
        </p>
        <p>
          ดำเนินการโดยทีม ShopDee ประเทศไทย — ติดต่อเราได้ที่หน้า <a href="/contact" className="underline">ติดต่อเรา</a>
        </p>
      </div>
    </main>
  );
}
