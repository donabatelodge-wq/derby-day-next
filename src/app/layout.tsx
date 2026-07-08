import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Derby Day",
  description: "Horse racing picks and Last Man Standing competitions",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Derby Day",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col overscroll-none">
        <AppHeader />
        <main className="flex-1" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}>
          {children}
        </main>
        <BottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: "12px", fontFamily: "inherit" },
          }}
        />
      </body>
    </html>
  );
}
