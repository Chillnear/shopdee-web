import Link from "next/link";

const LINKS = [
  { href: "/about", label: "เกี่ยวกับเรา" },
  { href: "/contact", label: "ติดต่อเรา" },
  { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
  { href: "/terms", label: "เงื่อนไขการใช้งาน" },
];

// Server component ล้วน — ลิงก์ render เป็น <a> ธรรมดาให้ crawler/ผู้ตรวจเห็นได้โดยไม่ต้องรัน JS
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="ลิงก์ข้อมูลเว็บ" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-600 underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">
          ShopDee (ช้อปดี) — เว็บเทียบราคาจ่ายจริงจาก Shopee, Lazada และ TikTok Shop พร้อมกรองเฉพาะร้านทางการ (Mall).
          Disclosure: เมื่อคุณซื้อสินค้าผ่านลิงก์ในเว็บนี้ เราอาจได้รับค่าคอมมิชชันจากแพลตฟอร์ม โดยคุณไม่เสียค่าใช้จ่ายเพิ่ม
        </p>
        <p className="mt-2 text-xs text-neutral-400">© 2026 ShopDee (ช้อปดี) สงวนลิขสิทธิ์</p>
      </div>
    </footer>
  );
}
