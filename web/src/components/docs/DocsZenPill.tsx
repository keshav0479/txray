"use client";

import { useEffect, useState, useCallback } from "react";
import { Focus } from "lucide-react";

export function DocsZenPill() {
  const [isZen, setIsZen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check zen mode on mount and listen for changes
  useEffect(() => {
    function checkZen() {
      setIsZen(document.body.classList.contains("docs-zen-mode"));
    }

    checkZen();

    // Observe body class changes
    const observer = new MutationObserver(checkZen);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Escape key to exit zen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isZen) {
        exitZen();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZen]);

  // Auto-show on zen mode enter, then auto-hide after delay
  useEffect(() => {
    if (isZen) {
      setIsVisible(true);
      const timeout = setTimeout(() => setIsVisible(false), 3000);
      setHideTimeout(timeout);
      return () => clearTimeout(timeout);
    } else {
      setIsVisible(false);
    }
  }, [isZen]);

  // Show pill on mouse movement near top of screen
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isZen) return;

      if (e.clientY < 80) {
        setIsVisible(true);
        if (hideTimeout) clearTimeout(hideTimeout);
        const timeout = setTimeout(() => setIsVisible(false), 2500);
        setHideTimeout(timeout);
      }
    },
    [isZen, hideTimeout],
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  function exitZen() {
    document.body.classList.remove("docs-zen-mode");
    window.localStorage.setItem("txray-docs-zen", "false");
  }

  if (!isZen) return null;

  return (
    <div
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
      onMouseEnter={() => {
        setIsVisible(true);
        if (hideTimeout) clearTimeout(hideTimeout);
      }}
      onMouseLeave={() => {
        const timeout = setTimeout(() => setIsVisible(false), 1500);
        setHideTimeout(timeout);
      }}
    >
      <button
        onClick={exitZen}
        className="group flex items-center gap-2.5 px-4 py-2 rounded-full 
          bg-[var(--docs-panel)]/95 backdrop-blur-xl
          border border-[var(--docs-panel-border)]
          shadow-xl shadow-black/20
          hover:bg-[var(--docs-panel)] hover:border-[var(--docs-accent)]/40
          transition-all duration-200"
      >
        {/* Zen focus icon */}
        <Focus className="w-4 h-4 text-[var(--docs-accent)] transition-transform group-hover:scale-110" />

        <span className="text-sm text-[var(--docs-muted)] group-hover:text-[var(--docs-text)] transition-colors">
          Exit Zen
        </span>

        {/* Keyboard hint */}
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--docs-bg)]/80 text-[var(--docs-muted)] border border-[var(--docs-panel-border)] font-mono">
          Esc
        </kbd>
      </button>
    </div>
  );
}
