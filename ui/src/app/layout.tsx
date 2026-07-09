import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rustlings (Web mode)",
  description: "Small exercises to get you used to reading and writing Rust",
  icons: {
    icon: "/images/rustlings/mascots/disguised-rust.svg",
    shortcut: "/images/rustlings/mascots/disguised-rust.svg",
    apple: "/images/rustlings/mascots/disguised-rust.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} dark`}>
      <body style={{ fontFamily: "var(--font-geist, Geist, Inter, sans-serif)" }}>
        {children}
      </body>
    </html>
  );
}
