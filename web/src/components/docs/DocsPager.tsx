"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DOCS_NAV_SECTIONS } from "@/components/docs/docs-config";

type FlatItem = { label: string; href: string };

const FLAT_DOCS: FlatItem[] = DOCS_NAV_SECTIONS.flatMap((section) => section.items);

export function DocsPager() {
  const pathname = usePathname();
  const currentIndex = FLAT_DOCS.findIndex((item) => item.href === pathname);

  if (currentIndex === -1) {
    return null;
  }

  const prev = FLAT_DOCS[currentIndex - 1];
  const next = FLAT_DOCS[currentIndex + 1];

  return (
    <div className="mt-16 pt-8 border-t border-[var(--docs-panel-border)] grid gap-4 sm:grid-cols-2">
      <div>
        {prev && (
          <Link
            href={prev.href}
            className="docs-card group flex items-center gap-3 rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] px-5 py-4 hover:border-[var(--docs-accent-muted)]"
          >
            <div className="p-2 rounded-lg bg-[var(--docs-panel-hover)] group-hover:bg-[var(--docs-accent)]/10 transition-colors">
              <ChevronLeft className="w-4 h-4 text-[var(--docs-muted)] group-hover:text-[var(--docs-accent)] transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-[var(--docs-muted)] mb-1">Previous</p>
              <p className="text-sm font-medium text-[var(--docs-text)] truncate group-hover:text-[var(--docs-accent)] transition-colors">
                {prev.label}
              </p>
            </div>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            href={next.href}
            className="docs-card group flex items-center justify-end gap-3 rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] px-5 py-4 hover:border-[var(--docs-accent-muted)] text-right"
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-[var(--docs-muted)] mb-1">Next</p>
              <p className="text-sm font-medium text-[var(--docs-text)] truncate group-hover:text-[var(--docs-accent)] transition-colors">
                {next.label}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--docs-panel-hover)] group-hover:bg-[var(--docs-accent)]/10 transition-colors">
              <ChevronRight className="w-4 h-4 text-[var(--docs-muted)] group-hover:text-[var(--docs-accent)] transition-colors" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
