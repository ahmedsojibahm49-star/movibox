import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toasts } from "@/components/ui/Toasts";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { SWRegister } from "@/components/pwa/SWRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "StreamBox — Movies & Series",
    template: "%s · StreamBox",
  },
  description:
    "A premium movie and series streaming experience. Browse, search and watch movies, series and anime.",
  applicationName: "StreamBox",
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StreamBox",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen pb-[calc(3.6rem+env(safe-area-inset-bottom))] md:pb-0">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <BottomTabBar />
        <Toasts />
        <SearchOverlay />
        <SWRegister />
      </body>
    </html>
  );
}
