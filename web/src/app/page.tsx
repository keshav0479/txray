"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Eye,
  Shield,
  Hammer,
  Zap,
  Blocks,
  TrendingUp,
} from "lucide-react";
import { FAMOUS_ENTRIES, type FamousEntry } from "@/lib/famous";
import { detectSearchType, fetchFees, fetchTipHeight } from "@/lib/mempool";
import { Footer } from "@/components/shared/Footer";

// pick a subset of famous entries for the landing chips
const CHIP_ENTRIES = FAMOUS_ENTRIES.filter((e) =>
  ["satoshi-to-finney", "pizza-tx", "segwit-activation", "first-taproot", "wasabi-coinjoin"].includes(e.id),
);

const CAPABILITIES = [
  {
    icon: Eye,
    title: "Structure",
    subtitle: "Lens",
    description:
      "See every input, output, script, and byte. Understand how Bitcoin actually moves value.",
    color: "text-lens-400",
    border: "border-lens-500/20",
    bg: "bg-lens-500/5",
    glow: "group-hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]",
  },
  {
    icon: Shield,
    title: "Privacy",
    subtitle: "Sherlock",
    description:
      "Know your coin's privacy. Fingerprints, heuristics, entropy scoring, and actionable advice.",
    color: "text-sherlock-400",
    border: "border-sherlock-500/20",
    bg: "bg-sherlock-500/5",
    glow: "group-hover:shadow-[0_0_40px_-10px_rgba(212,165,70,0.3)]",
  },
  {
    icon: Hammer,
    title: "Build",
    subtitle: "Smith",
    description:
      "Construct unsigned transactions with smart coin selection, fee estimation, and educational walkthrough.",
    color: "text-smith-400",
    border: "border-smith-500/20",
    bg: "bg-smith-500/5",
    glow: "group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]",
    href: "/build",
  },
];

function FamousChip({ entry }: { entry: FamousEntry }) {
  const href =
    entry.type === "tx"
      ? `/explore/tx/${entry.txid}`
      : `/explore/block/${entry.height}`;

  const categoryColors: Record<string, string> = {
    genesis: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10",
    milestone: "border-lens-500/30 text-lens-400 hover:bg-lens-500/10",
    privacy: "border-purple-500/30 text-purple-400 hover:bg-purple-500/10",
    technical: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10",
    cultural: "border-rose-500/30 text-rose-400 hover:bg-rose-500/10",
  };

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${categoryColors[entry.category] || "border-white/10 text-zinc-400"}`}
    >
      {entry.name}
      <ArrowRight className="w-3 h-3 opacity-50" />
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [tipHeight, setTipHeight] = useState<number | null>(null);
  const [fees, setFees] = useState<{
    fastestFee: number;
    halfHourFee: number;
    economyFee: number;
  } | null>(null);

  // fetch live network stats
  useEffect(() => {
    fetchTipHeight()
      .then(setTipHeight)
      .catch(() => {});
    fetchFees()
      .then(setFees)
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const type = detectSearchType(q);
    if (type === "txid") router.push(`/explore/tx/${q}`);
    else if (type === "block_height") router.push(`/explore/block/${q}`);
    else if (type === "block_hash") router.push(`/explore/block/${q}`);
    else router.push(`/explore/tx/${q}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── HERO ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 relative">
        {/* Subtle grid background */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Radial glow behind hero */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-150 h-100 bg-lens-500/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center z-10 max-w-2xl"
        >
          {/* Logo */}
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl mb-6 select-none"
          >
            ⟐
          </motion.span>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-4 leading-[1.1]">
            See through any
            <br />
            <span className="bg-linear-to-r from-lens-400 via-sherlock-400 to-smith-400 bg-clip-text text-transparent">
              Bitcoin transaction
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-zinc-400 mb-8 leading-relaxed max-w-lg">
            Explore the blockchain with plain-English explanations. Privacy
            analysis, wallet fingerprinting, and transaction construction
            — all in your browser.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-lg mb-6"
          >
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-lens-400 transition-colors" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter a txid, block height, or block hash..."
                className="w-full bg-surface-card border border-surface-border rounded-2xl pl-12 pr-4 py-4 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-lens-500/40 search-input transition-all"
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-lens-500 text-white text-sm font-semibold hover:bg-lens-600 transition-colors"
                >
                  Explore
                </button>
              )}
            </div>
          </form>

          {/* Famous transaction chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            <span className="text-xs text-zinc-600 self-center mr-1">
              Try:
            </span>
            {CHIP_ENTRIES.map((entry) => (
              <FamousChip key={entry.id} entry={entry} />
            ))}
          </div>

          <Link
            href="/explore/famous"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2 flex items-center gap-1"
          >
            Browse all famous transactions
            <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </section>

      {/* ─── LIVE PULSE ─── */}
      {(tipHeight || fees) && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="border-y border-white/5 bg-surface-card/30 backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-center gap-6 sm:gap-10 text-xs font-mono">
            {tipHeight && (
              <div className="flex items-center gap-2">
                <Blocks className="w-3.5 h-3.5 text-lens-400" />
                <span className="text-zinc-500">Block</span>
                <Link
                  href={`/explore/block/${tipHeight}`}
                  className="text-white hover:text-lens-400 transition-colors"
                >
                  #{tipHeight.toLocaleString()}
                </Link>
              </div>
            )}
            {fees && (
              <>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-zinc-500">Fast</span>
                  <span className="text-white">
                    {fees.fastestFee} sat/vB
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-500">Normal</span>
                  <span className="text-zinc-300">
                    {fees.halfHourFee} sat/vB
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-zinc-500">Economy</span>
                  <span className="text-zinc-400">
                    {fees.economyFee} sat/vB
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.section>
      )}

      {/* ─── CAPABILITIES ─── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
              Three perspectives, one transaction
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Every transaction gets X-rayed from structure, privacy, and
              construction angles.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {cap.href ? (
                  <Link
                    href={cap.href}
                    className={`group flex flex-col gap-4 p-6 rounded-2xl border border-surface-border bg-surface-card/50 hover:bg-surface-card transition-all ${cap.glow}`}
                  >
                    <CapCard cap={cap} />
                  </Link>
                ) : (
                  <div
                    className={`group flex flex-col gap-4 p-6 rounded-2xl border border-surface-border bg-surface-card/50 hover:bg-surface-card transition-all ${cap.glow}`}
                  >
                    <CapCard cap={cap} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              How it works
            </h2>
            <p className="text-zinc-400">
              No sign-up. No backend. Everything runs in your browser.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Search",
                desc: "Enter any txid, block height, or block hash. Or pick a famous transaction.",
              },
              {
                step: "2",
                title: "Analyze",
                desc: "Live data from mempool.space. Privacy heuristics, wallet fingerprints, and structure analysis run client-side.",
              },
              {
                step: "3",
                title: "Understand",
                desc: "Scrollytelling cards explain every detail with real-world analogies. Go as deep as you want.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center sm:text-left"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-lens-400 font-mono mb-4 mx-auto sm:mx-0">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <Footer />
    </div>
  );
}

// extracted to keep the map() clean
function CapCard({
  cap,
}: {
  cap: (typeof CAPABILITIES)[number];
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-xl ${cap.bg} border ${cap.border}`}
        >
          <cap.icon className={`w-5 h-5 ${cap.color}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {cap.title}
          </h3>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
            {cap.subtitle}
          </span>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        {cap.description}
      </p>
    </>
  );
}
