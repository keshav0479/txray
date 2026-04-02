"use client";

import { usePathname } from "next/navigation";
import { SmithBackground } from "@/components/smith/SmithBackground";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDocs = pathname.startsWith("/docs");

  return (
    <>
      {!isDocs && <SmithBackground />}
      {children}
    </>
  );
}
