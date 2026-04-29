import type { Metadata } from "next";
import { Header } from "@/components/shared/Header";
import { AppChrome } from "@/components/shared/AppChrome";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { MempoolProvider } from "@/context/MempoolContext";
import "./globals.css";

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
      <body className="antialiased">
        <MempoolProvider>
          <AppChrome>
            <ScrollToTop />
            <Header />
            <main className="pt-16 min-h-screen">{children}</main>
          </AppChrome>
        </MempoolProvider>
      </body>
    </html>
  );
}
