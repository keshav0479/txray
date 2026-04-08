"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { DOCS_NAV_SECTIONS } from "@/components/docs/docs-config";

export function DocsSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Initialize collapsed from localStorage
  const getInitialCollapsed = () => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("txray-docs-sidebar-collapsed") === "true"
    );
  };
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  // Sync body class and listen for external changes
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add("docs-sidebar-collapsed");
    } else {
      document.body.classList.remove("docs-sidebar-collapsed");
    }

    // Listen for class changes on body
    const observer = new MutationObserver(() => {
      setCollapsed(document.body.classList.contains("docs-sidebar-collapsed"));
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [collapsed]);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);

    if (next) {
      document.body.classList.add("docs-sidebar-collapsed");
      window.localStorage.setItem("txray-docs-sidebar-collapsed", "true");
    } else {
      document.body.classList.remove("docs-sidebar-collapsed");
      window.localStorage.setItem("txray-docs-sidebar-collapsed", "false");
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2.5 rounded-xl bg-[var(--docs-panel)] border border-[var(--docs-panel-border)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] shadow-lg transition-colors"
        aria-label="Toggle navigation"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop expand button - shown when sidebar is collapsed */}
      {collapsed && (
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex fixed left-4 top-20 z-50 items-center justify-center w-10 h-10 rounded-xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:border-[var(--docs-accent)] hover:bg-[var(--docs-panel-hover)] shadow-lg transition-all duration-200"
          title="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      {/* Desktop Sidebar - Fixed position */}
      <aside
        className={`
          docs-sidebar hidden lg:block fixed top-16 left-0 bottom-0 w-72
          bg-[var(--docs-panel)] border-r border-[var(--docs-panel-border)]
          z-40 transition-transform duration-300 ease-out
          ${collapsed ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        {/* Collapse button - floating, doesn't take space */}
        <button
          onClick={toggleCollapse}
          className="absolute top-2 right-2 z-20 flex items-center justify-center w-6 h-6 rounded-md text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-all duration-200 opacity-40 hover:opacity-100"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable nav - full height */}
        <div className="overflow-y-auto overflow-x-hidden h-full py-5 px-5">
          <nav className="space-y-7">
            {DOCS_NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 mb-2 text-[11px] font-semibold text-[var(--docs-muted)] uppercase tracking-wider">
                  {section.title}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`
                            group flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-all duration-200
                            ${
                              isActive
                                ? "bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] font-medium"
                                : "text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)]"
                            }
                          `}
                        >
                          {isActive && (
                            <span className="w-1 h-4 rounded-full bg-[var(--docs-accent)] -ml-1.5 mr-1" />
                          )}
                          <span className="flex-1">{item.label}</span>
                          {item.comingSoon ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] opacity-70">
                              soon
                            </span>
                          ) : (
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-all duration-200 ${
                                isActive
                                  ? "opacity-60"
                                  : "opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0"
                              }`}
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar - Slide-in drawer */}
      <aside
        className={`
          lg:hidden fixed top-16 left-0 bottom-0 w-72
          bg-[var(--docs-panel)] border-r border-[var(--docs-panel-border)]
          overflow-y-auto z-40
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-5 pt-6">
          <nav className="space-y-7">
            {DOCS_NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 mb-2 text-[11px] font-semibold text-[var(--docs-muted)] uppercase tracking-wider">
                  {section.title}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`
                            group flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-all duration-200
                            ${
                              isActive
                                ? "bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] font-medium"
                                : "text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)]"
                            }
                          `}
                          onClick={() => setIsOpen(false)}
                        >
                          {isActive && (
                            <span className="w-1 h-4 rounded-full bg-[var(--docs-accent)] -ml-1.5 mr-1" />
                          )}
                          <span className="flex-1">{item.label}</span>
                          {item.comingSoon ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--docs-accent)]/10 text-[var(--docs-accent)] opacity-70">
                              soon
                            </span>
                          ) : (
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-all duration-200 ${
                                isActive
                                  ? "opacity-60"
                                  : "opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0"
                              }`}
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
