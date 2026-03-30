"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/lens", label: "Lens", description: "Parse & analyze" },
  { href: "/sherlock", label: "Sherlock", description: "Privacy analysis" },
  { href: "/smith", label: "Smith", description: "Build PSBTs" },
];

export function Header() {
  const pathname = usePathname();

  const activeSection = NAV_ITEMS.find((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <header className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-between px-6 lg:px-12">
      <Link
        href="/"
        className="font-bold text-lg tracking-tight flex items-center gap-2.5 text-white hover:text-lens-400 transition-colors"
      >
        <span className="text-xl">⟐</span>
        txray
      </Link>

      <nav className="hidden sm:flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                isActive
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg bg-white/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="text-xs text-zinc-500 hidden lg:block">
        {activeSection ? activeSection.description : "Bitcoin analysis toolkit"}
      </div>
    </header>
  );
}
