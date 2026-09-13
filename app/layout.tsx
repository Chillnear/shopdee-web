import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ["latin", "thai"],
  variable: '--font-kanit',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: "#EE4D2D",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://shopdee.th'),
  title: "ShopDee (ช้อปดี) • รวมดีลถูกจริงข้าม 3 แพลตฟอร์ม ไม่จกตา",
  description: "ShopDee ช้อปดี เทียบราคาจริง Shopee, Lazada, TikTok Shop กรองราคาตัวเลือกหลอก กรองรีวิวบอทจีนแปลภาษา คัดเฉพาะร้านทางการและร้านแนะนำ ใช้งานฟรี 100% ไม่ต้องสมัครสมาชิก",
  keywords: ["ShopDee", "ช้อปดี", "เช็คราคา", "ราคาถูกสุด", "shopee ถูกสุด", "lazada ถูกสุด", "tiktok shop", "โค้ดลด shopee", "เทียบราคา", "ของแท้"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.jpg", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "ShopDee (ช้อปดี) • หาของถูกจริง ช้อปฉลาด ไม่จกตา",
    description: "เทียบราคา Shopee, Lazada, TikTok ในคลิกเดียว พร้อมดักราคาหลอก กรองบอทจีน สรุปด้วย Mimi AI",
    siteName: "ShopDee (ช้อปดี)",
    type: "website",
    locale: "th_TH",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 675,
        alt: "ShopDee Price Comparison Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopDee (ช้อปดี) • รวมดีลถูกจริง ไม่จกตา",
    description: "เทียบราคา Shopee, Lazada, TikTok Shop เรียลไทม์",
    images: ["/og-cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={kanit.variable}>
      <body className="font-sans antialiased bg-neutral-50 text-neutral-900 min-h-screen flex flex-col selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
