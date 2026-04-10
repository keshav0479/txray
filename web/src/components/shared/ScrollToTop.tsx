"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ScrollToTop() {
  const pathname = usePathname();
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current !== pathname) {
      window.scrollTo({ top: 0, behavior: "instant" });
      prev.current = pathname;
    }
  }, [pathname]);

  return null;
}
