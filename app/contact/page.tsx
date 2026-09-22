import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "ติดต่อเรา | ShopDee (ช้อปดี)",
  description: "ช่องทางติดต่อทีม ShopDee แจ้งปัญหาข้อมูลสินค้า หรือขอให้ลบข้อมูล",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">ติดต่อเรา</h1>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-700">
        <p>
          อีเมล:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>ติดต่อเราได้ทุกเรื่อง เช่น:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>แจ้งราคาหรือข้อมูลสินค้าผิด</li>
          <li>เจ้าของแบรนด์/ร้านค้าต้องการแก้ไขหรือขอให้ลบข้อมูลสินค้า (แนบหลักฐานความเป็นเจ้าของมาด้วย)</li>
          <li>แจ้งปัญหาการใช้งานเว็บ</li>
        </ul>
        <p>เราจะตอบกลับภายใน 7 วันทำการ สำหรับคำขอถอดข้อมูลที่ถูกต้องตามกฎหมาย เราดำเนินการถอดภายใน 7 วันหลังยืนยันตัวตนแล้ว</p>
      </div>
    </main>
  );
}
