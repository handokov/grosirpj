import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GrosirPJ - Marketplace Grosir Terpercaya",
  description: "Belanja grosir mudah & murah. Temukan ribuan produk grosir berkualitas dengan harga terbaik. Gratis ongkir, pembayaran aman, dan pengiriman cepat!",
  keywords: ["grosir", "marketplace", "wholesale", "belanja grosir", "GrosirPJ", "produk murah"],
  authors: [{ name: "GrosirPJ" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
