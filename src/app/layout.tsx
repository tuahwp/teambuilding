import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room & Team Allocation | Event Logistics",
  description: "Aplikasi agihan bilik, kumpulan, dan saiz baju bagi acara Team Building.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

