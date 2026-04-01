"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Clock } from "lucide-react";
import { FAMOUS_ENTRIES, type FamousEntry } from "@/lib/famous";
import { Footer } from "@/components/shared/Footer";

const CATEGORY_STYLE: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  genesis: {
    label: "Genesis",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  milestone: {
    label: "Milestone",
    color: "text-lens-400",
    bg: "bg-lens-500/10",
    border: "border-lens-500/20",
  },
  privacy: {
    label: "Privacy",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  technical: {
    label: "Technical",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  cultural: {
    label: "Cultural",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
};

function FamousCard({
  entry,
  index,
}: {
  entry: FamousEntry;
  index: number;
}) {
  const href =
    entry.type === "tx"
      ? `/explore/tx/${entry.txid}`
      : `/explore/block/${entry.height}`;

  const cat = CATEGORY_STYLE[entry.category] || CATEGORY_STYLE.technical;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Link
        href={href}
        className="group flex flex-col h-full rounded-2xl border border-white/5 bg-surface-card/50 hover:bg-surface-card hover:border-white/10 transition-all p-6"
      >
        {/* Top row: category + date */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`text-[10px] uppercase tracking-widest font-mono font-semibold px-2 py-0.5 rounded-md ${cat.bg} ${cat.color} ${cat.border} border`}
          >
            {cat.label}
          </span>
          <span className="text-[11px] text-zinc-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {entry.date}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-lens-300 transition-colors">
          {entry.name}
        </h3>

        {/* Tagline */}
        <p className="text-sm text-zinc-400 mb-4 leading-relaxed flex-1">
          {entry.tagline}
        </p>

        {/* Story */}
        <p className="text-xs text-zinc-500 leading-relaxed mb-4 line-clamp-3">
          {entry.story}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">
            {entry.type === "block"
              ? `Block #${entry.height?.toLocaleString()}`
              : `TX ${entry.txid?.slice(0, 12)}...`}
          </span>
          <span className="text-xs text-zinc-500 group-hover:text-lens-400 transition-colors flex items-center gap-1">
            Explore
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FamousPage() {
  return (
      <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-5xl mx-auto px-6 pt-24 pb-16 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Famous Transactions
            </h1>
          </div>
          <p className="text-zinc-400 max-w-lg">
            Historically significant Bitcoin transactions and blocks. Each
            one taught the world something new about the protocol.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FAMOUS_ENTRIES.map((entry, i) => (
            <FamousCard key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
