import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "เงื่อนไขการใช้งาน | ShopDee (ช้อปดี)",
  description: "เงื่อนไขการใช้งานเว็บ ShopDee และคำชี้แจงค่าคอมมิชชันพันธมิตร",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <a href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">← กลับหน้าแรก</a>
      <h1 className="mt-2 text-2xl font-bold">เงื่อนไขการใช้งาน</h1>
      <p className="mt-1 text-sm text-neutral-500">อัปเดตล่าสุด: กันยายน 2026</p>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-700">
        <section>
          <h2 className="font-semibold">1. บริการของเรา</h2>
          <p>
            ShopDee แสดงข้อมูลสินค้า (ราคา ร้านค้า รูปภาพ และลิงก์) จาก Shopee, Lazada และ TikTok Shop
            เพื่อช่วยเปรียบเทียบก่อนตัดสินใจซื้อ เราไม่ใช่ผู้ขาย และไม่ได้เป็นตัวแทนของแพลตฟอร์มใด
          </p>
        </section>
        <section>
          <h2 className="font-semibold">2. ความถูกต้องของราคา</h2>
          <p>
            ราคา โปรโมชัน และสต็อกอาจเปลี่ยนแปลงได้ตลอดเวลาตามร้านค้า ข้อมูลบนเว็บใช้อ้างอิงเบื้องต้นเท่านั้น
            กรุณาตรวจสอบราคาสุดท้ายที่หน้าสินค้าก่อนชำระเงินทุกครั้ง
          </p>
        </section>
        <section>
          <h2 className="font-semibold">3. คำชี้แจงค่าคอมมิชชัน (Affiliate Disclosure)</h2>
          <p>
            ลิงก์สินค้าบางส่วนในเว็บนี้เป็นลิงก์พันธมิตร (affiliate link) เมื่อคุณซื้อผ่านลิงก์เหล่านี้
            เราอาจได้รับค่าคอมมิชชันจากแพลตฟอร์ม <strong>โดยคุณไม่เสียค่าใช้จ่ายเพิ่มแม้แต่บาทเดียว</strong>
            รายได้นี้ใช้ดูแลค่าเซิร์ฟเวอร์และการพัฒนาเว็บให้ใช้งานฟรีต่อไป
          </p>
        </section>
        <section>
          <h2 className="font-semibold">4. ทรัพย์สินทางปัญญา</h2>
          <p>
            รูปภาพสินค้า ชื่อแบรนด์ และโลโก้ร้านค้าเป็นของเจ้าของสิทธิ์แต่ละราย เราแสดงเพื่อการเปรียบเทียบข้อมูลเท่านั้น
            หากคุณเป็นเจ้าของสิทธิ์และต้องการแก้ไขหรือถอดข้อมูล ติดต่อ <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> พร้อมหลักฐาน
            เราดำเนินการภายใน 7 วันหลังยืนยันแล้ว
          </p>
        </section>
        <section>
          <h2 className="font-semibold">5. การใช้งานที่ต้องห้าม</h2>
          <p>ห้ามขูดข้อมูล (scraping) เว็บนี้จำนวนมากโดยไม่ได้รับอนุญาต ห้ามใช้เว็บเพื่อการฉ้อโกง หรือแอบอ้างเป็น ShopDee</p>
        </section>
        <section>
          <h2 className="font-semibold">6. ข้อจำกัดความรับผิดและกฎหมายที่ใช้</h2>
          <p>
            เราให้บริการตามสภาพ (as-is) ไม่รับประกันความถูกต้องสมบูรณ์ของข้อมูลราคาทุกวินาที
            การซื้อขายที่เกิดขึ้นเป็นระหว่างคุณกับร้านค้า/แพลตฟอร์มโดยตรง เงื่อนไขนี้อยู่ภายใต้กฎหมายประเทศไทย
          </p>
        </section>
      </div>
    </main>
  );
}
