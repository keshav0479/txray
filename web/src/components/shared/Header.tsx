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
  Sparkles,
  Blocks,
  BookOpen,
  Hammer,
} from "lucide-react";
import { detectSearchType } from "@/lib/mempool";

const EXPLORE_ITEMS = [
  {
    href: "/explore/famous",
    label: "Famous Transactions",
    icon: Sparkles,
    desc: "Historically significant Bitcoin moments",
  },
  {
    href: "/explore/block/170",
    label: "Block Explorer",
    icon: Blocks,
    desc: "Inspect any block by height",
  },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);

  // close explore dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        exploreRef.current &&
        !exploreRef.current.contains(e.target as Node)
      ) {
        setExploreOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setExploreOpen(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const type = detectSearchType(q);
    if (type === "txid") {
      router.push(`/explore/tx/${q}`);
    } else if (type === "block_height") {
      router.push(`/explore/block/${q}`);
    } else if (type === "block_hash") {
      router.push(`/explore/block/${q}`);
    } else {
      // try as txid anyway
      router.push(`/explore/tx/${q}`);
    }

    setSearchQuery("");
    setSearchOpen(false);
  };

  const isExplore = pathname.startsWith("/explore");
  const isBuild = pathname.startsWith("/build");
  const isDocs = pathname.startsWith("/docs");

  const openDocsSearch = () => {
    window.dispatchEvent(new Event("txray:open-doc-search"));
  };

  if (isDocs) {
    return (
      <header className="fixed top-0 inset-x-0 h-16 border-b border-[var(--docs-panel-border)] bg-[var(--docs-bg)]/95 backdrop-blur-xl z-50 flex items-center justify-between px-4 lg:px-8 shadow-[0_1px_0_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity shrink-0"
          >
            <TxrayLogo variant="wordmark" className="h-7" />
          </Link>
          <span className="hidden sm:inline text-xs uppercase tracking-wide text-[var(--docs-muted)] border border-[var(--docs-panel-border)] rounded-full px-2 py-1">
            Docs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openDocsSearch}
            className="hidden md:flex items-center gap-2 rounded-lg border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] px-3 py-1.5 text-sm text-[var(--docs-muted)] hover:text-[var(--docs-text)] transition-all duration-300 hover:translate-y-[-1px]"
            aria-label="Open docs search"
          >
            <Search className="h-4 w-4" />
            <span>Search docs</span>
            <span className="ml-2 rounded border border-[var(--docs-panel-border)] px-1.5 py-0.5 text-[11px] text-[var(--docs-muted)]">
              Ctrl K / ⌘K
            </span>
          </button>

          <button
            onClick={openDocsSearch}
            className="md:hidden p-2 text-[var(--docs-muted)] hover:text-[var(--docs-text)] transition-colors rounded-lg border border-[var(--docs-panel-border)]"
            aria-label="Open docs search"
          >
            <Search className="w-4 h-4" />
          </button>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--docs-panel-border)] px-3 py-1.5 text-sm text-[var(--docs-muted)] hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel)] transition-all duration-300 hover:translate-y-[-1px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center hover:opacity-80 transition-opacity shrink-0"
        >
          <TxrayLogo variant="wordmark" className="h-7" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {/* Explore dropdown */}
          <div ref={exploreRef} className="relative">
            <button
              onClick={() => setExploreOpen(!exploreOpen)}
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
                  transition={{
                    type: "spring",
                    bounce: 0.2,
                    duration: 0.5,
                  }}
                />
              )}
              <span className="relative z-10">Explore</span>
              <ChevronDown
                className={`w-3.5 h-3.5 relative z-10 transition-transform ${exploreOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {exploreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                  {EXPLORE_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
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

          {/* Build */}
          <Link
            href="/build"
            className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
              isBuild
                ? "text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            {isBuild && (
              <motion.div
                layoutId="activeNav"
                className="absolute inset-0 rounded-lg bg-white/10"
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.5,
                }}
              />
            )}
            <span className="relative z-10">Build</span>
          </Link>

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
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.5,
                }}
              />
            )}
            <span className="relative z-10">Docs</span>
          </Link>
        </nav>

        {/* Right side: search + mobile toggle */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Desktop search */}
          <div className="hidden md:block">
            <AnimatePresence>
              {searchOpen ? (
                <motion.form
                  initial={{ width: 36, opacity: 0.5 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 36, opacity: 0.5 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSearch}
                  className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                >
                  <Search className="w-4 h-4 text-zinc-500 ml-3 shrink-0" />
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="txid, block height, or hash..."
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
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/90 backdrop-blur-xl pt-16"
          >
            <div className="flex flex-col p-6 gap-2">
              {/* Mobile search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <Search className="w-4 h-4 text-zinc-500 ml-4 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search txid, block height..."
                    className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
              </form>

              {/* Mobile nav links */}
              <Link
                href="/explore/famous"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <Sparkles className="w-5 h-5 text-zinc-500" />
                <div>
                  <div className="font-medium">Famous Transactions</div>
                  <div className="text-xs text-zinc-500">
                    Explore Bitcoin history
                  </div>
                </div>
              </Link>
              <Link
                href="/explore/block/170"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <Blocks className="w-5 h-5 text-zinc-500" />
                <div>
                  <div className="font-medium">Block Explorer</div>
                  <div className="text-xs text-zinc-500">
                    Inspect any block
                  </div>
                </div>
              </Link>
              <Link
                href="/build"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <Hammer className="w-5 h-5 text-zinc-500" />
                <div>
                  <div className="font-medium">Build</div>
                  <div className="text-xs text-zinc-500">
                    Construct PSBTs
                  </div>
                </div>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors mt-4 border-t border-white/5 pt-6"
              >
                <BookOpen className="w-5 h-5 text-zinc-500" />
                <div>
                  <div className="font-medium">About txray</div>
                  <div className="text-xs text-zinc-500">
                    8 Rust crates, zero backend
                  </div>
                </div>
              </Link>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
