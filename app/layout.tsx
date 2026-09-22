import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";

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
  title: "ShopDee (ช้อปดี) • ตรวจสอบข้อมูลสินค้าจาก Shopee, Lazada และ TikTok Shop",
  description: "ShopDee แสดงข้อมูลสินค้าจาก source พร้อมราคา ร้านค้า รูปภาพ และ direct URL ที่ตรวจสอบรูปแบบแล้วจาก Shopee, Lazada และ TikTok Shop",
  keywords: ["ShopDee", "ช้อปดี", "เช็คราคา", "Shopee", "Lazada", "TikTok Shop", "เทียบราคา", "direct URL"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260913c", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon-192.png?v=20260913c", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=20260913c", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=20260913c", sizes: "180x180", type: "image/png" },
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
      <body className="font-sans antialiased bg-warm-50 text-neutral-900 min-h-screen flex flex-col selection:bg-brand-500 selection:text-white">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
