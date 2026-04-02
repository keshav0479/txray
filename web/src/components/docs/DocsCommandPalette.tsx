"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Search, FileText, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { DOCS_NAV_SECTIONS } from "@/components/docs/docs-config";

const INDEX = DOCS_NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title }))
);

export function DocsCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return INDEX.slice(0, 8);
    }
    return INDEX.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleNavigate = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  }, [router]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }

    function onKeydown(event: KeyboardEvent) {
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;
      if (isCmdOrCtrl && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }

    window.addEventListener("txray:open-doc-search", onOpen);
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("txray:open-doc-search", onOpen);
      window.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[selectedIndex]) {
        handleNavigate(results[selectedIndex].href);
      }
    }
  }, [results, selectedIndex, handleNavigate]);

  if (!open) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        setOpen(false);
        setQuery("");
      }}
    >
      <div 
        className="w-full max-w-xl rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] shadow-2xl animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--docs-panel-border)] px-4 py-3">
          <Search className="h-5 w-5 text-[var(--docs-muted)] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search documentation..."
            className="w-full bg-transparent text-[15px] text-[var(--docs-text)] placeholder:text-[var(--docs-muted)] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[var(--docs-panel-border)] bg-[var(--docs-bg)] px-2 py-1 text-[11px] text-[var(--docs-muted)]">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-4 py-10 text-center">
              <p className="text-sm text-[var(--docs-muted)]">No results for "{query}"</p>
              <p className="text-xs text-[var(--docs-muted)] mt-1 opacity-60">Try a different search term</p>
            </li>
          ) : (
            results.map((result, index) => (
              <li key={result.href}>
                <Link
                  href={result.href}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                    index === selectedIndex
                      ? "bg-[var(--docs-accent)]/10"
                      : "hover:bg-[var(--docs-panel-hover)]"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    index === selectedIndex 
                      ? "bg-[var(--docs-accent)]/20 text-[var(--docs-accent)]" 
                      : "bg-[var(--docs-panel-hover)] text-[var(--docs-muted)]"
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      index === selectedIndex ? "text-[var(--docs-accent)]" : "text-[var(--docs-text)]"
                    }`}>
                      {result.label}
                    </p>
                    <p className="text-xs text-[var(--docs-muted)] mt-0.5">{result.section}</p>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-all ${
                    index === selectedIndex 
                      ? "opacity-60 text-[var(--docs-accent)]" 
                      : "opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0"
                  }`} />
                </Link>
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t border-[var(--docs-panel-border)] px-4 py-2.5 flex items-center justify-between text-[11px] text-[var(--docs-muted)]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[var(--docs-panel-border)] bg-[var(--docs-bg)] px-1.5 py-0.5">↑</kbd>
                <kbd className="rounded border border-[var(--docs-panel-border)] bg-[var(--docs-bg)] px-1.5 py-0.5">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[var(--docs-panel-border)] bg-[var(--docs-bg)] px-1.5 py-0.5">↵</kbd>
                <span>open</span>
              </span>
            </div>
            <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
