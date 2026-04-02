"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function DocNav() {
  const pathname = usePathname();

  if (pathname === "/docs") return null;

  const segments = pathname.split("/").filter(Boolean).slice(1);
  const breadcrumbs = segments.map((segment, index) => {
    const href = "/docs/" + segments.slice(0, index + 1).join("/");
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return { href, label };
  });

  return (
    <nav className="docs-breadcrumbs flex items-center gap-1.5 text-sm mb-8 flex-wrap">
      <Link
        href="/docs"
        className="inline-flex items-center gap-1.5 text-[var(--docs-muted)] hover:text-[var(--docs-text)] transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Docs</span>
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-[var(--docs-panel-border)]" />
          {index === breadcrumbs.length - 1 ? (
            <span className="text-[var(--docs-text)] font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[var(--docs-muted)] hover:text-[var(--docs-text)] transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
