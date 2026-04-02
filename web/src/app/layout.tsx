import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/shared/Header";
import { AppChrome } from "@/components/shared/AppChrome";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "txray | Bitcoin Analysis Toolkit",
  description:
    "Parse, analyze, and build Bitcoin transactions. Privacy heuristics, wallet fingerprinting, PSBT construction, all in one toolkit.",
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AppChrome>
          <Header />
          <main className="pt-16 min-h-screen">{children}</main>
        </AppChrome>
      </body>
    </html>
  );
}
