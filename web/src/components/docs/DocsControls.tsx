"use client";

import { useEffect, useCallback } from "react";
import { Focus } from "lucide-react";
import { AudienceSelector } from "@/components/docs/DocsAudience";
import { DocsThemeToggle } from "@/components/docs/DocsThemeToggle";

/**
 * Docs control bar - focused on learning experience.
 * 
 * Features:
 * - Level selector (prominent, unique learning feature)
 * - Theme selector (compact icon)
 * - Zen mode via keyboard (Cmd/Ctrl + .)
 * - Sidebar toggle moved to sidebar itself (cleaner UX)
 */
export function DocsControls() {
  // Keyboard shortcut for zen mode: Cmd/Ctrl + .
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === ".") {
      e.preventDefault();
      toggleZen();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Initialize from localStorage
  useEffect(() => {
    const savedZen = window.localStorage.getItem("txray-docs-zen") === "true";
    const savedCollapsed = window.localStorage.getItem("txray-docs-sidebar-collapsed") === "true";
    
    if (savedZen) {
      document.body.classList.add("docs-zen-mode");
    }
    if (savedCollapsed) {
      document.body.classList.add("docs-sidebar-collapsed");
    }
  }, []);

  return (
    <div className="docs-top-controls mb-8 flex items-center justify-between gap-4">
      {/* Left: Level selector */}
      <AudienceSelector />
      
      {/* Right: Theme + Zen hint */}
      <div className="flex items-center gap-3">
        <DocsThemeToggle compact />
        <button
          onClick={() => toggleZen()}
          className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--docs-panel)]/50 border border-[var(--docs-panel-border)]/50 hover:border-[var(--docs-accent)]/30 hover:bg-[var(--docs-panel)] transition-all cursor-pointer group"
          title="Toggle zen mode for distraction-free reading"
        >
          {/* Zen focus icon */}
          <Focus className="w-3.5 h-3.5 text-[var(--docs-accent)] transition-transform group-hover:scale-110" />
          <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--docs-bg)] text-[var(--docs-muted)] border border-[var(--docs-panel-border)] font-mono">
            {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘" : "^"}.
          </kbd>
          <span className="text-[11px] text-[var(--docs-muted)]">zen</span>
        </button>
      </div>
    </div>
  );
}

function toggleZen() {
  const isZen = document.body.classList.contains("docs-zen-mode");
  
  if (isZen) {
    document.body.classList.remove("docs-zen-mode");
    window.localStorage.setItem("txray-docs-zen", "false");
  } else {
    document.body.classList.add("docs-zen-mode");
    window.localStorage.setItem("txray-docs-zen", "true");
  }
}
