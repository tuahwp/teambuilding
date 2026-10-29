import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room & Team Allocation | Semakan Peserta",
  description: "Semakan status agihan bilik penginapan dan kumpulan aktiviti bagi peserta Team Building.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
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
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
