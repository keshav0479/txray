"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Scroll-spy hook for scrollytelling layouts.
 *
 * Uses a narrow trigger band (5% of viewport height) so only one element
 * can be "focal" at a time. When a card's top edge enters the band,
 * it becomes the active card. The active card stays until a different
 * card enters the band.
 *
 * `readyKey` — pass any value that changes when the observed elements
 * mount (e.g. a page-state string). The observer re-attaches whenever
 * it changes.
 */
export function useScrollSpy(
  elementIds: string[],
  offset = "-30% 0px -65% 0px",
  readyKey: unknown = null,
) {
  const [activeId, setActiveId] = useState<string>(elementIds[0]);
  const observer = useRef<IntersectionObserver | null>(null);
  const intersecting = useRef<Set<string>>(new Set());

  const attach = useCallback(() => {
    observer.current?.disconnect();
    intersecting.current.clear();

    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersecting.current.add(entry.target.id);
          } else {
            intersecting.current.delete(entry.target.id);
          }
        }

        // Pick the last (lowest on page) element that is intersecting.
        // This gives natural downward-scroll progression.
        // On scroll-up, earlier cards re-enter first.
        for (let i = elementIds.length - 1; i >= 0; i--) {
          if (intersecting.current.has(elementIds[i])) {
            setActiveId(elementIds[i]);
            return;
          }
        }
      },
      { rootMargin: offset, threshold: 0 },
    );

    let found = 0;
    elementIds.forEach((id) => {
      // Some layouts render both mobile + desktop card trees and hide one
      // branch with `display: none`. Observe only the visible instance.
      const matches = Array.from(
        document.querySelectorAll<HTMLElement>(`[id="${id}"]`),
      );
      const target =
        matches.find((el) => el.getClientRects().length > 0) ?? null;

      if (target) {
        observer.current?.observe(target);
        found++;
      }
    });
    return found;
  }, [elementIds, offset]);

  useEffect(() => {
    const found = attach();

    // If elements weren't in DOM yet, retry after paint + short delay
    let raf: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (found === 0) {
      raf = requestAnimationFrame(() => {
        if (attach() === 0) {
          timer = setTimeout(attach, 250);
        }
      });
    }

    const handleResize = () => {
      attach();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      observer.current?.disconnect();
    };
  }, [attach, readyKey]);

  return activeId;
}
