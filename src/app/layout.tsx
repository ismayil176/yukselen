import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { FloatingWhatsapp } from "@/components/FloatingWhatsapp";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const siteName = "Yüksələn.az";
const defaultTitle = "Yüksələn.az | Yüksəliş müsabiqəsinə hazırlıq";
const defaultDescription = "Yüksəliş müsabiqəsinə hazırlıq üçün onlayn sınaq imtahanları, mərhələ məlumatları və namizədlər üçün yönləndirici resurslar.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: { default: defaultTitle, template: `%s | ${siteName}` },
  description: defaultDescription,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  keywords: ["Yüksəliş", "Yüksəliş müsabiqəsi", "sınaq imtahanı", "ümumi biliklər", "analitik təhlil", "onlayn imtahan", "Yüksələn.az", "Yukselen.az"],
  openGraph: {
    type: "website",
    locale: "az_AZ",
    url: siteUrl,
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [{ url: "/logo.jpg", width: 1200, height: 1200, alt: "Yüksələn.az" }],
  },
  twitter: { card: "summary_large_image", title: defaultTitle, description: defaultDescription, images: ["/logo.jpg"] },
  icons: { icon: "/logo.jpg", shortcut: "/logo.jpg", apple: "/logo.jpg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body className="min-h-screen font-sans">
        <SiteHeader />
        {children}
        <FloatingWhatsapp />
      </body>
    </html>
  );
}
