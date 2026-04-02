"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

export function DocSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPalette() {
    window.dispatchEvent(new Event("txray:open-doc-search"));
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7f8da3]" />
      <input
        ref={inputRef}
        type="search"
        value=""
        onChange={() => {}}
        onFocus={openPalette}
        onClick={openPalette}
        placeholder="Search docs"
        className="w-full rounded-lg border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] pl-9 pr-30 py-2 text-sm text-[var(--docs-text)] placeholder:text-[#7f8da3] focus:outline-none focus:ring-2 focus:ring-[#2f4f8f]"
        readOnly
      />
      <span className="sr-only">Press Ctrl+K or Command+K to focus search</span>
      <div className="pointer-events-none absolute right-2 top-1.5 flex items-center gap-1">
        <kbd className="rounded border border-[var(--docs-panel-border)] px-1.5 py-0.5 text-[11px] text-[var(--docs-muted)]">
          {typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}
        </kbd>
        <kbd className="rounded border border-[var(--docs-panel-border)] px-1.5 py-0.5 text-[11px] text-[var(--docs-muted)]">K</kbd>
      </div>
    </div>
  );
}
