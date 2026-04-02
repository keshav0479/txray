"use client";

import { useEffect, useState, useRef } from "react";

// A lightweight hook to track which StoryCard is currently focal on the screen
export function useScrollSpy(
  elementIds: string[],
  offset = "0px 0px -50% 0px",
) {
  const [activeId, setActiveId] = useState<string>(elementIds[0]);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: offset },
    );

    elementIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.current?.observe(el);
    });

    return () => {
      observer.current?.disconnect();
    };
  }, [elementIds, offset]);

  return activeId;
}
