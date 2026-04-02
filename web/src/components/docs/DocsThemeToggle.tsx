"use client";

import { useEffect, useState, useRef } from "react";
import { Palette, Check } from "lucide-react";

type DocsTheme = "blue" | "slate" | "warm" | "cream" | "graphite";

const THEMES: { key: DocsTheme; label: string; preview: string }[] = [
  { key: "blue", label: "Ocean", preview: "#3b82f6" },
  { key: "slate", label: "Slate", preview: "#64748b" },
  { key: "warm", label: "Amber", preview: "#d97706" },
  { key: "cream", label: "Light", preview: "#f5f3ef" },
  { key: "graphite", label: "Dark", preview: "#27272a" },
];

const THEME_CLASS: Record<DocsTheme, string> = {
  blue: "docs-theme-blue",
  slate: "docs-theme-slate",
  warm: "docs-theme-warm",
  cream: "docs-theme-cream",
  graphite: "docs-theme-graphite",
};

const STORAGE_KEY = "txray-docs-theme";

interface DocsThemeToggleProps {
  compact?: boolean;
}

export function DocsThemeToggle({ compact = false }: DocsThemeToggleProps) {
  const [theme, setTheme] = useState<DocsTheme>("blue");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as DocsTheme | null;
    const initial: DocsTheme = saved && THEME_CLASS[saved] ? saved : "blue";
    const body = document.body;
    body.classList.remove(...Object.values(THEME_CLASS));
    body.classList.add(THEME_CLASS[initial]);
    setTheme(initial);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    // Small delay to avoid immediate close on the same click that opened it
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function selectTheme(next: DocsTheme) {
    const body = document.body;
    body.classList.remove(...Object.values(THEME_CLASS));
    body.classList.add(THEME_CLASS[next]);
    window.localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
    setOpen(false);
  }

  const currentTheme = THEMES.find((t) => t.key === theme);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`docs-control docs-focus-ring group inline-flex items-center gap-2 rounded-lg border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:border-[var(--docs-accent-muted)] hover:bg-[var(--docs-panel-hover)] transition-all duration-200 ${
          compact ? "p-2" : "px-3 py-1.5 text-xs font-medium"
        }`}
        title={`Theme: ${currentTheme?.label}`}
      >
        {compact ? (
          <div className="relative">
            {/* Subtle glow effect on theme dot */}
            <div 
              className="absolute inset-0 rounded-full blur-sm opacity-50 group-hover:opacity-75 transition-opacity" 
              style={{ background: currentTheme?.preview }}
            />
            <span
              className="relative block w-4 h-4 rounded-full border border-white/30 shadow-sm transition-transform group-hover:scale-110"
              style={{ background: currentTheme?.preview }}
            />
          </div>
        ) : (
          <>
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Theme</span>
            <span
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ background: currentTheme?.preview }}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)]/95 backdrop-blur-xl p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => selectTheme(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  theme === t.key
                    ? "bg-[var(--docs-accent)]/10 text-[var(--docs-accent)]"
                    : "text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)]"
                }`}
              >
                <div className="relative">
                  {theme === t.key && (
                    <div 
                      className="absolute inset-0 rounded-full blur-md opacity-40"
                      style={{ background: t.preview }}
                    />
                  )}
                  <span
                    className="relative block w-4 h-4 rounded-full border border-white/10 shrink-0 shadow-sm"
                    style={{ background: t.preview }}
                  />
                </div>
                <span className="flex-1 text-left">{t.label}</span>
                {theme === t.key && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
