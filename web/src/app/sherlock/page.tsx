"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Search, ArrowRight, Sparkles, Clock,
  Loader2, AlertTriangle, Fingerprint, ScanEye,
} from "lucide-react";
import { FAMOUS_ENTRIES, type FamousEntry } from "@/lib/famous";
import { detectSearchType } from "@/lib/mempool";
import { SherlockBackground } from "@/components/sherlock/SherlockBackground";
import { TiltCard } from "@/components/shared/TiltCard";
import { Footer } from "@/components/shared/Footer";

const CATEGORY_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  genesis:   { label: "Genesis",   color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  milestone: { label: "Milestone", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  privacy:   { label: "Privacy",   color: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  technical: { label: "Technical", color: "text-cyan-400",   bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  cultural:  { label: "Cultural",  color: "text-rose-400",   bg: "bg-rose-500/10",    border: "border-rose-500/20" },
};

// show transactions for Sherlock since it analyzes privacy of individual txs
const SHERLOCK_ENTRIES = FAMOUS_ENTRIES.filter(e => e.type === "tx");

// also show some blocks that have interesting privacy properties
const PRIVACY_BLOCKS = FAMOUS_ENTRIES.filter(e =>
  e.type === "block" && (e.category === "privacy" || e.id === "wasabi-coinjoin")
);

const ALL_SHERLOCK = [...SHERLOCK_ENTRIES, ...PRIVACY_BLOCKS];

export default function SherlockPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"search" | "famous">("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    const type = detectSearchType(query.trim());
    if (type === "txid") {
      router.push(`/explore/tx/${query.trim()}`);
    } else if (type === "block_height") {
      router.push(`/explore/block/${query.trim()}`);
    } else if (type === "block_hash") {
      router.push(`/explore/block/${query.trim()}`);
    } else {
      setErrorMsg("Enter a valid transaction ID (64 hex characters) or block height.");
      setLoading(false);
    }
  };

  const handleFamousClick = (entry: FamousEntry) => {
    if (entry.type === "tx") {
      router.push(`/explore/tx/${entry.txid}`);
    } else {
      router.push(`/explore/block/${entry.height}`);
    }
  };

  return (
    <>
      <SherlockBackground />
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto px-6 pt-24 pb-16 w-full relative z-10">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono uppercase tracking-widest mb-4">
              <Shield className="w-3.5 h-3.5" />
              Sherlock
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
              Privacy Analysis
            </h1>
            <p className="text-stone-400 text-lg max-w-lg mx-auto">
              Paste any transaction ID to run privacy heuristics, wallet
              fingerprinting, and entropy scoring. Or explore a famous one.
            </p>
          </motion.div>

          {/* Tab Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-10"
          >
            <div className="inline-flex rounded-2xl bg-stone-950/60 backdrop-blur-xl border border-white/8 p-1">
              {[
                { id: "search" as const, icon: ScanEye, label: "Analyze TX" },
                { id: "famous" as const, icon: Sparkles, label: "Famous Transactions" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {/* Search Tab */}
            {activeTab === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-lg mx-auto"
              >
                <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8">
                  <div className="text-center mb-8">
                    <Fingerprint className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-80" />
                    <h3 className="text-xl font-bold text-white mb-2">Paste a Transaction ID</h3>
                    <p className="text-sm text-stone-400">
                      Enter any txid to run wallet fingerprinting, common-input-ownership
                      heuristics, and entropy scoring.
                    </p>
                  </div>

                  {/* Search input */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Transaction ID or block height..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white font-mono placeholder:text-stone-600 focus:outline-none focus:border-purple-500/40 transition-colors"
                    />
                  </div>

                  {errorMsg && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span className="flex-1">{errorMsg}</span>
                      <button onClick={() => setErrorMsg(null)} className="text-red-400/50 hover:text-red-300">&#x2715;</button>
                    </div>
                  )}

                  <button
                    onClick={handleSearch}
                    disabled={!query.trim() || loading}
                    className="w-full group flex items-center justify-center gap-2 bg-purple-600 text-white font-bold px-6 py-4 rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                    ) : (
                      <>
                        <ScanEye className="w-5 h-5" />
                        Run Privacy Analysis
                      </>
                    )}
                  </button>

                  {/* Quick picks */}
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-widest text-stone-600 font-mono mb-3">Quick picks</p>
                    <div className="flex flex-wrap gap-2">
                      {SHERLOCK_ENTRIES.slice(0, 3).map(entry => (
                        <button
                          key={entry.id}
                          onClick={() => handleFamousClick(entry)}
                          className="text-xs text-stone-500 hover:text-purple-400 transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-purple-500/20 bg-white/3"
                        >
                          {entry.name} →
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Famous Transactions Tab */}
            {activeTab === "famous" && (
              <motion.div
                key="famous"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALL_SHERLOCK.map((entry, i) => {
                    const cat = CATEGORY_STYLE[entry.category] || CATEGORY_STYLE.technical;
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <TiltCard className="h-full" maxTilt={6} glareIntensity={0.08}>
                          <button
                            onClick={() => handleFamousClick(entry)}
                            className="group flex flex-col h-full text-left rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl hover:border-purple-500/30 transition-all p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className={`text-[10px] uppercase tracking-widest font-mono font-semibold px-2 py-0.5 rounded-md ${cat.bg} ${cat.color} ${cat.border} border`}>
                                {cat.label}
                              </span>
                              <span className="text-[11px] text-stone-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {entry.date}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">
                              {entry.name}
                            </h3>
                            <p className="text-sm text-stone-400 mb-4 leading-relaxed flex-1">
                              {entry.tagline}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <span className="text-[10px] font-mono text-stone-600 uppercase">
                                {entry.type === "block"
                                  ? `Block #${entry.height?.toLocaleString()}`
                                  : `TX ${entry.txid?.slice(0, 12)}...`}
                              </span>
                              <span className="text-xs text-stone-500 group-hover:text-purple-400 transition-colors flex items-center gap-1">
                                Analyze
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </button>
                        </TiltCard>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Footer />
      </div>
    </>
  );
}
