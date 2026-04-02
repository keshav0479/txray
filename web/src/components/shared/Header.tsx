"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { TxrayLogo } from "@/components/shared/TxrayLogo";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Menu,
  X,
  History,
  Blocks,
  BookOpen,
  Hammer,
  ScanSearch,
  FingerprintPattern,
} from "lucide-react";
import { detectSearchType } from "@/lib/mempool";

const EXPLORE_ITEMS = [
  {
    href: "/explore/famous",
    label: "Bitcoin History",
    icon: History,
    desc: "Significant blocks and transactions through time",
  },
  {
    href: "/explore/block/170",
    label: "Block Explorer",
    icon: Blocks,
    desc: "Inspect any block by height",
  },
];

const TOOLS_ITEMS = [
  {
    href: "/lens",
    label: "Lens",
    icon: ScanSearch,
    desc: "Decode transaction structure and scripts",
  },
  {
    href: "/sherlock",
    label: "Sherlock",
    desc: "Privacy scoring and fingerprint analysis",
    icon: FingerprintPattern,
  },
  {
    href: "/build",
    label: "Smith",
    icon: Hammer,
    desc: "Construct unsigned PSBTs",
  },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exploreOpen, setExploreOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node))
        setExploreOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node))
        setToolsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // close menus on route change
  useEffect(() => {
    const id = setTimeout(() => {
      setMobileOpen(false);
      setExploreOpen(false);
      setToolsOpen(false);
    }, 0);
    return () => clearTimeout(id);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    const type = detectSearchType(q);
    if (type === "txid") router.push(`/tx/${q}`);
    else if (type === "block_height") router.push(`/explore/block/${q}`);
    else if (type === "block_hash") router.push(`/explore/block/${q}`);
    else router.push(`/tx/${q}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const isExplore = pathname.startsWith("/explore");
  const isTools =
    pathname.startsWith("/lens") ||
    pathname.startsWith("/sherlock") ||
    pathname.startsWith("/build");
  const isDocs = pathname.startsWith("/docs");
  const isHome = pathname === "/";

  const openDocsSearch = () => {
    window.dispatchEvent(new Event("txray:open-doc-search"));
  };

  // ── Docs layout gets its own specialised header ──
  if (isDocs) {
    return (
      <header className="fixed top-0 inset-x-0 h-16 border-b border-(--docs-panel-border) bg-(--docs-bg)/95 backdrop-blur-xl z-50 flex items-center justify-between px-4 lg:px-8 shadow-[0_1px_0_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="flex items-center hover:opacity-80 transition-opacity shrink-0"
          >
            <TxrayLogo variant="wordmark" className="h-7" />
          </Link>
          <span className="hidden sm:inline text-xs uppercase tracking-wide text-(--docs-muted) border border-(--docs-panel-border) rounded-full px-2 py-1">
            Docs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openDocsSearch}
            className="hidden md:flex items-center gap-2 rounded-lg border border-(--docs-panel-border) bg-(--docs-panel) px-3 py-1.5 text-sm text-(--docs-muted) hover:text-(--docs-text) transition-all duration-300 hover:-translate-y-px"
            aria-label="Open docs search"
          >
            <Search className="h-4 w-4" />
            <span>Search docs</span>
            <span className="ml-2 rounded border border-(--docs-panel-border) px-1.5 py-0.5 text-[11px] text-(--docs-muted)">
              Ctrl K / ⌘K
            </span>
          </button>

          <button
            onClick={openDocsSearch}
            className="md:hidden p-2 text-(--docs-muted) hover:text-(--docs-text) transition-colors rounded-lg border border-(--docs-panel-border)"
            aria-label="Open docs search"
          >
            <Search className="w-4 h-4" />
          </button>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-(--docs-panel-border) px-3 py-1.5 text-sm text-(--docs-muted) hover:text-(--docs-text) hover:bg-(--docs-panel) transition-all duration-300 hover:-translate-y-px"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
        </div>
      </header>
    );
  }

  // ── Shared dropdown panel styles ──
  const dropdownClass =
    "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-stone-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50";

  return (
    <>
      <header className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-black/60 backdrop-blur-xl z-50 px-4 lg:px-8">
        <div className="flex items-center justify-between h-full w-full">
          {/* ── Left: Logo ── */}
          <div className="flex-1 flex justify-start">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity shrink-0"
            >
              <TxrayLogo variant="wordmark" className="h-6" />
            </Link>
          </div>

          {/* ── Center: Nav ── */}
          <nav className="hidden md:flex flex-none items-center gap-1">
            {/* Explore dropdown */}
            <div ref={exploreRef} className="relative">
              <button
                onClick={() => {
                  setExploreOpen(!exploreOpen);
                  setToolsOpen(false);
                }}
                className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                  isExplore
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                {isExplore && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">Explore</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 relative z-10 transition-transform duration-200 ${exploreOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {exploreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={dropdownClass}
                  >
                    {EXPLORE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                      >
                        <item.icon className="w-4 h-4 text-amber-500/60 group-hover:text-amber-400 mt-0.5 shrink-0 transition-colors" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {item.label}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {item.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tools dropdown */}
            <div ref={toolsRef} className="relative">
              <button
                onClick={() => {
                  setToolsOpen(!toolsOpen);
                  setExploreOpen(false);
                }}
                className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                  isTools
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                {isTools && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">Tools</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 relative z-10 transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={dropdownClass}
                  >
                    {TOOLS_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                      >
                        <item.icon className="w-4 h-4 text-amber-500/60 group-hover:text-amber-400 mt-0.5 shrink-0 transition-colors" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {item.label}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {item.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Docs */}
            <Link
              href="/docs"
              className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
                isDocs
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              {isDocs && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">Docs</span>
            </Link>
          </nav>

          {/* ── Right: Search + GitHub + Mobile toggle ── */}
          <div className="flex-1 flex items-center justify-end gap-1">
            {/* Desktop search — hidden on home (hero has its own) */}
            {!isHome && (
              <div className="hidden md:block">
                <AnimatePresence mode="wait">
                  {searchOpen ? (
                    <motion.form
                      key="open"
                      initial={{ width: 36, opacity: 0.5 }}
                      animate={{ width: 260, opacity: 1 }}
                      exit={{ width: 36, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSearch}
                      className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                    >
                      <Search className="w-4 h-4 text-zinc-500 ml-3 shrink-0" />
                      <input
                        ref={searchRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="txid, block, hash…"
                        className="w-full bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                        onBlur={() => {
                          if (!searchQuery) setSearchOpen(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="closed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSearchOpen(true)}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      aria-label="Search transactions"
                    >
                      <Search className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* GitHub link */}
            <a
              href="https://github.com/keshav0479/txray"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="View source on GitHub"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-16"
          >
            <div className="flex flex-col p-6 gap-1">
              {/* Mobile search */}
              {!isHome && (
                <form onSubmit={handleSearch} className="mb-4">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <Search className="w-4 h-4 text-zinc-500 ml-4 shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="txid, block height…"
                      className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                </form>
              )}

              {/* Explore group */}
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-4 mb-1 mt-2">
                Explore
              </p>
              {EXPLORE_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-zinc-500" />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-zinc-500">{item.desc}</div>
                  </div>
                </Link>
              ))}

              {/* Tools group */}
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-4 mb-1 mt-4">
                Tools
              </p>
              {TOOLS_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-amber-500/60 group-hover:text-amber-400 transition-colors" />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-zinc-500">{item.desc}</div>
                  </div>
                </Link>
              ))}

              {/* Docs */}
              <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-1">
                <Link
                  href="/docs"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-zinc-500" />
                  <div>
                    <div className="font-medium">Docs</div>
                    <div className="text-xs text-zinc-500">
                      Learn with guided documentation
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
