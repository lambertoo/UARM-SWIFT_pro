import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { EmergencyStop } from "@/components/emergency-stop";
import { ConnectionStatus } from "@/components/connection-status";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "uARM Swift Pro Control",
  description: "Control platform for uARM Swift Pro robot arm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">uARM Control</h1>
              <nav className="flex gap-4">
                <Link href="/" className="text-sm hover:underline">Dashboard</Link>
                <Link href="/calibrate" className="text-sm hover:underline">Calibrate</Link>
                <Link href="/control" className="text-sm hover:underline">Control</Link>
                <Link href="/teach" className="text-sm hover:underline">Teach</Link>
                <Link href="/scripts" className="text-sm hover:underline">Scripts</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <EmergencyStop />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
