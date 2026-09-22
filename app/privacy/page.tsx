import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | ShopDee (ช้อปดี)",
  description: "นโยบายความเป็นส่วนตัวของ ShopDee ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <a href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">← กลับหน้าแรก</a>
      <h1 className="mt-2 text-2xl font-bold">นโยบายความเป็นส่วนตัว</h1>
      <p className="mt-1 text-sm text-neutral-500">อัปเดตล่าสุด: กันยายน 2026</p>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-700">
        <section>
          <h2 className="font-semibold">1. ข้อมูลที่เราเก็บ</h2>
          <p>
            เราเก็บข้อมูลเท่าที่จำเป็นต่อการให้บริการ ได้แก่ คำค้นหาและการใช้งานหน้าเว็บ (เพื่อปรับปรุงการแสดงผล),
            รายการที่ติดตาม (ถ้าคุณใช้ฟีเจอร์ติดตามดีล) และข้อมูลทางเทคนิคพื้นฐาน (เช่น ประเภทอุปกรณ์)
            เรา<strong>ไม่เก็บ</strong>เลขบัตร ชื่อ-นามสกุล หรือที่อยู่ เว้นแต่คุณส่งมาเองทางอีเมลติดต่อ
          </p>
        </section>
        <section>
          <h2 className="font-semibold">2. คุกกี้</h2>
          <p>เราใช้คุกกี้เพื่อจำการตั้งค่าของคุณและวัดสถิติการใช้งานแบบรวม คุณสามารถปิดคุกกี้ได้ในเบราว์เซอร์ของคุณ</p>
        </section>
        <section>
          <h2 className="font-semibold">3. การเปิดเผยข้อมูล</h2>
          <p>
            เราไม่ขายข้อมูลของคุณให้ใคร ข้อมูลอาจถูกส่งให้ผู้ให้บริการโครงสร้างพื้นฐาน (เช่น hosting, analytics)
            เท่าที่จำเป็น และจะเปิดเผยต่อเมื่อกฎหมายกำหนดเท่านั้น
          </p>
        </section>
        <section>
          <h2 className="font-semibold">4. ลิงก์ออกไปภายนอก</h2>
          <p>
            เว็บนี้มีลิงก์ไปยัง Shopee, Lazada และ TikTok Shop การใช้งานเว็บเหล่านั้นอยู่ภายใต้นโยบายของแต่ละแพลตฟอร์ม
            และเมื่อคุณซื้อผ่านลิงก์ของเรา เราอาจได้รับค่าคอมมิชชัน (ดูรายละเอียดที่ <a href="/terms" className="underline">เงื่อนไขการใช้งาน</a>)
          </p>
        </section>
        <section>
          <h2 className="font-semibold">5. สิทธิของคุณ (PDPA)</h2>
          <p>
            คุณมีสิทธิขอดู ขอแก้ไข ขอลบ หรือขอระงับการใช้ข้อมูลของคุณ ติดต่อได้ที่{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> เราดำเนินการภายใน 30 วัน
          </p>
        </section>
      </div>
    </main>
  );
}
