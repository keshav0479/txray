import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/shared/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "txray — Bitcoin Analysis Toolkit",
  description:
    "Parse, analyze, and build Bitcoin transactions. Privacy heuristics, wallet fingerprinting, PSBT construction — all in one toolkit.",
  keywords: [
    "bitcoin",
    "transaction",
    "analysis",
    "privacy",
    "heuristics",
    "PSBT",
    "wallet",
    "fingerprint",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
