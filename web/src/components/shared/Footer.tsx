"use client";

import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5 font-medium text-zinc-400">
            <span className="text-sm">⟐</span> txray
          </span>
          <span>8 crates</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">318 tests</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">zero backend</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <a
            href="https://github.com/keshav0479/txray"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
