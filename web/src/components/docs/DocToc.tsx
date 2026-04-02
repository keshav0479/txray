"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { List } from "lucide-react";
import { DOCS_TOC } from "@/components/docs/docs-config";

function toAnchor(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function DocToc() {
  const pathname = usePathname();
  const headings = useMemo(() => DOCS_TOC[pathname] ?? [], [pathname]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    function onScroll() {
      const ids = headings.map((heading) => toAnchor(heading));
      const threshold = 120;
      let current: string | null = null;

      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) {
          continue;
        }
        const top = element.getBoundingClientRect().top;
        if (top <= threshold) {
          current = id;
        }
      }

      setActive(current);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  if (!headings.length) {
    return null;
  }

  return (
    <div className="sticky top-24 w-56">
      <div className="rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] p-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--docs-panel-border)]">
          <List className="w-4 h-4 text-[var(--docs-muted)]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--docs-muted)]">
            On this page
          </p>
        </div>
        <ul className="space-y-1 relative">
          {/* Progress line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--docs-panel-border)]" />

          {headings.map((heading) => {
            const anchor = toAnchor(heading);
            const isActive = active === anchor;
            return (
              <li key={heading} className="relative">
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-[var(--docs-accent)] transition-all duration-200" />
                )}
                <a
                  href={`#${anchor}`}
                  className={`block pl-4 py-1.5 text-[13px] leading-snug transition-all duration-200 ${
                    isActive
                      ? "text-[var(--docs-accent)] font-medium"
                      : "text-[var(--docs-muted)] hover:text-[var(--docs-text)]"
                  }`}
                >
                  {heading}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
