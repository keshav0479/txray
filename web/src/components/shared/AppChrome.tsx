"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const SmithBackground = dynamic(
  () => import("@/components/smith/SmithBackground").then(mod => mod.SmithBackground),
  { ssr: false }
);

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
